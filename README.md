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
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `ADMIN_KEY` | Yes | Shared secret for admin API — sent as header `x-admin-key` (not Bearer) |
| `NEXT_PUBLIC_VENMO_HANDLE` | No | Venmo handle for checkout (default: @LittleTownBakes) |

## Database

Run migrations in order:

1. `20250313000000_create_inventory_slots.sql` – inventory per item per period
2. `20250313000001_create_flavor_requests.sql` – customer flavor requests
3. `20250313100000_atomic_reserve_inventory.sql` – orders table + atomic reserve (prevents overselling)

## Menu

Edit `public/menu.json` to add/remove items. Set `isArchived: true` to move items to the Past Flavors page only. Add product images to `public/img/` (e.g. `cakepop_chocolate.png`).

## About Page

Edit `public/about.json` for the About page (story, how to order, contact). See `CONTENT_ABOUT.md` for prompts and field descriptions.

**Admin:** `/admin` redirects to `/admin/login`. After login, access orders, availability (menu availability per period), and flavor requests.

## Deployment

- **Vercel:** Connect the repo, set env vars for **Production** (and Preview if needed), deploy.
- **Health:** `GET /api/health` — liveness (app up). `GET /api/health?ready=1` — readiness (Supabase + `orders` table); use after deploys or when debugging connection issues.
- **Personal backlog (optional):** Add `PRODUCTION_SETUP.md` in the repo root if you want a local-only checklist — it is listed in `.gitignore` and is not committed.

## Scripts

- `npm run dev` – development with Turbopack
- `npm run build` – production build
- `npm run start` – production server
- `npm run test` – Vitest unit tests
- `npm run lint` – ESLint
