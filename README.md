# Little Town Bakes

Little Town Bakes – cottage bakery ordering app with menu, cart, checkout, and admin.

## Setup

See [DEV_TODO.md](DEV_TODO.md) for a development checklist (Supabase project, migrations, etc.).

1. Copy `.env.example` to `.env.local` and fill in values.
2. Run Supabase migrations in `supabase/migrations/` via Supabase SQL Editor or CLI.
3. `npm install && npm run dev`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key used by cookie-backed Auth clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `NEXT_PUBLIC_VENMO_HANDLE` | No | Venmo handle for checkout (default: @LittleTownBakes) |

## Database

Run migrations in order:

1. `20250313000000_create_inventory_slots.sql` – inventory per item per period
2. `20250313000001_create_flavor_requests.sql` – legacy customer flavor requests (removed by migration 12)
3. `20250313100000_atomic_reserve_inventory.sql` – orders table + atomic reserve (prevents overselling)
4. `20260909030347_protect_public_order_tracking.sql` – separate public tracking tokens from internal order IDs
5. `20260909040137_create_catalog.sql` – product/category catalog tables and initial seed data
6. `20260909150000_current_product_inventory.sql` – replaces period slots with current on-hand stock and atomic cancellation restoration
7. `20260909200000_server_authoritative_checkout.sql` – server-authoritative catalog validation, pricing, order snapshots, and private order access
8. `20260909201000_private_flavor_requests.sql` – protects the legacy customer flavor-request table before its removal
9. `20260909210000_admin_catalog_reordering.sql` – atomic admin category and product ordering
10. `20260910010000_atomic_admin_inventory_adjustment.sql` – concurrency-safe admin inventory adjustments
11. `20260910041324_add_product_image_storage.sql` – public product-image bucket with restricted uploads
12. `20260910173807_anonymous_product_demand_history.sql` – anonymous demand-event history, lifecycle triggers, atomic signals, admin aggregates, and legacy PII table removal

## Menu

PostgreSQL tables `categories` and `products` are the authoritative catalog. Set `products.is_archived` to move an item between the current menu and Past Flavors. `product_inventory` stores one current `quantity_on_hand` per product; an active product at zero stays visible but cannot be ordered. The migration intentionally resets all prelaunch period inventory to zero.

`product_demand_events` preserves anonymous demand for each sold-out or archived period. Database triggers open and close periods when inventory or archive state changes. Lifetime sales remain derived from non-canceled order snapshots and are not combined with demand.

Product photos uploaded by an admin use the public `product-images` Supabase Storage bucket, while `products.image` stores the resulting public URL. Public read is intentional for menu assets. Upload capabilities, finalization, and conservative replacement cleanup require the existing server-verified admin role; the service-role key never reaches the browser. The bucket accepts only JPEG, PNG, WebP, and GIF files up to 15 MiB. Existing `/img/...` values continue to work and are never treated as managed Storage objects during cleanup.

## About Page

Edit `public/about.json` for the About page (story, how to order, contact). See `CONTENT_ABOUT.md` for prompts and field descriptions.

**Admin:** `/admin` redirects to the protected admin area. Sign in at `/admin/login` with a Supabase Auth email/password account whose verified `app_metadata.role` is `admin`.

## Admin provisioning and recovery

Admin accounts must be managed through the Supabase Dashboard or trusted server-side tooling. Never run administrative Auth methods or use the service-role key in browser code.

1. In Supabase Dashboard, open **Authentication → Users** and create the initial bakery owner with an email and temporary password. The equivalent trusted server-side method is `supabase.auth.admin.createUser`. Do not add public signup to this application.
2. Copy the user ID, then use a trusted server-side script with `SUPABASE_SERVICE_ROLE_KEY` and `supabase.auth.admin.updateUserById(userId, { app_metadata: { role: "admin" } })`. Authorization uses `app_metadata`, never user-editable metadata.
3. Add another admin later with the same Dashboard or server-side create-user process, then assign the same `app_metadata.role` value through the administrative API. Existing admins do not receive account-management UI in this application.
4. Until a password-reset screen exists, a trusted operator can set a temporary password with `supabase.auth.admin.updateUserById(userId, { password: temporaryPassword })`, communicate it securely, and replace it again on request. Alternatively, add a dedicated recovery callback/update-password UX before issuing recovery links.

The administrative client used for provisioning must remain in server-only tooling. The application keeps caller authentication separate from `lib/supabaseAdmin.ts`, which continues to perform privileged database operations only after the caller passes the server authorization check.

## Deployment

- **Vercel:** Connect the repo, set env vars for **Production** (and Preview if needed), deploy.
- **Health:** `GET /api/health` — liveness (app up). `GET /api/health?ready=1` — readiness (Supabase + `orders` table); use after deploys or when debugging connection issues.
- **Personal backlog (optional):** Add `PRODUCTION_SETUP.md` in the repo root if you want a local-only checklist — it is listed in `.gitignore` and is not committed.

## Scripts

- `npm run dev` – development with Turbopack
- `npm run build` – production build
- `npm run start` – production server
- `npm run test` – Vitest unit tests
- `npm run test:db` – isolated PostgreSQL inventory transaction and concurrency tests (requires Docker)
- `npm run lint` – ESLint
