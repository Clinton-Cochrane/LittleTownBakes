-- Replace period inventory with one authoritative current on-hand quantity.
-- This is a prelaunch reset: old week/month quantities are intentionally discarded.

DROP FUNCTION IF EXISTS public.create_order_with_reserve(TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.create_order_with_reserve(TEXT, TEXT, JSONB, JSONB);
DROP TABLE IF EXISTS public.inventory_slots;

CREATE TABLE public.product_inventory (
    product_id TEXT PRIMARY KEY REFERENCES public.products (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION public.set_product_inventory_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER product_inventory_set_updated_at
    BEFORE UPDATE ON public.product_inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.set_product_inventory_updated_at();

CREATE FUNCTION public.create_product_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.product_inventory (product_id, quantity_on_hand)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$;

CREATE TRIGGER products_create_inventory
    AFTER INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.create_product_inventory();

INSERT INTO public.product_inventory (product_id, quantity_on_hand)
SELECT id, 0
FROM public.products
ON CONFLICT (product_id) DO NOTHING;

ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_inventory FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_product_inventory_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_product_inventory() FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.product_inventory TO service_role;

CREATE FUNCTION public.create_order_with_reserve(
    p_order_id TEXT,
    p_tracking_token TEXT,
    p_payload JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    item JSONB;
    requested RECORD;
    archived BOOLEAN;
    current_quantity INTEGER;
    changed_rows INTEGER;
    numeric_quantity NUMERIC;
BEGIN
    IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item';
    END IF;

    FOR item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
            OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
            OR btrim(item->>'id') = ''
            OR jsonb_typeof(item->'qty') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'Each order item requires a product id and positive integer quantity';
        END IF;

        numeric_quantity := (item->>'qty')::numeric;
        IF numeric_quantity <= 0
            OR numeric_quantity <> trunc(numeric_quantity)
            OR numeric_quantity > 2147483647 THEN
            RAISE EXCEPTION 'Item %: quantity must be a positive integer', item->>'id';
        END IF;
    END LOOP;

    -- Aggregate duplicate lines and process products in stable order to avoid deadlocks.
    FOR requested IN
        SELECT value->>'id' AS product_id, SUM((value->>'qty')::bigint) AS quantity
        FROM jsonb_array_elements(p_items)
        GROUP BY value->>'id'
        ORDER BY value->>'id'
    LOOP
        IF requested.quantity > 2147483647 THEN
            RAISE EXCEPTION 'Item %: quantity is too large', requested.product_id;
        END IF;

        SELECT product.is_archived
        INTO archived
        FROM public.products AS product
        WHERE product.id = requested.product_id
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item %: product does not exist', requested.product_id;
        END IF;
        IF archived THEN
            RAISE EXCEPTION 'Item %: product is archived', requested.product_id;
        END IF;

        SELECT inventory.quantity_on_hand
        INTO current_quantity
        FROM public.product_inventory AS inventory
        WHERE inventory.product_id = requested.product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item %: inventory state is missing', requested.product_id;
        END IF;

        UPDATE public.product_inventory
        SET quantity_on_hand = quantity_on_hand - requested.quantity::integer
        WHERE product_id = requested.product_id
          AND quantity_on_hand >= requested.quantity;
        GET DIAGNOSTICS changed_rows = ROW_COUNT;

        IF changed_rows <> 1 THEN
            RAISE EXCEPTION 'Item %: only % available', requested.product_id, current_quantity;
        END IF;
    END LOOP;

    INSERT INTO public.orders (id, tracking_token, status, payload)
    VALUES (
        p_order_id,
        p_tracking_token,
        'AWAITING_PAYMENT',
        jsonb_set(p_payload, '{status}', '"AWAITING_PAYMENT"'::jsonb, true)
    );

    RETURN jsonb_build_object('id', p_order_id);
END;
$$;

CREATE FUNCTION public.cancel_order_and_restore_inventory(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    order_status TEXT;
    order_payload JSONB;
    item JSONB;
    reserved RECORD;
    changed_rows INTEGER;
    numeric_quantity NUMERIC;
BEGIN
    SELECT orders.status, orders.payload
    INTO order_status, order_payload
    FROM public.orders
    WHERE orders.id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % does not exist', p_order_id;
    END IF;
    IF order_status = 'CANCELED' THEN
        RETURN jsonb_build_object('id', p_order_id, 'canceled', true, 'restored', false);
    END IF;
    IF order_status = 'COMPLETED' THEN
        RAISE EXCEPTION 'Completed orders cannot be canceled';
    END IF;

    IF jsonb_typeof(order_payload->'items') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Order % has invalid reserved items', p_order_id;
    END IF;

    FOR item IN SELECT value FROM jsonb_array_elements(order_payload->'items')
    LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
            OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
            OR btrim(item->>'id') = ''
            OR jsonb_typeof(item->'qty') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'Order % has invalid reserved items', p_order_id;
        END IF;
        numeric_quantity := (item->>'qty')::numeric;
        IF numeric_quantity <= 0
            OR numeric_quantity <> trunc(numeric_quantity)
            OR numeric_quantity > 2147483647 THEN
            RAISE EXCEPTION 'Order % has invalid reserved quantities', p_order_id;
        END IF;
    END LOOP;

    FOR reserved IN
        SELECT value->>'id' AS product_id, SUM((value->>'qty')::bigint) AS quantity
        FROM jsonb_array_elements(order_payload->'items')
        GROUP BY value->>'id'
        ORDER BY value->>'id'
    LOOP
        UPDATE public.product_inventory
        SET quantity_on_hand = quantity_on_hand + reserved.quantity::integer
        WHERE product_id = reserved.product_id;
        GET DIAGNOSTICS changed_rows = ROW_COUNT;
        IF changed_rows <> 1 THEN
            RAISE EXCEPTION 'Item %: inventory state is missing', reserved.product_id;
        END IF;
    END LOOP;

    UPDATE public.orders
    SET status = 'CANCELED',
        payload = jsonb_set(order_payload, '{status}', '"CANCELED"'::jsonb, true)
    WHERE id = p_order_id;

    RETURN jsonb_build_object('id', p_order_id, 'canceled', true, 'restored', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_reserve(TEXT, TEXT, JSONB, JSONB)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_order_and_restore_inventory(TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_reserve(TEXT, TEXT, JSONB, JSONB)
TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_inventory(TEXT)
TO service_role;

COMMENT ON TABLE public.product_inventory IS 'One authoritative current on-hand quantity per product.';
COMMENT ON FUNCTION public.create_order_with_reserve(TEXT, TEXT, JSONB, JSONB)
IS 'Atomically validates products, reserves current inventory, and creates an order.';
COMMENT ON FUNCTION public.cancel_order_and_restore_inventory(TEXT)
IS 'Atomically cancels a non-completed order and restores its reserved inventory exactly once.';
COMMENT ON TABLE public.products IS 'Authoritative product catalog; current stock is stored in product_inventory.';
