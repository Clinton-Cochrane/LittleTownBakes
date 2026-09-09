ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_unique
ON public.orders (tracking_token)
WHERE tracking_token IS NOT NULL;

DROP FUNCTION IF EXISTS public.create_order_with_reserve(TEXT, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.create_order_with_reserve(
  p_order_id TEXT,
  p_tracking_token TEXT,
  p_payload JSONB,
  p_items JSONB
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
BEGIN
  week_start := date_trunc('week', CURRENT_DATE)::date;
  month_start := date_trunc('month', CURRENT_DATE)::date;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    needed := (item->>'qty')::int;
    IF needed <= 0 THEN CONTINUE; END IF;

    SELECT id, quantity_available, quantity_sold INTO rec
    FROM public.inventory_slots
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

    UPDATE public.inventory_slots
    SET quantity_sold = quantity_sold + needed
    WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.orders (id, tracking_token, status, payload)
  VALUES (p_order_id, p_tracking_token, 'AWAITING_PAYMENT', p_payload);

  RETURN jsonb_build_object('id', p_order_id);
END;
$$;

COMMENT ON FUNCTION public.create_order_with_reserve(TEXT, TEXT, JSONB, JSONB)
IS 'Atomically reserves inventory and creates an order with a public tracking token.';
