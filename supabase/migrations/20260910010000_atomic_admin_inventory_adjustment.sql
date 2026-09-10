-- Add or subtract from current stock in one database statement so an admin change
-- cannot overwrite a simultaneous customer reservation.
CREATE FUNCTION public.adjust_product_inventory(
    p_product_id TEXT,
    p_delta INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    resulting_quantity INTEGER;
BEGIN
    UPDATE public.product_inventory
    SET quantity_on_hand = (quantity_on_hand::BIGINT + p_delta)::INTEGER
    WHERE product_id = p_product_id
      AND quantity_on_hand::BIGINT + p_delta BETWEEN 0 AND 2147483647
    RETURNING quantity_on_hand INTO resulting_quantity;

    IF FOUND THEN
        RETURN resulting_quantity;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.product_inventory WHERE product_id = p_product_id
    ) THEN
        RAISE EXCEPTION 'INVENTORY_NOT_FOUND';
    END IF;
    RAISE EXCEPTION 'INVENTORY_OUT_OF_RANGE';
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_product_inventory(TEXT, INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_inventory(TEXT, INTEGER)
TO service_role;

COMMENT ON FUNCTION public.adjust_product_inventory(TEXT, INTEGER)
IS 'Atomically changes current inventory by a delta and returns authoritative resulting stock.';
