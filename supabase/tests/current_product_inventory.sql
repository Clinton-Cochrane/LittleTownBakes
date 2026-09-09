CREATE FUNCTION pg_temp.assert_true(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF NOT condition THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

SELECT pg_temp.assert_true(
    (SELECT count(*) = (SELECT count(*) FROM public.products)
     FROM public.product_inventory),
    'migration seeds every existing product'
);
SELECT pg_temp.assert_true(
    NOT EXISTS (SELECT 1 FROM public.product_inventory WHERE quantity_on_hand <> 0),
    'existing products start at zero'
);

INSERT INTO public.products (
    id, category_id, name, price_cents, max_per_order, is_archived
) VALUES ('test_new_product', 'cookies', 'New Product', 100, 10, false);
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 0 FROM public.product_inventory WHERE product_id = 'test_new_product'),
    'new products automatically receive zero inventory'
);

UPDATE public.product_inventory SET quantity_on_hand = 5 WHERE product_id = 'cakepop_chocolate';
SELECT public.create_order_with_reserve(
    'test_basic', 'track_basic',
    '{"status":"AWAITING_PAYMENT","items":[{"id":"cakepop_chocolate","qty":2}]}'::jsonb,
    '[{"id":"cakepop_chocolate","qty":2}]'::jsonb
);
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 3 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate'),
    'stock 5 order 2 leaves 3'
);

UPDATE public.product_inventory SET quantity_on_hand = 0 WHERE product_id = 'cakepop_vanilla';
DO $$ BEGIN
    BEGIN
        PERFORM public.create_order_with_reserve(
            'test_zero', 'track_zero',
            '{"items":[{"id":"cakepop_vanilla","qty":1}]}'::jsonb,
            '[{"id":"cakepop_vanilla","qty":1}]'::jsonb
        );
        RAISE EXCEPTION 'zero stock order unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'zero stock order unexpectedly succeeded' THEN RAISE; END IF;
    END;
END $$;

DO $$ BEGIN
    BEGIN
        PERFORM public.create_order_with_reserve(
            'test_invalid_quantity', 'track_invalid_quantity',
            '{"items":[{"id":"cakepop_vanilla","qty":0}]}'::jsonb,
            '[{"id":"cakepop_vanilla","qty":0}]'::jsonb
        );
        RAISE EXCEPTION 'invalid quantity order unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'invalid quantity order unexpectedly succeeded' THEN RAISE; END IF;
    END;
END $$;

DO $$ BEGIN
    BEGIN
        PERFORM public.create_order_with_reserve(
            'test_unknown_product', 'track_unknown_product',
            '{"items":[{"id":"not_a_product","qty":1}]}'::jsonb,
            '[{"id":"not_a_product","qty":1}]'::jsonb
        );
        RAISE EXCEPTION 'unknown product order unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'unknown product order unexpectedly succeeded' THEN RAISE; END IF;
    END;
END $$;

DELETE FROM public.product_inventory WHERE product_id = 'test_new_product';
DO $$ BEGIN
    BEGIN
        PERFORM public.create_order_with_reserve(
            'test_missing', 'track_missing',
            '{"items":[{"id":"test_new_product","qty":1}]}'::jsonb,
            '[{"id":"test_new_product","qty":1}]'::jsonb
        );
        RAISE EXCEPTION 'missing inventory order unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'missing inventory order unexpectedly succeeded' THEN RAISE; END IF;
    END;
END $$;

UPDATE public.product_inventory SET quantity_on_hand = 2 WHERE product_id = 'cupcake_redvelvet';
DO $$ BEGIN
    BEGIN
        PERFORM public.create_order_with_reserve(
            'test_insufficient', 'track_insufficient',
            '{"items":[{"id":"cupcake_redvelvet","qty":3}]}'::jsonb,
            '[{"id":"cupcake_redvelvet","qty":3}]'::jsonb
        );
        RAISE EXCEPTION 'insufficient stock order unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'insufficient stock order unexpectedly succeeded' THEN RAISE; END IF;
    END;
