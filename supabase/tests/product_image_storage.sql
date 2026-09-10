CREATE FUNCTION pg_temp.assert_product_image_storage(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF NOT condition THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

SELECT pg_temp.assert_product_image_storage(
    EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'product-images'
          AND name = 'product-images'
          AND public = true
          AND file_size_limit = 15728640
          AND allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::TEXT[]
    ),
    'product image bucket is public-read and enforces exact MIME and 15 MiB limits'
);
