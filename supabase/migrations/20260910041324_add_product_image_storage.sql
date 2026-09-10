-- Product photos are public menu assets. Mutations use server-generated signed
-- upload URLs and the server-only service role; no browser write policy exists.
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'product-images',
    'product-images',
    true,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON COLUMN public.products.image IS
'Public product image URL. Managed uploads use the product-images Storage bucket; legacy /img paths remain valid.';
