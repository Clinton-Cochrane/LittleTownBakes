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
CREATE ROLE service_role NOLOGIN;
SQL

for migration in supabase/migrations/*.sql; do
    docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" < "$migration" >/dev/null
done
docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d "$database" \
    < supabase/tests/current_product_inventory.sql >/dev/null

reservation_one="SELECT public.create_order_with_reserve('race_1','track_race_1','{\"items\":[{\"id\":\"cookie_chocolatechip\",\"qty\":1}]}'::jsonb,'[{\"id\":\"cookie_chocolatechip\",\"qty\":1}]'::jsonb);"
reservation_two="SELECT public.create_order_with_reserve('race_2','track_race_2','{\"items\":[{\"id\":\"cookie_chocolatechip\",\"qty\":1}]}'::jsonb,'[{\"id\":\"cookie_chocolatechip\",\"qty\":1}]'::jsonb);"

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

echo "Inventory database tests passed (last-unit race: 1 success, 1 rejection, final stock 0)."
