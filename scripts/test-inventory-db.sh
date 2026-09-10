#!/usr/bin/env bash
set -euo pipefail

container="little-town-bakes-inventory-test-$$"
database="little_town_bakes_test"
results_dir="$(mktemp -d /tmp/little-town-bakes-inventory.XXXXXX)"

cleanup() {
    docker stop "$container" >/dev/null 2>&1 || true
    rm -rf "$results_dir"
}
trap cleanup EXIT

docker run --rm -d --name "$container" \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB="$database" \
    postgres:17 >/dev/null

for _ in $(seq 1 30); do
    if docker exec "$container" pg_isready -U postgres -d "$database" >/dev/null 2>&1; then break; fi
    sleep 1
done
docker exec "$container" pg_isready -U postgres -d "$database" >/dev/null

docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    public BOOLEAN NOT NULL DEFAULT false,
    file_size_limit BIGINT,
    allowed_mime_types TEXT[]
);
SQL

for migration in supabase/migrations/*.sql; do
    docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" < "$migration" >/dev/null
done
for test_file in supabase/tests/*.sql; do
    docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" \
        < "$test_file" >/dev/null
done

reservation_one="SELECT public.create_authoritative_order('race_1','track_race_1','{\"name\":\"Race One\",\"email\":\"one@example.com\"}'::jsonb,'{\"method\":\"cash\"}'::jsonb,'[{\"productId\":\"cookie_chocolatechip\",\"quantity\":1}]'::jsonb);"
reservation_two="SELECT public.create_authoritative_order('race_2','track_race_2','{\"name\":\"Race Two\",\"email\":\"two@example.com\"}'::jsonb,'{\"method\":\"cash\"}'::jsonb,'[{\"productId\":\"cookie_chocolatechip\",\"quantity\":1}]'::jsonb);"

docker exec "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" -c "$reservation_one" >"$results_dir/one" 2>&1 &
pid_one=$!
docker exec "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" -c "$reservation_two" >"$results_dir/two" 2>&1 &
pid_two=$!

successes=0
if wait "$pid_one"; then successes=$((successes + 1)); fi
if wait "$pid_two"; then successes=$((successes + 1)); fi

final_quantity="$(docker exec "$container" psql -At -U postgres -d "$database" -c "SELECT quantity_on_hand FROM public.product_inventory WHERE product_id = 'cookie_chocolatechip';")"
race_orders="$(docker exec "$container" psql -At -U postgres -d "$database" -c "SELECT count(*) FROM public.orders WHERE id LIKE 'race_%';")"

if [[ "$successes" -ne 1 || "$final_quantity" -ne 0 || "$race_orders" -ne 1 ]]; then
    cat "$results_dir/one" "$results_dir/two"
    echo "race assertion failed: successes=$successes stock=$final_quantity orders=$race_orders" >&2
    exit 1
fi

# A customer reservation and admin +1 must both apply. Whichever locks first,
# starting stock 5 becomes 5 after one decrement and one increment.
docker exec "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" \
    -c "UPDATE public.product_inventory SET quantity_on_hand = 5 WHERE product_id = 'cakepop_vanilla'; DELETE FROM public.orders WHERE id LIKE 'admin_race_%';" >/dev/null
admin_race_order="SELECT public.create_authoritative_order('admin_race_order','track_admin_race','{\"name\":\"Race Customer\",\"email\":\"race@example.com\"}'::jsonb,'{\"method\":\"cash\"}'::jsonb,'[{\"productId\":\"cakepop_vanilla\",\"quantity\":1}]'::jsonb);"
docker exec "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" -c "$admin_race_order" >"$results_dir/order" 2>&1 &
pid_order=$!
docker exec "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" -c "SELECT public.adjust_product_inventory('cakepop_vanilla', 1);" >"$results_dir/admin" 2>&1 &
pid_admin=$!

wait "$pid_order"
wait "$pid_admin"
admin_race_quantity="$(docker exec "$container" psql -At -U postgres -d "$database" -c "SELECT quantity_on_hand FROM public.product_inventory WHERE product_id = 'cakepop_vanilla';")"
if [[ "$admin_race_quantity" -ne 5 ]]; then
    cat "$results_dir/order" "$results_dir/admin"
    echo "admin/order race assertion failed: stock=$admin_race_quantity" >&2
    exit 1
fi

echo "Inventory database tests passed (order races and admin delta preserved)."
