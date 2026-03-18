# Production Setup Guide

This guide walks you through connecting your Supabase project to Little Town Bakes and deploying to Vercel.

---

## Prerequisites

- A Supabase project (you have one)
- A Vercel account with the app deployed
- Git repository connected to Vercel

---

## Part 1: Supabase Setup

### 1.1 Get Your Supabase Credentials

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create one)
3. Open the **Connect** dialog (e.g. click **Connect** in the top nav, or use the project dropdown)
   - Or go to **Project Settings** (gear icon in sidebar) → **API Keys**
4. Copy these values (you'll need them for Vercel):
   - **Project URL** (e.g. `https://xxxxx.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`
   - **Secret key** or **service_role key** (elevated privilege, for server-side only) → `SUPABASE_SERVICE_ROLE_KEY`
     - In **API Keys**: use a **Secret key** (`sb_secret_...`) from the main tab, or the **service_role** key from the **Legacy API Keys** tab
     - ⚠️ **Never expose this key in client-side code.** It bypasses Row Level Security.

### 1.2 Run Database Migrations

Run the migrations **in this exact order** via the Supabase SQL Editor:

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query and run each migration file in order:

**Migration 1:** `supabase/migrations/20250313000000_create_inventory_slots.sql`  
Creates the `inventory_slots` table for tracking available quantity per menu item.

**Migration 2:** `supabase/migrations/20250313000001_create_flavor_requests.sql`  
Creates the `flavor_requests` table for customer flavor requests.

**Migration 3:** `supabase/migrations/20250313100000_atomic_reserve_inventory.sql`  
Creates the `orders` table and the `create_order_with_reserve` function for atomic inventory reservation.

**Alternative: Supabase CLI**

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and linked:

```bash
supabase db push
```

This runs all migrations in order automatically.

### 1.3 Seed Initial Availability (Optional)

After migrations, you may want to add availability slots (how many of each product can be ordered per week/month). Use the SQL Editor:

```sql
-- Example: Add 10 cakepops available for the current week
INSERT INTO inventory_slots (item_id, period_type, period_start, quantity_available)
VALUES ('cakepop_chocolate', 'week', date_trunc('week', CURRENT_DATE)::date, 10)
ON CONFLICT (item_id, period_type, period_start) DO NOTHING;
```

Adjust `item_id` to match your `public/menu.json` item IDs.

---

## Part 2: Vercel Environment Variables

Add your secrets to Vercel only (no need for local `.env.local` unless you want to test locally). Keeping secrets in Vercel's env vars avoids accidentally committing or leaking them.

### 2.1 Add Environment Variables

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your **Little Town Bakes** project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase **Connect** dialog or **Project Settings** → **API Keys** — Project URL (e.g. `https://xxxxx.supabase.co`) | Development, Preview (add Production when ready) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **API Keys** — **Secret key** (`sb_secret_...`) or **Legacy API Keys** tab → **service_role** | Development, Preview (add Production when ready) |
| `ADMIN_KEY` | Generate a strong random string (e.g. `openssl rand -hex 32`) | Development, Preview (add Production when ready) |
| `NEXT_PUBLIC_VENMO_HANDLE` | Your Venmo handle, e.g. `@LittleTownBakes` | Development, Preview (add Production when ready) |

**Tip:** Start with **Development** and **Preview** only. Add **Production** when you're ready to go live — this reduces the risk of leaking secrets to a live URL.

**Important:** Variables starting with `NEXT_PUBLIC_` are exposed to the browser. Only put non-sensitive data there.

### 2.2 Redeploy

After adding env vars:

1. Go to **Deployments**
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

Or push a new commit to trigger a fresh deployment with the new variables.

**Optional: Local testing** — If you want to run the app locally, copy `.env.example` to `.env.local` and fill in the same values. Never commit `.env.local`.

---

## Part 3: Post-Deploy Checklist

- [ ] **Health check:** Visit `https://your-app.vercel.app/api/health` — should return OK
- [ ] **Checkout:** Place a test order and confirm it appears in Supabase → Table Editor → `orders`
- [ ] **Admin:** Log in at `/admin/login` and verify availability and orders load
- [ ] **Flavor requests:** Submit a test request and confirm it appears in `flavor_requests`
- [ ] **Content:** Fill out `public/about.json` per `CONTENT_ABOUT.md`
- [ ] **Venmo QR:** Add `venmo-qr.png` to `public/` for the checkout Venmo tile

---

## Troubleshooting

### "Invalid API key" or connection errors

- Confirm `NEXT_PUBLIC_SUPABASE_URL` has no trailing slash
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is the **Secret key** or **service_role** key (elevated), not the publishable/anon key
- Ensure env vars are set for the correct Vercel environment (Development, Preview, or Production)

### Orders fail with "Item X: only 0 available"

- Add availability slots in Supabase for the current week/month (Admin → Availability)
- Ensure `item_id` in `inventory_slots` matches `id` in `public/menu.json`

### Admin routes return 401

- Verify `ADMIN_KEY` matches between your request header and Vercel env
- Check the admin login flow sends `Authorization: Bearer <ADMIN_KEY>`

---

## Security Notes

- **Never commit** `.env.local` or any file containing secrets (already in `.gitignore`)
- **Service Role Key** bypasses RLS — only use it in server-side code (API routes, server components)
- **ADMIN_KEY** protects admin endpoints — use a long random value
- Consider enabling [Vercel's deployment protection](https://vercel.com/docs/security/deployment-protection) for preview deployments
