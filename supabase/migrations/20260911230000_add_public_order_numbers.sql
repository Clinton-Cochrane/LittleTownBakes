-- Stable human-facing order numbers. Internal text IDs remain the primary key.

ALTER TABLE public.orders
ADD COLUMN public_order_number BIGINT;

CREATE SEQUENCE public.orders_public_order_number_seq
AS BIGINT
START WITH 1001
OWNED BY public.orders.public_order_number;

-- Test/pre-launch backfill: assign deterministic numbers by creation order.
WITH numbered AS (
    SELECT id, 1000 + row_number() OVER (ORDER BY created_at, id) AS public_order_number
    FROM public.orders
)
UPDATE public.orders AS orders
SET public_order_number = numbered.public_order_number
FROM numbered
WHERE orders.id = numbered.id;

SELECT setval(
    'public.orders_public_order_number_seq',
    COALESCE((SELECT max(public_order_number) FROM public.orders), 1000),
    true
);

ALTER TABLE public.orders
ALTER COLUMN public_order_number SET DEFAULT nextval('public.orders_public_order_number_seq'),
ALTER COLUMN public_order_number SET NOT NULL,
ADD CONSTRAINT orders_public_order_number_unique UNIQUE (public_order_number);

GRANT USAGE, SELECT ON SEQUENCE public.orders_public_order_number_seq TO service_role;

-- Keep the immutable order snapshot coherent for all insert paths, including the
-- existing authoritative checkout function and database test fixtures.
CREATE FUNCTION public.set_order_public_number_in_payload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.payload := jsonb_set(
        NEW.payload,
        '{publicOrderNumber}',
        to_jsonb(NEW.public_order_number),
        true
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_public_number_in_payload
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_public_number_in_payload();

UPDATE public.orders
SET payload = jsonb_set(payload, '{publicOrderNumber}', to_jsonb(public_order_number), true);

-- The established checkout function remains available. This narrow wrapper adds
-- the generated number to its response without duplicating checkout logic.
CREATE FUNCTION public.create_numbered_authoritative_order(
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
    result JSONB;
    assigned_number BIGINT;
BEGIN
    result := public.create_authoritative_order(
        p_order_id,
        p_tracking_token,
        p_customer,
        p_payment,
        p_items,
        p_pickup_window_id
    );

    SELECT orders.public_order_number
    INTO assigned_number
    FROM public.orders
    WHERE orders.id = p_order_id;

    RETURN result || jsonb_build_object(
        'order', (result->'order') || jsonb_build_object('publicOrderNumber', assigned_number)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_public_number_in_payload() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_numbered_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB, UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_numbered_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB, UUID)
TO service_role;

COMMENT ON COLUMN public.orders.public_order_number
IS 'Stable, unique numeric identifier shown to customers and bakery admins; not used for internal relationships or routing.';
COMMENT ON FUNCTION public.create_numbered_authoritative_order(TEXT, TEXT, JSONB, JSONB, JSONB, UUID)
IS 'Creates an authoritative order and includes its sequence-generated public order number in the response.';
