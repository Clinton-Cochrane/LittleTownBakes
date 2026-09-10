CREATE TABLE public.pickup_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pickup_windows_end_after_start CHECK (end_at > start_at)
);

CREATE INDEX pickup_windows_start_at_idx ON public.pickup_windows (start_at);

ALTER TABLE public.pickup_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pickup_windows FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pickup_windows TO service_role;

CREATE FUNCTION public.pickup_window_is_selectable(
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_enabled BOOLEAN,
    p_at TIMESTAMPTZ DEFAULT now()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT p_enabled IS TRUE
        AND p_start_at IS NOT NULL
        AND p_end_at IS NOT NULL
        AND p_end_at > p_start_at
        AND p_start_at >= p_at + INTERVAL '15 minutes';
$$;

CREATE FUNCTION public.list_available_pickup_windows(p_at TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (id UUID, start_at TIMESTAMPTZ, end_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT pickup.id, pickup.start_at, pickup.end_at
    FROM public.pickup_windows AS pickup
    WHERE public.pickup_window_is_selectable(pickup.start_at, pickup.end_at, pickup.enabled, p_at)
    ORDER BY pickup.start_at, pickup.end_at, pickup.id;
$$;

CREATE FUNCTION public.replace_pickup_window(
    p_pickup_window_id UUID,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_enabled BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    existing public.pickup_windows%ROWTYPE;
    replacement public.pickup_windows%ROWTYPE;
BEGIN
    IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at <= p_start_at OR p_start_at <= now() THEN
        RAISE EXCEPTION 'INVALID_PICKUP_WINDOW';
    END IF;

    SELECT * INTO existing
    FROM public.pickup_windows
    WHERE id = p_pickup_window_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PICKUP_WINDOW_NOT_FOUND'; END IF;

    UPDATE public.pickup_windows
    SET enabled = false, updated_at = now()
    WHERE id = p_pickup_window_id;

    INSERT INTO public.pickup_windows (start_at, end_at, enabled)
    VALUES (p_start_at, p_end_at, COALESCE(p_enabled, existing.enabled))
    RETURNING * INTO replacement;

    RETURN to_jsonb(replacement);
END;
$$;

DROP FUNCTION public.create_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB);

CREATE FUNCTION public.create_authoritative_order(
    p_order_id TEXT,
    p_tracking_token TEXT,
    p_customer JSONB,
    p_payment JSONB,
    p_items JSONB,
    p_pickup_window_id UUID
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
    pickup_window RECORD;
    current_quantity INTEGER;
    changed_rows INTEGER;
    numeric_quantity NUMERIC;
    subtotal_cents BIGINT := 0;
    order_items JSONB := '[]'::jsonb;
    payment_snapshot JSONB;
    pickup_snapshot JSONB;
    order_snapshot JSONB;
    created_at TIMESTAMPTZ;
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
    IF p_pickup_window_id IS NULL THEN
        RAISE EXCEPTION 'PICKUP_WINDOW_UNAVAILABLE';
    END IF;

    SELECT pickup.id, pickup.start_at, pickup.end_at, pickup.enabled
    INTO pickup_window
    FROM public.pickup_windows AS pickup
    WHERE pickup.id = p_pickup_window_id
    FOR SHARE;

    IF NOT FOUND OR NOT public.pickup_window_is_selectable(
        pickup_window.start_at,
        pickup_window.end_at,
        pickup_window.enabled,
        clock_timestamp()
    ) THEN
        RAISE EXCEPTION 'PICKUP_WINDOW_UNAVAILABLE';
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

    created_at := clock_timestamp();
    IF NOT public.pickup_window_is_selectable(
        pickup_window.start_at,
        pickup_window.end_at,
        pickup_window.enabled,
        created_at
    ) THEN
        RAISE EXCEPTION 'PICKUP_WINDOW_UNAVAILABLE';
    END IF;

    payment_snapshot := jsonb_strip_nulls(jsonb_build_object(
        'method', p_payment->>'method',
        'status', 'PENDING',
        'venmoUser', p_payment->'venmoUser',
        'note', p_payment->'note'
    ));
    pickup_snapshot := jsonb_build_object(
        'windowId', pickup_window.id,
        'startAt', pickup_window.start_at,
        'endAt', pickup_window.end_at
    );
    order_snapshot := jsonb_build_object(
        'id', p_order_id,
        'createdAt', created_at,
        'fulfillmentStatus', 'RECEIVED',
        'payment', payment_snapshot,
        'customer', p_customer,
        'pickup', pickup_snapshot,
        'items', order_items,
        'totals', jsonb_build_object('subtotalCents', subtotal_cents, 'totalCents', subtotal_cents)
    );

    INSERT INTO public.orders (id, tracking_token, status, payload, created_at)
    VALUES (p_order_id, p_tracking_token, 'RECEIVED', order_snapshot, created_at);

    RETURN jsonb_build_object('id', p_order_id, 'order', order_snapshot);
END;
$$;

REVOKE ALL ON FUNCTION public.pickup_window_is_selectable(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_available_pickup_windows(TIMESTAMPTZ)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_pickup_window(UUID, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB, UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pickup_window_is_selectable(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ)
TO service_role;
GRANT EXECUTE ON FUNCTION public.list_available_pickup_windows(TIMESTAMPTZ)
TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_pickup_window(UUID, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN)
TO service_role;
GRANT EXECUTE ON FUNCTION public.create_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB, UUID)
TO service_role;

COMMENT ON TABLE public.pickup_windows
IS 'Concrete Pacific bakery pickup windows. Order payloads retain immutable pickup snapshots.';
COMMENT ON FUNCTION public.pickup_window_is_selectable(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ)
IS 'Single authoritative enabled, validity, and inclusive 15-minute lead-time rule.';
COMMENT ON FUNCTION public.list_available_pickup_windows(TIMESTAMPTZ)
IS 'Returns chronologically sorted customer-selectable pickup windows to the server role.';
COMMENT ON FUNCTION public.replace_pickup_window(UUID, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN)
IS 'Atomically disables an edited window and creates a replacement ID so stale checkout selections fail.';
COMMENT ON FUNCTION public.create_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB, UUID)
IS 'Atomically validates pickup, catalog, and stock; reserves inventory; and stores immutable snapshots.';
