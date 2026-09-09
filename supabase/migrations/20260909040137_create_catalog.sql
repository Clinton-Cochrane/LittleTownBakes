CREATE TABLE public.categories (
    id TEXT PRIMARY KEY CHECK (id = btrim(id) AND length(id) > 0),
    name TEXT NOT NULL UNIQUE CHECK (name = btrim(name) AND length(name) > 0),
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
    id TEXT PRIMARY KEY CHECK (id = btrim(id) AND length(id) > 0),
    category_id TEXT NOT NULL REFERENCES public.categories (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (name = btrim(name) AND length(name) > 0),
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    image TEXT,
    max_per_order INTEGER NOT NULL DEFAULT 1 CHECK (max_per_order > 0),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_category_sort_order_idx
    ON public.products (category_id, sort_order, name, id);

CREATE INDEX products_archive_state_idx
    ON public.products (is_archived);

CREATE FUNCTION public.set_catalog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER categories_set_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.set_catalog_updated_at();

CREATE TRIGGER products_set_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.set_catalog_updated_at();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.categories FROM anon, authenticated;
REVOKE ALL ON TABLE public.products FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_catalog_updated_at() FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.categories TO service_role;
GRANT ALL ON TABLE public.products TO service_role;

INSERT INTO public.categories (id, name, sort_order)
VALUES
    ('cakepops', 'Cake Pops', 10),
    ('cupcakes', 'Cupcakes', 20),
    ('cookies', 'Cookies', 30);

INSERT INTO public.products (
    id,
    category_id,
    name,
    description,
    price_cents,
    image,
    max_per_order,
    is_archived,
    sort_order
)
VALUES
    (
        'cakepop_chocolate',
        'cakepops',
        'Chocolate Cake Pop',
        'Rich chocolate cake dipped in dark chocolate and topped with sprinkles.',
        250,
        '/img/cakepop_chocolate.png',
        12,
        false,
        10
    ),
    (
        'cakepop_vanilla',
        'cakepops',
        'Vanilla Cake Pop',
        'Classic vanilla cake coated in white chocolate.',
        250,
        '/img/cakepop_vanilla.png',
        12,
        false,
        20
    ),
    (
        'cupcake_redvelvet',
        'cupcakes',
        'Red Velvet Cupcake',
        'Moist red velvet cake with cream cheese frosting.',
        375,
        '/img/cupcake_redvelvet.png',
        6,
        false,
        10
    ),
    (
        'cupcake_chocolate',
        'cupcakes',
        'Chocolate Cupcake',
        'Decadent chocolate cupcake with chocolate buttercream.',
        375,
        '/img/cupcake_chocolate.png',
        6,
        true,
        20
    ),
    (
        'cookie_chocolatechip',
        'cookies',
        'Chocolate Chip Cookie',
        'Classic chewy cookie loaded with chocolate chips.',
        200,
        '/img/cookie_chocolatechip.png',
        24,
        false,
        10
    ),
    (
        'cookie_snickerdoodle',
        'cookies',
        'Snickerdoodle Cookie',
        'Soft and chewy cookie rolled in cinnamon sugar.',
        200,
        '/img/cookie_snickerdoodle.png',
        24,
        false,
        20
    );

COMMENT ON TABLE public.categories IS 'Authoritative product category catalog.';
COMMENT ON TABLE public.products IS 'Authoritative product catalog; availability remains in inventory_slots.';
COMMENT ON COLUMN public.products.price_cents IS 'Product price in whole US cents.';
COMMENT ON COLUMN public.products.is_archived IS 'Archived products are excluded from the current menu and shown in Past Flavors.';
COMMENT ON COLUMN public.inventory_slots.item_id IS 'Stable product identifier matching products.id.';
COMMENT ON COLUMN public.flavor_requests.item_id IS 'Stable product identifier matching products.id.';
