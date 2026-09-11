CREATE OR REPLACE FUNCTION public.pickup_window_is_selectable(
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_enabled BOOLEAN,
    p_at TIMESTAMPTZ DEFAULT now()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT p_enabled IS TRUE
        AND p_start_at IS NOT NULL
        AND p_end_at IS NOT NULL
        AND p_end_at > p_start_at
        AND (
            p_start_at >= p_at + INTERVAL '15 minutes'
            OR (p_start_at <= p_at AND p_end_at >= p_at + INTERVAL '15 minutes')
        );
$$;

CREATE OR REPLACE FUNCTION public.replace_pickup_window(
    p_pickup_window_id UUID,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_enabled BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    existing public.pickup_windows%ROWTYPE;
    replacement public.pickup_windows%ROWTYPE;
BEGIN
    IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at <= p_start_at OR p_end_at <= now() THEN
        RAISE EXCEPTION 'INVALID_PICKUP_WINDOW';
    END IF;

    SELECT * INTO existing
    FROM public.pickup_windows
    WHERE id = p_pickup_window_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PICKUP_WINDOW_NOT_FOUND'; END IF;

    UPDATE public.pickup_windows
    SET enabled = false, updated_at = now()
    WHERE id = p_pickup_window_id;

    INSERT INTO public.pickup_windows (start_at, end_at, enabled)
    VALUES (p_start_at, p_end_at, COALESCE(p_enabled, existing.enabled))
    RETURNING * INTO replacement;

    RETURN to_jsonb(replacement);
END;
$$;

COMMENT ON FUNCTION public.pickup_window_is_selectable(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ)
IS 'Enabled windows are selectable at least 15 minutes before a future start, or while open when at least 15 minutes remain.';
