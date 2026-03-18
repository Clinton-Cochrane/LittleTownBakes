# Production Readiness TODO

Steps to get Little Town Bakes live. See `PRODUCTION_SETUP.md` for detailed instructions.

---

## 1. Infrastructure (Developer or Client)

- [x ] **Create Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard)
- [x ] **Run migrations** in order via Supabase SQL Editor or `supabase db push`:
  1. `supabase/migrations/20250313000000_create_inventory_slots.sql`
  2. `supabase/migrations/20250313000001_create_flavor_requests.sql`
  3. `supabase/migrations/20250313100000_atomic_reserve_inventory.sql`
- [x ] **Connect repo to Vercel** — import from Git, deploy
- [ x] **Add Vercel env vars** (Settings → Environment Variables):
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role / secret key
  - `ADMIN_KEY` — strong random string (e.g. `openssl rand -hex 32`)
  - `NEXT_PUBLIC_VENMO_HANDLE` — e.g. `@LittleTownBakes`
- [x ] **Redeploy** after adding env vars (or push a commit)

---

## 2. Client Content (Client)

- [ ] **Fill out `public/about.json`** — bakery story, how to order, contact info  
  See `CONTENT_ABOUT.md` for prompts and field descriptions.
- [ ] **Add `venmo-qr.png`** to `public/` for checkout Venmo tile
- [ ] **Review `public/menu.json`** — update items, prices, descriptions as needed
- [ ] **Seed initial inventory** (optional) — add slots in Supabase for current week/month, or use Admin → Inventory after deploy

---

## 3. Post-Deploy Verification (Developer or Client)

- [ ] **Health check:** `GET https://your-app.vercel.app/api/health` → returns `{ status: "ok" }`
- [ ] **Place a test order** — confirm it appears in Supabase → Table Editor → `orders`
- [ ] **Admin login** at `/admin/login` — verify orders, inventory, flavor requests load
- [ ] **Submit a test flavor request** — confirm it appears in `flavor_requests`
- [ ] **Share `ADMIN_KEY`** with client securely (e.g. password manager) for admin access

---

## 4. Optional (Improvements)

- [ ] Add product images to `public/img/` (e.g. `cakepop_chocolate.png`) — menu references them
- [ ] Integrate Resend or Postmark in `lib/notify.ts` for order confirmation emails
- [ ] Custom domain — add in Vercel project settings
- [ ] Enable Vercel deployment protection for preview branches (Settings → Deployment Protection)
