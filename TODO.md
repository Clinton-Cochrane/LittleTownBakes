# Production Readiness TODO

## About Page (Client Content)

- [ ] Fill out `public/about.json` with bakery story, how to order, and contact info
- [ ] See `CONTENT_ABOUT.md` for prompts and field descriptions

## Required (Blockers)

- [ ] Create Supabase project
- [ ] Run migrations in order:
  1. `supabase/migrations/20250313000000_create_inventory_slots.sql`
  2. `supabase/migrations/20250313000001_create_flavor_requests.sql`
  3. `supabase/migrations/20250313100000_atomic_reserve_inventory.sql`
- [ ] Copy `.env.example` to `.env.local` and fill in:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_KEY` (strong secret)
  - `NEXT_PUBLIC_VENMO_HANDLE` (optional)
- [ ] Add `venmo-qr.png` to `public/` for checkout Venmo tile

## Optional (Improvements)

- [ ] Add product images to `public/img/` (e.g. `cakepop_chocolate.png`)
- [ ] Integrate Resend or Postmark in `lib/notify.ts` for order emails
- [ ] Restyle admin UI to match bakery theme
- [ ] Add input validation (e.g. Zod) to order API
- [ ] Add rate limiting to order and flavor-request APIs
