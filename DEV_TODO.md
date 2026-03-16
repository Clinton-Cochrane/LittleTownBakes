# Development To-Do

## Supabase Setup

- [ ] Create a Supabase project (no project configured yet)
- [ ] Copy `.env.example` to `.env.local` and add:
  - `NEXT_PUBLIC_SUPABASE_URL` (from Project Settings → API)
  - `SUPABASE_SERVICE_ROLE_KEY` (from Project Settings → API)
  - `ADMIN_KEY` (choose a secure secret)
  - `NEXT_PUBLIC_VENMO_HANDLE` (optional, e.g. @LittleTownBakes)
- [ ] Run migrations in order (Supabase SQL Editor or CLI):
  1. `supabase/migrations/20250313000000_create_inventory_slots.sql`
  2. `supabase/migrations/20250313000001_create_flavor_requests.sql`
  3. `supabase/migrations/20250313100000_atomic_reserve_inventory.sql`

## Misc

- [ ] Add product images to `public/img/` (e.g. `cakepop_chocolate.png`)
- [ ] Add `venmo-qr.png` to `public/` for checkout QR display
