CREATE FUNCTION pg_temp.assert_true(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF NOT condition THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

CREATE FUNCTION pg_temp.place(test_id TEXT, payment JSONB, items JSONB)
RETURNS JSONB LANGUAGE sql AS $$
    SELECT public.create_authoritative_order(
        test_id, 'track_' || test_id,
        '{"name":"Test Customer","email":"test@example.com"}'::jsonb,
        payment, items
    );
$$;

SELECT pg_temp.assert_true(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.orders'::regclass),
    'orders has row-level security enabled'
);
SELECT pg_temp.assert_true(
    NOT has_table_privilege('anon', 'public.orders', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.orders', 'INSERT')
    AND NOT has_table_privilege('anon', 'public.orders', 'UPDATE')
    AND NOT has_table_privilege('anon', 'public.orders', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'public.orders', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.orders', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.orders', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.orders', 'DELETE'),
    'browser roles have no direct orders privileges'
);
SELECT pg_temp.assert_true(
    has_table_privilege('service_role', 'public.orders', 'SELECT')
    AND has_table_privilege('service_role', 'public.orders', 'INSERT')
    AND has_table_privilege('service_role', 'public.orders', 'UPDATE')
    AND has_table_privilege('service_role', 'public.orders', 'DELETE'),
    'service role retains server-side orders access'
);
SELECT pg_temp.assert_true(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.flavor_requests'::regclass),
    'flavor_requests has row-level security enabled'
);
SELECT pg_temp.assert_true(
    NOT has_table_privilege('anon', 'public.flavor_requests', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.flavor_requests', 'INSERT')
    AND NOT has_table_privilege('anon', 'public.flavor_requests', 'UPDATE')
    AND NOT has_table_privilege('anon', 'public.flavor_requests', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'public.flavor_requests', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.flavor_requests', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.flavor_requests', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.flavor_requests', 'DELETE'),
    'browser roles have no direct flavor_requests privileges'
);
SELECT pg_temp.assert_true(
    has_table_privilege('service_role', 'public.flavor_requests', 'SELECT')
    AND has_table_privilege('service_role', 'public.flavor_requests', 'INSERT')
    AND has_table_privilege('service_role', 'public.flavor_requests', 'UPDATE')
    AND has_table_privilege('service_role', 'public.flavor_requests', 'DELETE'),
    'service role retains server-side flavor_requests access'
);

SELECT pg_temp.assert_true(
    (SELECT count(*) = (SELECT count(*) FROM public.products) FROM public.product_inventory),
    'migration seeds every existing product'
);

UPDATE public.product_inventory SET quantity_on_hand = 10 WHERE product_id IN ('cakepop_chocolate', 'cakepop_vanilla');
SELECT pg_temp.place('test_single', '{"method":"cash"}', '[{"productId":"cakepop_chocolate","quantity":2}]');
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 8 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate'),
    'valid order decrements current stock'
);
SELECT pg_temp.assert_true(
    (SELECT payload->>'fulfillmentStatus' = 'RECEIVED'
        AND payload->'payment'->>'status' = 'PENDING'
        AND payload->'items'->0->>'name' = 'Chocolate Cake Pop'
        AND (payload->'items'->0->>'unitPriceCents')::int = 250
        AND (payload->'items'->0->>'lineTotalCents')::int = 500
        AND (payload->'totals'->>'subtotalCents')::int = 500
        AND (payload->'totals'->>'totalCents')::int = 500
     FROM public.orders WHERE id = 'test_single'),
    'snapshot and integer-cent totals are authoritative'
);

SELECT pg_temp.place('test_multi', '{"method":"zelle","note":"Test Customer"}',
    '[{"productId":"cakepop_chocolate","quantity":1},{"productId":"cakepop_vanilla","quantity":2}]');
SELECT pg_temp.assert_true(
    (SELECT (payload->'totals'->>'subtotalCents')::int = 750 FROM public.orders WHERE id = 'test_multi'),
    'multi-item subtotal is the sum of server prices'
);

DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place('test_unknown', '{"method":"cash"}', '[{"productId":"unknown","quantity":1}]');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'INVALID_PRODUCT%' THEN RAISE; END IF; END;
END $$;

UPDATE public.product_inventory SET quantity_on_hand = 5 WHERE product_id = 'cupcake_chocolate';
DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place('test_archived', '{"method":"cash"}', '[{"productId":"cupcake_chocolate","quantity":1}]');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'PRODUCT_UNAVAILABLE%' THEN RAISE; END IF; END;
END $$;

DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place('test_zero', '{"method":"cash"}', '[{"productId":"cakepop_chocolate","quantity":0}]');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'INVALID_QUANTITY%' THEN RAISE; END IF; END;
END $$;

DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place('test_max', '{"method":"cash"}',
            '[{"productId":"cakepop_chocolate","quantity":7},{"productId":"cakepop_chocolate","quantity":6}]');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'MAX_QUANTITY_EXCEEDED%' THEN RAISE; END IF; END;
END $$;

UPDATE public.product_inventory SET quantity_on_hand = 0 WHERE product_id = 'cookie_snickerdoodle';
DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place('test_sold_out', '{"method":"cash"}', '[{"productId":"cookie_snickerdoodle","quantity":1}]');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'OUT_OF_STOCK%' THEN RAISE; END IF; END;
END $$;

UPDATE public.product_inventory SET quantity_on_hand = 2 WHERE product_id = 'cupcake_redvelvet';
DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place('test_insufficient', '{"method":"cash"}', '[{"productId":"cupcake_redvelvet","quantity":3}]');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'OUT_OF_STOCK%' THEN RAISE; END IF; END;
END $$;
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 2 FROM public.product_inventory WHERE product_id = 'cupcake_redvelvet'),
    'insufficient stock rejection does not decrement inventory'
);

INSERT INTO public.products (id, category_id, name, price_cents, max_per_order) VALUES ('test_missing_stock', 'cookies', 'Missing Stock', 125, 5);
DELETE FROM public.product_inventory WHERE product_id = 'test_missing_stock';
DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place('test_missing', '{"method":"cash"}', '[{"productId":"test_missing_stock","quantity":1}]');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'OUT_OF_STOCK%' THEN RAISE; END IF; END;
END $$;

UPDATE public.product_inventory SET quantity_on_hand = 2 WHERE product_id = 'cakepop_chocolate';
UPDATE public.product_inventory SET quantity_on_hand = 0 WHERE product_id = 'cakepop_vanilla';
DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place('test_atomic', '{"method":"cash"}',
            '[{"productId":"cakepop_chocolate","quantity":1},{"productId":"cakepop_vanilla","quantity":1}]');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'OUT_OF_STOCK%' THEN RAISE; END IF; END;
END $$;
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 2 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate')
    AND NOT EXISTS (SELECT 1 FROM public.orders WHERE id = 'test_atomic'),
    'multi-item failure consumes no stock and creates no order'
);

UPDATE public.product_inventory SET quantity_on_hand = 3 WHERE product_id = 'cookie_chocolatechip';
SELECT pg_temp.place('test_snapshot', '{"method":"venmo","venmoUser":"@customer"}',
    '[{"productId":"cookie_chocolatechip","quantity":1}]');
UPDATE public.products SET name = 'Renamed Cookie', price_cents = 999 WHERE id = 'cookie_chocolatechip';
SELECT pg_temp.assert_true(
    (SELECT payload->'items'->0->>'name' = 'Chocolate Chip Cookie'
        AND (payload->'items'->0->>'unitPriceCents')::int = 200
     FROM public.orders WHERE id = 'test_snapshot'),
    'catalog edits do not change historical snapshots'
);

SELECT public.cancel_order_and_restore_inventory('test_snapshot');
SELECT public.cancel_order_and_restore_inventory('test_snapshot');
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 3 FROM public.product_inventory WHERE product_id = 'cookie_chocolatechip'),
    'cancellation restores once and repeated cancellation does not double-restock'
);

UPDATE public.product_inventory SET quantity_on_hand = 1 WHERE product_id = 'cookie_chocolatechip';
DELETE FROM public.orders WHERE id LIKE 'race_%';
