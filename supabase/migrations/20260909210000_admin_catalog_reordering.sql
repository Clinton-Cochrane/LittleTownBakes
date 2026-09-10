CREATE FUNCTION public.reorder_category_products(p_category_id TEXT, p_product_ids TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id) THEN
        RAISE EXCEPTION 'CATALOG_CATEGORY_NOT_FOUND';
    END IF;

    IF p_product_ids IS NULL
        OR (SELECT count(DISTINCT id) FROM unnest(p_product_ids) AS id) <> cardinality(p_product_ids)
        OR EXISTS (
            SELECT 1
            FROM unnest(p_product_ids) AS requested(id)
            LEFT JOIN public.products AS product
                ON product.id = requested.id AND product.category_id = p_category_id
            WHERE product.id IS NULL
        )
        OR (SELECT count(*) FROM public.products WHERE category_id = p_category_id) <> cardinality(p_product_ids)
    THEN
        RAISE EXCEPTION 'CATALOG_INVALID_REORDER';
    END IF;

    UPDATE public.products AS product
    SET sort_order = requested.position * 10
    FROM unnest(p_product_ids) WITH ORDINALITY AS requested(id, position)
    WHERE product.id = requested.id
      AND product.category_id = p_category_id;
END;
$$;

CREATE FUNCTION public.reorder_catalog_categories(p_category_ids TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF p_category_ids IS NULL
        OR (SELECT count(DISTINCT id) FROM unnest(p_category_ids) AS id) <> cardinality(p_category_ids)
        OR EXISTS (
            SELECT 1
            FROM unnest(p_category_ids) AS requested(id)
            LEFT JOIN public.categories AS category ON category.id = requested.id
            WHERE category.id IS NULL
        )
        OR (SELECT count(*) FROM public.categories) <> cardinality(p_category_ids)
    THEN
        RAISE EXCEPTION 'CATALOG_INVALID_REORDER';
    END IF;

    UPDATE public.categories AS category
    SET sort_order = requested.position * 10
    FROM unnest(p_category_ids) WITH ORDINALITY AS requested(id, position)
    WHERE category.id = requested.id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_category_products(TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reorder_catalog_categories(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_category_products(TEXT, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.reorder_catalog_categories(TEXT[]) TO service_role;

COMMENT ON FUNCTION public.reorder_category_products(TEXT, TEXT[])
IS 'Atomically normalizes one category full product order from an ordered ID list.';
COMMENT ON FUNCTION public.reorder_catalog_categories(TEXT[])
IS 'Atomically normalizes the full category order from an ordered ID list.';
