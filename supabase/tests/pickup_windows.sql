CREATE FUNCTION pg_temp.assert_pickup(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF NOT condition THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

SELECT pg_temp.assert_pickup(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pickup_windows'::regclass)
    AND NOT has_table_privilege('anon', 'public.pickup_windows', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.pickup_windows', 'SELECT')
    AND has_table_privilege('service_role', 'public.pickup_windows', 'SELECT'),
    'pickup windows are private and server-managed'
);
SELECT pg_temp.assert_pickup(
    NOT has_function_privilege('anon', 'public.list_available_pickup_windows(timestamptz)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.list_available_pickup_windows(timestamptz)', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.list_available_pickup_windows(timestamptz)', 'EXECUTE'),
    'customer-safe availability is exposed only through the server endpoint'
);

SELECT pg_temp.assert_pickup(
    public.pickup_window_is_selectable(
        '2026-09-18T14:00:00-07:00', '2026-09-18T18:00:00-07:00', true, '2026-09-18T13:45:00-07:00'
    ),
    'exactly fifteen minutes before start is selectable'
);
SELECT pg_temp.assert_pickup(
    NOT public.pickup_window_is_selectable(
        '2026-09-18T14:00:00-07:00', '2026-09-18T18:00:00-07:00', true, '2026-09-18T13:45:00.001-07:00'
    ),
    'less than fifteen minutes before start is not selectable'
);
SELECT pg_temp.assert_pickup(
    NOT public.pickup_window_is_selectable(
        '2026-09-18T14:00:00-07:00', '2026-09-18T18:00:00-07:00', false, '2026-09-18T13:00:00-07:00'
    )
    AND NOT public.pickup_window_is_selectable(
        '2026-09-18T12:00:00-07:00', '2026-09-18T13:00:00-07:00', true, '2026-09-18T13:00:00-07:00'
    ),
    'disabled and past windows are not selectable'
);

DO $$ BEGIN
    BEGIN
        INSERT INTO public.pickup_windows (start_at, end_at) VALUES (now() + interval '1 day', now() + interval '1 day');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
END $$;

SELECT pg_temp.assert_pickup(
    ('2026-07-15 18:42'::timestamp AT TIME ZONE 'America/Los_Angeles') = '2026-07-16T01:42:00Z'::timestamptz
    AND ('2026-01-15 18:42'::timestamp AT TIME ZONE 'America/Los_Angeles') = '2026-01-16T02:42:00Z'::timestamptz,
    'Pacific conversion follows PDT and PST independently of session timezone'
);

INSERT INTO public.pickup_windows (id, start_at, end_at, enabled) VALUES
    ('22222222-2222-4222-8222-222222222222', now() + interval '2 days 42 minutes', now() + interval '2 days 85 minutes', true),
    ('33333333-3333-4333-8333-333333333333', now() + interval '2 days', now() + interval '2 days 1 hour', false),
    ('44444444-4444-4444-8444-444444444444', now() - interval '2 hours', now() - interval '1 hour', true),
    ('55555555-5555-4555-8555-555555555555', now() + interval '14 minutes', now() + interval '1 hour', true)
ON CONFLICT (id) DO UPDATE SET start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, enabled = EXCLUDED.enabled;

SELECT pg_temp.assert_pickup(
    EXISTS (SELECT 1 FROM public.list_available_pickup_windows(now()) WHERE id = '22222222-2222-4222-8222-222222222222')
    AND NOT EXISTS (SELECT 1 FROM public.list_available_pickup_windows(now()) WHERE id IN (
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
        '55555555-5555-4555-8555-555555555555'
    )),
    'customer availability includes only enabled future windows with fifteen minutes remaining'
);

UPDATE public.product_inventory SET quantity_on_hand = 5 WHERE product_id = 'cakepop_chocolate';

CREATE FUNCTION pg_temp.place_pickup(test_id TEXT, window_id UUID)
RETURNS JSONB LANGUAGE sql AS $$
    SELECT public.create_authoritative_order(
        test_id,
        'track_' || test_id,
        '{"name":"Pickup Test","email":"pickup@example.com"}'::jsonb,
        '{"method":"cash"}'::jsonb,
        '[{"productId":"cakepop_chocolate","quantity":1}]'::jsonb,
        window_id
    );
$$;

DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place_pickup('pickup_missing', NULL);
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'PICKUP_WINDOW_UNAVAILABLE%' THEN RAISE; END IF; END;
END $$;
DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place_pickup('pickup_unknown', '99999999-9999-4999-8999-999999999999');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'PICKUP_WINDOW_UNAVAILABLE%' THEN RAISE; END IF; END;
END $$;
DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place_pickup('pickup_disabled', '33333333-3333-4333-8333-333333333333');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'PICKUP_WINDOW_UNAVAILABLE%' THEN RAISE; END IF; END;
END $$;
DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place_pickup('pickup_cutoff', '55555555-5555-4555-8555-555555555555');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'PICKUP_WINDOW_UNAVAILABLE%' THEN RAISE; END IF; END;
END $$;

SELECT pg_temp.assert_pickup(
    (SELECT quantity_on_hand = 5 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate')
    AND NOT EXISTS (SELECT 1 FROM public.orders WHERE id IN ('pickup_missing', 'pickup_unknown', 'pickup_disabled', 'pickup_cutoff')),
    'invalid or stale pickup requests create no order and consume no inventory'
);

SELECT pg_temp.place_pickup('pickup_snapshot', '22222222-2222-4222-8222-222222222222');
CREATE TEMP TABLE original_pickup_snapshot AS
SELECT payload->'pickup' AS pickup FROM public.orders WHERE id = 'pickup_snapshot';
SELECT public.replace_pickup_window(
    '22222222-2222-4222-8222-222222222222',
    now() + interval '3 days 42 minutes',
    now() + interval '3 days 85 minutes'
);
SELECT pg_temp.assert_pickup(
    (SELECT orders.payload->'pickup' = original.pickup
     FROM public.orders AS orders CROSS JOIN original_pickup_snapshot AS original
     WHERE orders.id = 'pickup_snapshot')
    AND (SELECT payload->'pickup'->>'windowId' = '22222222-2222-4222-8222-222222222222'
         FROM public.orders WHERE id = 'pickup_snapshot')
    AND (SELECT enabled = false FROM public.pickup_windows WHERE id = '22222222-2222-4222-8222-222222222222'),
    'editing and disabling availability does not change the historical order snapshot'
);

DO $$ BEGIN
    BEGIN
        PERFORM pg_temp.place_pickup('pickup_stale_edit', '22222222-2222-4222-8222-222222222222');
        RAISE EXCEPTION 'unexpected success';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'unexpected success' OR SQLERRM NOT LIKE 'PICKUP_WINDOW_UNAVAILABLE%' THEN RAISE; END IF; END;
END $$;
SELECT pg_temp.assert_pickup(
    (SELECT quantity_on_hand = 4 FROM public.product_inventory WHERE product_id = 'cakepop_chocolate')
    AND NOT EXISTS (SELECT 1 FROM public.orders WHERE id = 'pickup_stale_edit'),
    'a checkout selection loaded before an edit is rejected without consuming inventory'
);