END $$;
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 2 FROM public.product_inventory WHERE product_id = 'cupcake_redvelvet'),
    'insufficient reservation leaves stock unchanged'
);

UPDATE public.product_inventory SET quantity_on_hand = 2 WHERE product_id = 'cakepop_chocolate';
UPDATE public.product_inventory SET quantity_on_hand = 0 WHERE product_id = 'cakepop_vanilla';
DO $$ BEGIN
    BEGIN
        PERFORM public.create_order_with_reserve(
            'test_partial', 'track_partial',
            '{"items":[{"id":"cakepop_chocolate","qty":1},{"id":"cakepop_vanilla","qty":1}]}'::jsonb,
            '[{"id":"cakepop_chocolate","qty":1},{"id":"cakepop_vanilla","qty":1}]'::jsonb
        );
        RAISE EXCEPTION 'partial order unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'partial order unexpectedly succeeded' THEN RAISE; END IF;
    END;
END $$;
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 2 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate'),
    'multi-item failure rolls back prior decrement'
);

UPDATE public.product_inventory SET quantity_on_hand = 4 WHERE product_id = 'cakepop_chocolate';
UPDATE public.product_inventory SET quantity_on_hand = 3 WHERE product_id = 'cakepop_vanilla';
SELECT public.create_order_with_reserve(
    'test_multi', 'track_multi',
    '{"status":"AWAITING_PAYMENT","items":[{"id":"cakepop_chocolate","qty":2},{"id":"cakepop_vanilla","qty":1}]}'::jsonb,
    '[{"id":"cakepop_chocolate","qty":2},{"id":"cakepop_vanilla","qty":1}]'::jsonb
);
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 2 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate')
    AND (SELECT quantity_on_hand = 2 FROM public.product_inventory WHERE product_id = 'cakepop_vanilla'),
    'successful multi-item order decrements every product'
);

UPDATE public.product_inventory SET quantity_on_hand = 5 WHERE product_id = 'cupcake_chocolate';
DO $$ BEGIN
    BEGIN
        PERFORM public.create_order_with_reserve(
            'test_archived', 'track_archived',
            '{"items":[{"id":"cupcake_chocolate","qty":1}]}'::jsonb,
            '[{"id":"cupcake_chocolate","qty":1}]'::jsonb
        );
        RAISE EXCEPTION 'archived product order unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'archived product order unexpectedly succeeded' THEN RAISE; END IF;
    END;
END $$;

SELECT public.cancel_order_and_restore_inventory('test_multi');
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 4 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate')
    AND (SELECT quantity_on_hand = 3 FROM public.product_inventory WHERE product_id = 'cakepop_vanilla')
    AND (SELECT status = 'CANCELED' AND payload->>'status' = 'CANCELED' FROM public.orders WHERE id = 'test_multi'),
    'cancellation restores all items and both status representations'
);
SELECT public.cancel_order_and_restore_inventory('test_multi');
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 4 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate')
    AND (SELECT quantity_on_hand = 3 FROM public.product_inventory WHERE product_id = 'cakepop_vanilla'),
    'repeated cancellation does not restore twice'
);

UPDATE public.orders SET status = 'COMPLETED', payload = jsonb_set(payload, '{status}', '"COMPLETED"')
WHERE id = 'test_basic';
DO $$ BEGIN
    BEGIN
        PERFORM public.cancel_order_and_restore_inventory('test_basic');
        RAISE EXCEPTION 'completed order cancellation unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'completed order cancellation unexpectedly succeeded' THEN RAISE; END IF;
    END;
END $$;
SELECT pg_temp.assert_true(
    (SELECT quantity_on_hand = 4 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate'),
    'completed order rejection does not restock'
);

UPDATE public.product_inventory SET quantity_on_hand = 1 WHERE product_id = 'cookie_chocolatechip';
DELETE FROM public.orders WHERE id LIKE 'race_%';
