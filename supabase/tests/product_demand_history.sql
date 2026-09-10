CREATE FUNCTION pg_temp.assert_demand(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF NOT condition THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

INSERT INTO public.pickup_windows (id, start_at, end_at, enabled)
VALUES ('11111111-1111-4111-8111-111111111111', '2099-09-18T18:42:00-07:00', '2099-09-18T19:25:00-07:00', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name, sort_order)
VALUES ('demand-tests', 'Demand Tests', 900);
INSERT INTO public.products (id, category_id, name, price_cents, max_per_order)
VALUES ('demand-cake', 'demand-tests', 'Demand Cake', 500, 10);

SELECT pg_temp.assert_demand(
    (SELECT count(*) = 1 AND bool_and(event_type = 'sold_out' AND closed_at IS NULL)
     FROM public.product_demand_events WHERE product_id = 'demand-cake'),
    'a new active zero-stock product has one open sold-out event'
);

SELECT * FROM public.increment_product_demand('demand-cake');
SELECT pg_temp.assert_demand(
    (SELECT demand_count = 1 FROM public.product_demand_events
     WHERE product_id = 'demand-cake' AND closed_at IS NULL),
    'first sold-out signal increments the open event'
);

DO $$ BEGIN
    BEGIN
        PERFORM public.increment_product_demand('missing-demand-product');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'DEMAND_PRODUCT_NOT_FOUND%' THEN RAISE; END IF;
    END;
END $$;

UPDATE public.product_inventory SET quantity_on_hand = 3 WHERE product_id = 'demand-cake';
SELECT pg_temp.assert_demand(
    (SELECT count(*) = 1 AND bool_and(closed_at IS NOT NULL)
     FROM public.product_demand_events WHERE product_id = 'demand-cake'),
    'refill closes and preserves the sold-out event'
);
DO $$ BEGIN
    BEGIN
        PERFORM public.increment_product_demand('demand-cake');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'DEMAND_PRODUCT_AVAILABLE%' THEN RAISE; END IF;
    END;
END $$;

UPDATE public.product_inventory SET quantity_on_hand = 0 WHERE product_id = 'demand-cake';
SELECT * FROM public.increment_product_demand('demand-cake');
SELECT * FROM public.increment_product_demand('demand-cake');
SELECT pg_temp.assert_demand(
    (SELECT count(*) = 2 AND sum(demand_count) = 3
     FROM public.product_demand_events WHERE product_id = 'demand-cake'),
    'a second sellout creates a distinct event and lifetime demand sums both'
);

UPDATE public.products SET is_archived = true WHERE id = 'demand-cake';
SELECT pg_temp.assert_demand(
    (SELECT count(*) = 3
        AND count(*) FILTER (WHERE event_type = 'sold_out' AND closed_at IS NOT NULL) = 2
        AND count(*) FILTER (WHERE event_type = 'archived' AND closed_at IS NULL) = 1
     FROM public.product_demand_events WHERE product_id = 'demand-cake'),
    'archive closes sold-out demand and opens a separate archive event'
);
SELECT * FROM public.increment_product_demand('demand-cake');
UPDATE public.products SET is_archived = false WHERE id = 'demand-cake';
SELECT pg_temp.assert_demand(
    (SELECT count(*) = 4
        AND sum(demand_count) = 4
        AND count(*) FILTER (WHERE event_type = 'archived' AND demand_count = 1 AND closed_at IS NOT NULL) = 1
        AND count(*) FILTER (WHERE event_type = 'sold_out' AND closed_at IS NULL) = 1
     FROM public.product_demand_events WHERE product_id = 'demand-cake'),
    'unarchive preserves archive history and opens sold-out demand at zero stock'
);

UPDATE public.product_inventory SET quantity_on_hand = 10 WHERE product_id = 'demand-cake';
SELECT public.create_authoritative_order(
    'demand_sale', 'track_demand_sale',
    '{"name":"Demand Buyer","email":"buyer@example.com"}'::jsonb,
    '{"method":"cash"}'::jsonb,
    '[{"productId":"demand-cake","quantity":3}]'::jsonb,
    '11111111-1111-4111-8111-111111111111'
);
SELECT public.create_authoritative_order(
    'demand_canceled', 'track_demand_canceled',
    '{"name":"Canceled Buyer","email":"cancel@example.com"}'::jsonb,
    '{"method":"cash"}'::jsonb,
    '[{"productId":"demand-cake","quantity":2}]'::jsonb,
    '11111111-1111-4111-8111-111111111111'
);
SELECT public.cancel_order_and_restore_inventory('demand_canceled');
UPDATE public.products SET is_archived = true WHERE id = 'demand-cake';

SELECT pg_temp.assert_demand(
    (SELECT sold_count = 3 AND demand_count = 4 AND current_demand_count = 0
     FROM public.list_admin_products_with_stats() WHERE id = 'demand-cake'),
    'admin aggregates count units, exclude canceled orders, preserve archived sales, and separate demand'
);
SELECT pg_temp.assert_demand(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.product_demand_events'::regclass)
    AND NOT has_table_privilege('anon', 'public.product_demand_events', 'SELECT')
    AND NOT has_function_privilege('anon', 'public.increment_product_demand(text)', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.increment_product_demand(text)', 'EXECUTE'),
    'demand history is private and mutation is server-only'
);
