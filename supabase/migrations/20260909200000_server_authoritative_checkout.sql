-- Build the accepted order snapshot from the catalog and reserve stock in one transaction.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

DROP FUNCTION IF EXISTS public.create_order_with_reserve(TEXT, TEXT, JSONB, JSONB);

CREATE FUNCTION public.create_authoritative_order(
    p_order_id TEXT,
    p_tracking_token TEXT,
    p_customer JSONB,
    p_payment JSONB,
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
    product RECORD;
    current_quantity INTEGER;
    changed_rows INTEGER;
    numeric_quantity NUMERIC;
    subtotal_cents BIGINT := 0;
    order_items JSONB := '[]'::jsonb;
    payment_snapshot JSONB;
    order_snapshot JSONB;
    created_at TIMESTAMPTZ := now();
BEGIN
    IF jsonb_typeof(p_customer) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'INVALID_ORDER';
    END IF;
    IF jsonb_typeof(p_payment) IS DISTINCT FROM 'object'
        OR p_payment->>'method' NOT IN ('cash', 'venmo', 'zelle') THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
    END IF;
    IF p_payment->>'method' = 'venmo' AND btrim(COALESCE(p_payment->>'venmoUser', '')) = '' THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
    END IF;
    IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    FOR item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
            OR jsonb_typeof(item->'productId') IS DISTINCT FROM 'string'
            OR btrim(item->>'productId') = ''
            OR jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'INVALID_QUANTITY';
        END IF;
        numeric_quantity := (item->>'quantity')::numeric;
        IF numeric_quantity <= 0 OR numeric_quantity <> trunc(numeric_quantity) OR numeric_quantity > 2147483647 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY';
        END IF;
    END LOOP;

    -- Aggregate duplicates, then lock in stable order to prevent deadlocks and max-limit bypasses.
    FOR requested IN
        SELECT value->>'productId' AS product_id, SUM((value->>'quantity')::bigint) AS quantity
        FROM jsonb_array_elements(p_items)
        GROUP BY value->>'productId'
        ORDER BY value->>'productId'
    LOOP
        IF requested.quantity > 2147483647 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;

        SELECT id, name, price_cents, max_per_order, is_archived
        INTO product
        FROM public.products
        WHERE id = requested.product_id
        FOR SHARE;

        IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_PRODUCT'; END IF;
        IF product.is_archived THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
        IF requested.quantity > product.max_per_order THEN RAISE EXCEPTION 'MAX_QUANTITY_EXCEEDED'; END IF;

        SELECT quantity_on_hand INTO current_quantity
        FROM public.product_inventory
        WHERE product_id = requested.product_id
        FOR UPDATE;

        IF NOT FOUND OR current_quantity < requested.quantity THEN RAISE EXCEPTION 'OUT_OF_STOCK'; END IF;

        UPDATE public.product_inventory
        SET quantity_on_hand = quantity_on_hand - requested.quantity::integer
        WHERE product_id = requested.product_id AND quantity_on_hand >= requested.quantity;
        GET DIAGNOSTICS changed_rows = ROW_COUNT;
        IF changed_rows <> 1 THEN RAISE EXCEPTION 'OUT_OF_STOCK'; END IF;

        subtotal_cents := subtotal_cents + (product.price_cents::bigint * requested.quantity);
        order_items := order_items || jsonb_build_array(jsonb_build_object(
            'productId', product.id,
            'name', product.name,
            'unitPriceCents', product.price_cents,
            'quantity', requested.quantity,
            'lineTotalCents', product.price_cents::bigint * requested.quantity
        ));
    END LOOP;

    payment_snapshot := jsonb_strip_nulls(jsonb_build_object(
        'method', p_payment->>'method',
        'status', 'PENDING',
        'venmoUser', p_payment->'venmoUser',
        'note', p_payment->'note'
    ));
    order_snapshot := jsonb_build_object(
        'id', p_order_id,
        'createdAt', created_at,
        'fulfillmentStatus', 'RECEIVED',
        'payment', payment_snapshot,
        'customer', p_customer,
        'items', order_items,
        'totals', jsonb_build_object('subtotalCents', subtotal_cents, 'totalCents', subtotal_cents)
    );

    INSERT INTO public.orders (id, tracking_token, status, payload, created_at)
    VALUES (p_order_id, p_tracking_token, 'RECEIVED', order_snapshot, created_at);

    RETURN jsonb_build_object('id', p_order_id, 'order', order_snapshot);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_inventory(p_order_id TEXT)
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
    SELECT orders.status, orders.payload INTO order_status, order_payload
    FROM public.orders WHERE orders.id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
    IF order_status = 'CANCELED' THEN RETURN jsonb_build_object('id', p_order_id, 'canceled', true, 'restored', false); END IF;
    IF order_status = 'COMPLETED' THEN RAISE EXCEPTION 'ORDER_NOT_CANCELABLE'; END IF;
    IF jsonb_typeof(order_payload->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'ORDER_FAILED'; END IF;

    FOR item IN SELECT value FROM jsonb_array_elements(order_payload->'items')
    LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
            OR jsonb_typeof(item->'productId') IS DISTINCT FROM 'string'
            OR jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'ORDER_FAILED';
        END IF;
        numeric_quantity := (item->>'quantity')::numeric;
        IF numeric_quantity <= 0 OR numeric_quantity <> trunc(numeric_quantity) OR numeric_quantity > 2147483647 THEN
            RAISE EXCEPTION 'ORDER_FAILED';
        END IF;
    END LOOP;

    FOR reserved IN
        SELECT value->>'productId' AS product_id, SUM((value->>'quantity')::bigint) AS quantity
        FROM jsonb_array_elements(order_payload->'items')
        GROUP BY value->>'productId' ORDER BY value->>'productId'
    LOOP
        UPDATE public.product_inventory SET quantity_on_hand = quantity_on_hand + reserved.quantity::integer
        WHERE product_id = reserved.product_id;
        GET DIAGNOSTICS changed_rows = ROW_COUNT;
        IF changed_rows <> 1 THEN RAISE EXCEPTION 'ORDER_FAILED'; END IF;
    END LOOP;

    UPDATE public.orders
    SET status = 'CANCELED', payload = jsonb_set(order_payload, '{fulfillmentStatus}', '"CANCELED"'::jsonb, true)
    WHERE id = p_order_id;
    RETURN jsonb_build_object('id', p_order_id, 'canceled', true, 'restored', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB) TO service_role;

COMMENT ON FUNCTION public.create_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB)
IS 'Atomically validates catalog and stock, calculates cents, reserves inventory, and stores an immutable order snapshot.';

COMMENT ON TABLE public.orders
IS 'Private order records. Browser roles have no direct access; server routes use service_role.';
