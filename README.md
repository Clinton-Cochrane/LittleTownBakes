# Little Town Bakes

Cottage bakery ordering app with menu, cart, checkout, and admin.

## Setup

1. Copy `.env.example` to `.env.local` and fill in values.
2. Run Supabase migrations in `supabase/migrations/` via Supabase SQL Editor or CLI.
3. `npm install && npm run dev`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `ADMIN_KEY` | Yes | Shared secret for admin API access |

## Database

Run migrations in order:

1. `20250313000000_create_inventory_slots.sql` – inventory per item per period
2. `20250313000001_create_flavor_requests.sql` – customer flavor requests

## Menu

Edit `public/menu.json` to add/remove items. Set `isArchived: true` to move items to "Request a flavor" only.

## Deployment

- **Vercel**: Connect repo, set env vars, deploy.
- Health check: `GET /api/health`

## Scripts

- `npm run dev` – development with Turbopack
- `npm run build` – production build
- `npm run start` – production server
