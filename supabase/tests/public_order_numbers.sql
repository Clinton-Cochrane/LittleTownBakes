CREATE FUNCTION pg_temp.assert_public_number(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF NOT condition THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

INSERT INTO public.pickup_windows (id, start_at, end_at, enabled)
VALUES ('99999999-9999-4999-8999-999999999999', '2099-09-18T18:00:00-07:00', '2099-09-18T19:00:00-07:00', true)
ON CONFLICT (id) DO UPDATE SET start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, enabled = true;
UPDATE public.product_inventory SET quantity_on_hand = 10 WHERE product_id = 'cakepop_vanilla';

SET ROLE service_role;
SELECT public.create_numbered_authoritative_order(
    'public_number_service', 'track_public_number_service',
    '{"name":"Service Role","email":"service@example.com"}'::jsonb,
    '{"method":"cash"}'::jsonb,
    '[{"productId":"cakepop_vanilla","quantity":1}]'::jsonb,
    '99999999-9999-4999-8999-999999999999'
);
RESET ROLE;

SELECT pg_temp.assert_public_number(
    EXISTS (SELECT 1 FROM public.orders WHERE id = 'public_number_service' AND public_order_number > 0),
    'the server role can allocate and persist a public order number'
);

CREATE TEMP TABLE created_public_orders AS
SELECT public.create_numbered_authoritative_order(
    'public_number_one', 'track_public_number_one',
    '{"name":"Number One","email":"one@example.com"}'::jsonb,
    '{"method":"cash"}'::jsonb,
    '[{"productId":"cakepop_vanilla","quantity":1}]'::jsonb,
    '99999999-9999-4999-8999-999999999999'
) AS result
UNION ALL
SELECT public.create_numbered_authoritative_order(
    'public_number_two', 'track_public_number_two',
    '{"name":"Number Two","email":"two@example.com"}'::jsonb,
    '{"method":"cash"}'::jsonb,
    '[{"productId":"cakepop_vanilla","quantity":1}]'::jsonb,
    '99999999-9999-4999-8999-999999999999'
);

SELECT pg_temp.assert_public_number(
    (SELECT count(DISTINCT public_order_number) = 2
     FROM public.orders WHERE id IN ('public_number_one', 'public_number_two')),
    'created orders receive different public order numbers'
);
SELECT pg_temp.assert_public_number(
    (SELECT bool_and(public_order_number = (payload->>'publicOrderNumber')::bigint)
     FROM public.orders WHERE id IN ('public_number_one', 'public_number_two')),
    'the generated number is persisted in the column and snapshot'
);
SELECT pg_temp.assert_public_number(
    (SELECT bool_and((result->'order'->>'publicOrderNumber')::bigint > 0) FROM created_public_orders),
    'the authoritative creation response includes the public order number'
);
SELECT pg_temp.assert_public_number(
    EXISTS (SELECT 1 FROM public.orders WHERE id = 'public_number_one'),
    'the original internal order ID remains intact and queryable'
);
