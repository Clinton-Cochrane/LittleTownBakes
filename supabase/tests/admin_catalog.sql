CREATE FUNCTION pg_temp.assert_catalog(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF NOT condition THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

SELECT pg_temp.assert_catalog(
    EXISTS (SELECT 1 FROM public.products WHERE id = 'cakepop_chocolate')
    AND EXISTS (SELECT 1 FROM public.categories WHERE id = 'cakepops'),
    'legacy product and category IDs remain unchanged'
);

INSERT INTO public.categories (id, name, sort_order)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'Admin Test One', 100),
    ('00000000-0000-4000-8000-000000000002', 'Admin Test Two', 110);

INSERT INTO public.products (id, category_id, name, price_cents, max_per_order, sort_order)
VALUES
    ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Duplicate Name', 0, 1, 10),
    ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Duplicate Name', 100, 2, 20);

SELECT pg_temp.assert_catalog(
    (SELECT count(*) = 2 FROM public.products WHERE name = 'Duplicate Name'),
    'duplicate product names are allowed'
);
SELECT pg_temp.assert_catalog(
    (SELECT quantity_on_hand = 0 FROM public.product_inventory WHERE product_id = '00000000-0000-4000-8000-000000000011')
    AND (SELECT is_archived = false FROM public.products WHERE id = '00000000-0000-4000-8000-000000000011'),
    'new product trigger creates zero inventory and product defaults active'
);

UPDATE public.product_inventory
SET quantity_on_hand = 7
WHERE product_id = '00000000-0000-4000-8000-000000000011';
UPDATE public.products
SET category_id = '00000000-0000-4000-8000-000000000002', is_archived = true
WHERE id = '00000000-0000-4000-8000-000000000011';
UPDATE public.products SET is_archived = false WHERE id = '00000000-0000-4000-8000-000000000011';
SELECT public.create_authoritative_order(
    'admin_catalog_history',
    'track_admin_catalog_history',
    '{"name":"Catalog Test","email":"catalog@example.com"}'::jsonb,
    '{"method":"cash"}'::jsonb,
    '[{"productId":"00000000-0000-4000-8000-000000000011","quantity":1}]'::jsonb
);
INSERT INTO public.flavor_requests (item_id, customer_email)
VALUES ('00000000-0000-4000-8000-000000000011', 'catalog@example.com');
UPDATE public.products SET is_archived = true WHERE id = '00000000-0000-4000-8000-000000000011';
UPDATE public.products SET is_archived = false WHERE id = '00000000-0000-4000-8000-000000000011';
UPDATE public.products SET is_archived = false WHERE id = '00000000-0000-4000-8000-000000000011';

SELECT pg_temp.assert_catalog(
    (SELECT category_id = '00000000-0000-4000-8000-000000000002'
        AND is_archived = false
     FROM public.products WHERE id = '00000000-0000-4000-8000-000000000011')
    AND (SELECT quantity_on_hand = 6
        FROM public.product_inventory WHERE product_id = '00000000-0000-4000-8000-000000000011')
    AND (SELECT payload->'items'->0->>'productId' = '00000000-0000-4000-8000-000000000011'
        FROM public.orders WHERE id = 'admin_catalog_history')
    AND EXISTS (
        SELECT 1 FROM public.flavor_requests
        WHERE item_id = '00000000-0000-4000-8000-000000000011'
          AND customer_email = 'catalog@example.com'
    ),
    'move and idempotent archive transitions preserve identity, inventory, orders, and flavor requests'
);

SELECT public.reorder_category_products(
    '00000000-0000-4000-8000-000000000001',
    ARRAY['00000000-0000-4000-8000-000000000012']
);
SELECT pg_temp.assert_catalog(
    (SELECT sort_order = 10 FROM public.products WHERE id = '00000000-0000-4000-8000-000000000012'),
    'product reorder normalizes positions'
);

DO $$
DECLARE
    before_order INTEGER;
BEGIN
    SELECT sort_order INTO before_order FROM public.products WHERE id = '00000000-0000-4000-8000-000000000012';
    BEGIN
        PERFORM public.reorder_category_products(
            '00000000-0000-4000-8000-000000000001',
            ARRAY['00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000012']
        );
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'CATALOG_INVALID_REORDER%' THEN RAISE; END IF;
    END;
    IF (SELECT sort_order FROM public.products WHERE id = '00000000-0000-4000-8000-000000000012') <> before_order THEN
        RAISE EXCEPTION 'failed product reorder changed persisted order';
    END IF;
END;
$$;

DO $$
DECLARE
    reversed_ids TEXT[];
BEGIN
    SELECT array_agg(id ORDER BY id DESC) INTO reversed_ids FROM public.categories;
    PERFORM public.reorder_catalog_categories(reversed_ids);
    IF EXISTS (
        SELECT 1
        FROM unnest(reversed_ids) WITH ORDINALITY AS expected(id, position)
        JOIN public.categories AS category ON category.id = expected.id
        WHERE category.sort_order <> expected.position * 10
    ) THEN
        RAISE EXCEPTION 'category reorder did not persist deterministically';
    END IF;
END;
$$;

DO $$ BEGIN
    BEGIN
        PERFORM public.reorder_category_products(
            '00000000-0000-4000-8000-000000000001',
            ARRAY['00000000-0000-4000-8000-000000000011']
        );
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'CATALOG_INVALID_REORDER%' THEN RAISE; END IF;
    END;
END $$;

SELECT pg_temp.assert_catalog(
    NOT has_function_privilege('anon', 'public.reorder_category_products(text,text[])', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.reorder_category_products(text,text[])', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.reorder_category_products(text,text[])', 'EXECUTE'),
    'reorder functions are server-only'
);
