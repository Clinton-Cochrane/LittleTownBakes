CREATE TABLE public.product_demand_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    event_type TEXT NOT NULL CHECK (event_type IN ('sold_out', 'archived')),
    demand_count BIGINT NOT NULL DEFAULT 0 CHECK (demand_count >= 0),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    CHECK (closed_at IS NULL OR closed_at >= opened_at)
);

CREATE INDEX product_demand_events_product_history_idx
    ON public.product_demand_events (product_id, opened_at);

CREATE UNIQUE INDEX product_demand_events_one_open_idx
    ON public.product_demand_events (product_id)
    WHERE closed_at IS NULL;

ALTER TABLE public.product_demand_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_demand_events FROM anon, authenticated;
GRANT ALL ON TABLE public.product_demand_events TO service_role;

CREATE FUNCTION public.sync_demand_event_for_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    archived BOOLEAN;
BEGIN
    SELECT is_archived INTO archived
    FROM public.products
    WHERE id = NEW.product_id
    FOR SHARE;

    IF archived THEN
        RETURN NEW;
    END IF;

    IF NEW.quantity_on_hand = 0
        AND (TG_OP = 'INSERT' OR OLD.quantity_on_hand > 0) THEN
        INSERT INTO public.product_demand_events (product_id, event_type)
        SELECT NEW.product_id, 'sold_out'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.product_demand_events
            WHERE product_id = NEW.product_id AND closed_at IS NULL
        );
    ELSIF TG_OP = 'UPDATE'
        AND OLD.quantity_on_hand = 0
        AND NEW.quantity_on_hand > 0 THEN
        UPDATE public.product_demand_events
        SET closed_at = now()
        WHERE product_id = NEW.product_id
          AND event_type = 'sold_out'
          AND closed_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER product_inventory_sync_demand_event
    AFTER INSERT OR UPDATE OF quantity_on_hand ON public.product_inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_demand_event_for_inventory();

CREATE FUNCTION public.sync_demand_event_for_archive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    current_quantity INTEGER;
BEGIN
    IF NEW.is_archived = OLD.is_archived THEN
        RETURN NEW;
    END IF;

    UPDATE public.product_demand_events
    SET closed_at = now()
    WHERE product_id = NEW.id AND closed_at IS NULL;

    IF NEW.is_archived THEN
        INSERT INTO public.product_demand_events (product_id, event_type)
        VALUES (NEW.id, 'archived');
    ELSE
        SELECT quantity_on_hand INTO current_quantity
        FROM public.product_inventory
        WHERE product_id = NEW.id;

        IF current_quantity = 0 THEN
            INSERT INTO public.product_demand_events (product_id, event_type)
            VALUES (NEW.id, 'sold_out');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER products_sync_demand_event
    AFTER UPDATE OF is_archived ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_demand_event_for_archive();

INSERT INTO public.product_demand_events (product_id, event_type)
SELECT product.id, CASE WHEN product.is_archived THEN 'archived' ELSE 'sold_out' END
FROM public.products AS product
JOIN public.product_inventory AS inventory ON inventory.product_id = product.id
WHERE product.is_archived OR inventory.quantity_on_hand = 0;

-- Retain the useful aggregate from legacy requests while discarding their PII.
INSERT INTO public.product_demand_events (
    product_id,
    event_type,
    demand_count,
    opened_at,
    closed_at
)
SELECT
    request.item_id,
    'archived',
    count(*),
    COALESCE(min(request.created_at), now()),
    GREATEST(now(), COALESCE(min(request.created_at), now()))
FROM public.flavor_requests AS request
JOIN public.products AS product ON product.id = request.item_id
GROUP BY request.item_id;

CREATE FUNCTION public.increment_product_demand(p_product_id TEXT)
RETURNS TABLE (event_type TEXT, demand_count BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    archived BOOLEAN;
    current_quantity INTEGER;
    required_event_type TEXT;
BEGIN
    SELECT product.is_archived, inventory.quantity_on_hand
    INTO archived, current_quantity
    FROM public.products AS product
    JOIN public.product_inventory AS inventory ON inventory.product_id = product.id
    WHERE product.id = p_product_id
    FOR SHARE OF product, inventory;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'DEMAND_PRODUCT_NOT_FOUND';
    END IF;
    IF NOT archived AND current_quantity > 0 THEN
        RAISE EXCEPTION 'DEMAND_PRODUCT_AVAILABLE';
    END IF;

    required_event_type := CASE WHEN archived THEN 'archived' ELSE 'sold_out' END;

    RETURN QUERY
    UPDATE public.product_demand_events AS event
    SET demand_count = event.demand_count + 1
    WHERE event.product_id = p_product_id
      AND event.event_type = required_event_type
      AND event.closed_at IS NULL
    RETURNING event.event_type, event.demand_count;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'DEMAND_EVENT_NOT_FOUND';
    END IF;
END;
$$;

CREATE FUNCTION public.list_admin_products_with_stats()
RETURNS TABLE (
    id TEXT,
    category_id TEXT,
    name TEXT,
    description TEXT,
    price_cents INTEGER,
    image TEXT,
    max_per_order INTEGER,
    is_archived BOOLEAN,
    sort_order INTEGER,
    quantity_on_hand INTEGER,
    sold_count BIGINT,
    demand_count BIGINT,
    current_demand_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT
        product.id,
        product.category_id,
        product.name,
        product.description,
        product.price_cents,
        product.image,
        product.max_per_order,
        product.is_archived,
        product.sort_order,
        inventory.quantity_on_hand,
        COALESCE(sales.sold_count, 0),
        COALESCE(demand.demand_count, 0),
        COALESCE(demand.current_demand_count, 0),
        product.created_at,
        product.updated_at
    FROM public.products AS product
    JOIN public.product_inventory AS inventory ON inventory.product_id = product.id
    LEFT JOIN (
        SELECT
            item->>'productId' AS product_id,
            SUM((item->>'quantity')::BIGINT) AS sold_count
        FROM public.orders AS customer_order
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE
                WHEN jsonb_typeof(customer_order.payload->'items') = 'array'
                THEN customer_order.payload->'items'
                ELSE '[]'::jsonb
            END
        ) AS item
        WHERE customer_order.status <> 'CANCELED'
          AND jsonb_typeof(item->'productId') = 'string'
          AND jsonb_typeof(item->'quantity') = 'number'
        GROUP BY item->>'productId'
    ) AS sales ON sales.product_id = product.id
    LEFT JOIN (
        SELECT
            event.product_id,
            SUM(event.demand_count) AS demand_count,
            COALESCE(SUM(event.demand_count) FILTER (WHERE event.closed_at IS NULL), 0) AS current_demand_count
        FROM public.product_demand_events AS event
        GROUP BY event.product_id
    ) AS demand ON demand.product_id = product.id
    ORDER BY product.category_id, product.sort_order, product.name, product.id;
$$;

REVOKE ALL ON FUNCTION public.sync_demand_event_for_inventory() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_demand_event_for_archive() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_product_demand(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_admin_products_with_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_demand(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_admin_products_with_stats() TO service_role;

DROP TABLE public.flavor_requests;

COMMENT ON TABLE public.product_demand_events
IS 'Preserved anonymous demand totals for each sold-out or archived product period.';
COMMENT ON FUNCTION public.increment_product_demand(TEXT)
IS 'Atomically increments the open demand event after validating current product and inventory state.';
COMMENT ON FUNCTION public.list_admin_products_with_stats()
IS 'Returns catalog, inventory, lifetime non-canceled unit sales, and demand-event totals for Admin Menu.';
