-- Atomic inventory reservation: prevents overselling when multiple users order concurrently.
-- Run this in Supabase SQL Editor or via Supabase CLI.
--
-- Ensures orders table exists (id, status, payload, created_at)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

--
-- Usage: SELECT * FROM create_order_with_reserve(
--   'ord_xxx',
--   '{"customer": {...}, "items": [...], "totals": {...}}'::jsonb,
--   '[{"id": "item_id", "qty": 3}, ...]'::jsonb
-- );

CREATE OR REPLACE FUNCTION create_order_with_reserve(
  p_order_id TEXT,
  p_payload JSONB,
  p_items JSONB  -- [{"id": "item_id", "qty": 3}, ...]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  item JSONB;
  week_start DATE;
  month_start DATE;
  remaining INT;
  needed INT;
  slot_id UUID;
BEGIN
  week_start := date_trunc('week', CURRENT_DATE)::date;
  month_start := date_trunc('month', CURRENT_DATE)::date;

  -- 1. Reserve inventory: lock and update each slot atomically
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    needed := (item->>'qty')::int;
    IF needed <= 0 THEN CONTINUE; END IF;

    -- Find slot (prefer week over month), lock row
    SELECT id, quantity_available, quantity_sold INTO rec
    FROM inventory_slots
    WHERE item_id = (item->>'id')
      AND (
        (period_type = 'week' AND period_start = week_start)
        OR (period_type = 'month' AND period_start = month_start)
      )
    ORDER BY CASE period_type WHEN 'week' THEN 0 ELSE 1 END
    LIMIT 1
    FOR UPDATE;

    IF rec.id IS NULL THEN CONTINUE; END IF;

    remaining := rec.quantity_available - rec.quantity_sold;
    IF needed > remaining THEN
      RAISE EXCEPTION 'Item %: only % available', item->>'id', remaining;
    END IF;

    UPDATE inventory_slots
    SET quantity_sold = quantity_sold + needed
    WHERE id = rec.id;
  END LOOP;

  -- 2. Insert order
  INSERT INTO orders (id, status, payload)
  VALUES (p_order_id, 'AWAITING_PAYMENT', p_payload);

  RETURN jsonb_build_object('id', p_order_id);
END;
$$;

COMMENT ON FUNCTION create_order_with_reserve IS 'Atomically reserves inventory and creates order. Prevents overselling under concurrent load.';
