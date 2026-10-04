# Little Town Bakes

A cottage bakery ordering app built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, and Supabase. Customers browse the menu, build a cart, choose a pickup window, and track their orders. Bakery admins manage products, photos, stock, pickup availability, and order fulfillment.

Checkout supports Venmo instructions and cash at pickup; admins record payment status. PostgreSQL validates prices and reserves inventory atomically, and public tracking links use tokens separate from internal order IDs.

## Quick start

Use Node.js **20.19+ on the 20.x line**, **22.13+ on the 22.x line**, or **24+**, with npm. These versions satisfy the development dependencies; CI uses Node.js 20. The local development script uses POSIX environment-variable syntax, so use a compatible shell (or WSL on Windows).

```bash
git clone https://github.com/Clinton-Cochrane/LittleTownBakes.git
cd LittleTownBakes
npm ci
npm run dev:local
```

Open [localhost:3000](http://localhost:3000). This mode needs no Supabase project or environment file. It generates an ignored `.local/data.json` with available, sold-out, and archived products plus future pickup windows. Checkout persists orders and inventory changes there, so tracking and the admin order list reflect local orders.

Sign in at `/admin/login` with these development-only credentials:

```text
Email: root@local.test
Password: toor
```

Local admin screens can be viewed, but admin mutations return `LOCAL_READ_ONLY`. Use Supabase mode below to develop admin writes. To discard local orders and regenerate stock and future pickup windows, run:

```bash
npm run local:reset
```

The JSON adapter and local admin identity are disabled when `NODE_ENV=production`.

## Repository map

| Path | Purpose |
| --- | --- |
| `app/` | App Router pages, layouts, and API route handlers |
| `app/admin/` | Admin login and protected bakery management pages |
| `app/api/` | Menu, checkout, tracking, demand signals, admin operations, and health checks |
| `components/` | Shared UI, cart, checkout, and admin components |
| `lib/` | Catalog, inventory, orders, pickup windows, authorization, and local data logic |
| `lib/supabase/` | Cookie-backed browser/server Auth clients and session middleware |
| `lib/supabaseAdmin.ts` | Server-side privileged database client |
| `lib/notifications/` | Notification orchestration, channels, and Resend provider |
| `supabase/migrations/` | Ordered database schema, functions, policies, and seed migrations |
| `supabase/tests/` | SQL assertions exercised by the database test script |
| `fixtures/menu.json` | Deterministic menu-only fixture |
| `scripts/` | Local data reset, database tests, and production smoke checks |
| `public/` | Static assets and About page content |
| `.github/workflows/ci.yml` | Pull request and main-branch checks |

Vitest tests live alongside the modules and pages they cover as `*.test.ts` and `*.test.tsx`.

## Develop with Supabase

Use this mode for database behavior, Supabase Auth, Storage uploads, and writable admin workflows.

1. Create a development Supabase project.
2. Copy the environment template and fill in the three Supabase credentials:

   ```bash
   cp .env.example .env.local
   ```

3. Apply **all** SQL files in [supabase/migrations/](supabase/migrations/) in filename order through the Supabase SQL Editor or a configured Supabase CLI workflow. The migrations include catalog seeds, inventory transactions, demand history, image storage, pickup windows, and public order numbers. Existing databases should receive only migrations they have not already applied.
4. Provision an admin account as described below.
5. Run `npm run dev`, sign in at `/admin/login`, set product stock, and create an enabled, selectable pickup window in the admin availability screen before testing checkout. The current-inventory migration initializes stock to zero.

For deterministic menu UI work, set `MENU_DATA_SOURCE=fixture` in `.env.local` and run `npm run dev`. This replaces only menu reads; checkout, pickup windows, and admin workflows still need Supabase. Fixture selection is disabled in production.

### Environment variables

Supabase credentials are required for Supabase mode and deployment. They are unnecessary for `npm run dev:local`. Keep `.env.local` out of Git and keep the service-role key in server-side code.

| Variable | When needed | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase mode | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase mode | Publishable key for cookie-backed Auth clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase mode | Server-only privileged database access |
| `LOCAL_DATA_SOURCE` | Local mode | Set to `json` automatically by `npm run dev:local`; ignored in production |
| `MENU_DATA_SOURCE` | Optional development | Set to `fixture` for menu-only fixture reads; ignored in production |
| `NEXT_PUBLIC_VENMO_HANDLE` | Optional | Checkout handle; defaults to `@LittleTownBakes` |
| `NOTIFICATIONS_ENABLED` | Optional email delivery | Set to `true` to enable configured channels; disabled by default |
| `RESEND_API_KEY` | Email delivery | Server-only Resend API key |
| `NOTIFICATION_EMAIL_FROM` | Email delivery | Sender on a Resend-verified domain, such as `Little Town Bakes <orders@updates.example.com>` |
| `BAKER_NOTIFICATION_EMAIL` | Email delivery | Baker inbox for operational order notifications |
| `ADMIN_ORDERS_URL` | Optional email delivery | Absolute admin orders URL included in notifications |

The environment template contains the basic settings. Add the notification variables above when enabling email.

### Admin accounts

Supabase mode requires an email/password Auth account with verified `app_metadata.role` set to `admin`. There is no public signup or admin account-management UI.

1. Create the user in **Supabase Dashboard → Authentication → Users**, or through `supabase.auth.admin.createUser` in trusted server-side tooling.
2. Copy the user ID and assign the role through a trusted administrative client using `SUPABASE_SERVICE_ROLE_KEY`:

   ```ts
   await supabase.auth.admin.updateUserById(userId, {
     app_metadata: { role: "admin" },
   });
   ```

3. Sign in at `/admin/login`. Add additional admins through the same provisioning process.

Authorization reads `app_metadata`, never user-editable metadata. Keep administrative Auth methods in trusted server-side tooling. Until a recovery UI exists, a trusted operator can set a temporary password with `supabase.auth.admin.updateUserById(userId, { password: temporaryPassword })` and communicate it securely.

## Data and request flow

- **Catalog:** `categories` and `products` define the menu. `products.is_archived` moves items to Past Flavors; active products with zero stock stay visible but cannot be ordered.
- **Inventory and checkout:** `product_inventory.quantity_on_hand` is current stock per product. Database functions validate catalog prices, save order snapshots, reserve stock atomically, and restore stock on cancellation.
- **Pickup:** `pickup_windows` holds enabled time windows. Checkout validates the selected window on the server. Customers can choose future windows at least 15 minutes before their start, or open windows with at least 15 minutes remaining.
- **Orders:** Human-readable public order numbers are distinct from internal IDs and tracking tokens. `/api/orders/track/[token]` returns the public tracking view; internal order access and status changes require admin authorization.
- **Demand:** `product_demand_events` records anonymous interest during sold-out or archived periods. Triggers manage period boundaries. Lifetime sales come from non-canceled order snapshots and remain separate from demand counts.
- **Product images:** Admin uploads use the public `product-images` Storage bucket, accepting JPEG, PNG, WebP, and GIF files up to 15 MiB. Upload, finalization, and replacement cleanup require server-verified admin access. `products.image` stores the public URL; existing `/img/...` assets continue to work.

### Notifications

Email uses Resend's HTTPS API. Enable it with `NOTIFICATIONS_ENABLED=true` and all three email settings: `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`, and `BAKER_NOTIFICATION_EMAIL`. Partial email configuration is logged and skipped. Delivery is disabled under `NODE_ENV=test`; tests inject providers.

Order routes persist changes before awaiting notifications. The service settles channel deliveries independently, so a provider failure does not change a successful order response. Event keys include the order ID and, for status changes, fulfillment and payment status; the email channel adds `:email` for the provider idempotency key. There is no application retry worker or permanent delivery ledger. Push and SMS have injectable interfaces but no production providers.

## Commands and verification

| Command | Purpose |
| --- | --- |
| `npm run dev:local` | JSON-backed development with Turbopack |
| `npm run local:reset` | Replace generated local data, discarding local orders |
| `npm run dev` | Supabase-backed development with Turbopack |
| `npm test` | Run Vitest unit, route, and component tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:db` | Run SQL and transaction/concurrency tests in disposable PostgreSQL 17; requires Bash and Docker |
| `npm run lint` | Run the configured Next.js ESLint check |
| `npm run build` | Create the production build |
| `npm run start` | Serve an existing production build |
| `npm run test:smoke` | Start the production server on a temporary port and check `/`, `/checkout`, `/admin/login`, and `/api/health`; build first |

For application changes, run the checks used by CI:

```bash
npm test
npm run lint
npm run build
npm run test:smoke
```

For migrations or inventory transaction changes, also run `npm run test:db`. That script applies every migration to an isolated database and tests concurrent demand signals, inventory reservations, public order numbering, and admin stock adjustments. CI currently runs the application checks above, but does not run the Docker database suite.

Work on a branch and open a pull request against `main`. Include what changed and which checks you ran.

## Content and deployment

Edit [public/about.json](public/about.json) for the About page; [CONTENT_ABOUT.md](CONTENT_ABOUT.md) describes its fields. Brand constants live in [lib/brand.ts](lib/brand.ts), with asset notes in [BRAND_ASSETS.md](BRAND_ASSETS.md).

Deploy to Vercel by connecting the repository, applying database migrations, and setting the Supabase environment variables for Production and any Preview environments that need database access. Set public environment variables before building. A production build uses Supabase even if local JSON or fixture flags are present.

- `GET /api/health` checks process liveness without a database call.
- `GET /api/health?ready=1` checks Supabase configuration and access to the `orders` table, returning `503` if unavailable. It does not verify the entire schema or Storage configuration.

For a self-hosted Node.js server, run `npm run build` followed by `npm run start` with the same environment configuration.
