# Development To-Do

## Supabase Setup

- [ ] Create a Supabase project (no project configured yet)
- [ ] Copy `.env.example` to `.env.local` and add:
  - `NEXT_PUBLIC_SUPABASE_URL` (from Project Settings → API)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (from Project Settings → API)
  - `SUPABASE_SERVICE_ROLE_KEY` (from Project Settings → API)
  - `NEXT_PUBLIC_VENMO_HANDLE` (optional, e.g. @LittleTownBakes)
- [ ] Create or invite the bakery owner under Authentication → Users and assign `app_metadata.role` to `admin` with the server-side Supabase Admin API (see README).
- [ ] Run every migration in `supabase/migrations/` in filename order (Supabase CLI recommended).

## Misc

- [ ] Add product images to `public/img/` (e.g. `cakepop_chocolate.png`)
- [ ] Add `venmo-qr.png` to `public/` for checkout QR display
