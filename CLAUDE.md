# CLAUDE.md — Snack Lab

Student-run snack storefront. Customers browse/order, pay cash at pickup. Sellers manage their own inventory. Owner oversees all.

## Stack

- Next.js 16 (App Router) — storefront is server-rendered, admin is `"use client"`
- Tailwind CSS v4 (theme tokens + custom animations in `globals.css` `@theme inline`)
- Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`)
- KV (`STORE_KV`) — per-record keys with prefix (`product:`, `order:`, `request:`, `audit:`)
- R2 (`STORE_R2`) — product image uploads

## Commands

```bash
npm run dev          # local dev server
npm run build        # Next.js build
npm run test         # vitest run
npm run preview      # Cloudflare local preview (build + wrangler dev)
npm run deploy       # Cloudflare deploy (build + wrangler deploy)
npx tsc --noEmit     # typecheck
```

## Architecture

### Auth

HMAC-signed session cookies (`snacklab_admin`, 12h expiry):
- `POST /api/auth` — login with password + seller code, sets cookie
- `GET /api/auth` — check session
- `DELETE /api/auth` — logout
- Protected routes use `requireAdminRequest(req)` from `src/lib/auth.ts`

Roles: **owner** (OWNER_CODES) sees everything; **seller** (SELLER_CODES) sees own products/orders only.

### Data

Per-record KV keys (not single-blob). Legacy migration from flat arrays runs once per worker instance.
- Types in `src/lib/types.ts`: Product, Order, OrderItem, ItemRequest, AuditEntry, ClientSession
- Validation in `src/lib/validation.ts`: parseProductInput, parseOrderInput, parseOrderMutation, parseOwnerPatch
- Admin business math in `src/lib/adminMetrics.ts`: shared/tested revenue, cost, gross profit, platform fee, net earnings, margin, inventory value, seller rows

### Cart

Client-side React context (`CartProvider`). Persisted to localStorage (`snacklab-cart`). Enforces `maxQuantity` per product. Server validates stock on checkout and applies a simple KV-backed checkout rate limit.

### Fulfillment

Three methods: during-school (free), after-school (free, needs time slot), house-dropoff (+$2, needs time + location). Logic in `src/lib/fulfillment.ts`.

## Env Vars

Set via `wrangler secret put` or Cloudflare dashboard — **never** in wrangler.toml.

| Var | Purpose |
|-----|---------|
| `ADMIN_PASSWORD` | Required. Admin login password |
| `SELLER_CODES` | Comma-sep seller codes (e.g. ZAIN,SYRA) |
| `OWNER_CODES` | Comma-sep owner codes (full access) |
| `PLATFORM_FEE_PCT` | Platform fee % for sellers (default 20) |
| `DEFAULT_SELLER` | Fallback seller attribution |

## Gotchas

- KV has no transactions — concurrent order POSTs can race on stock. Server validates + attempts rollback but gap exists.
- Public checkout has a simple KV-backed rate limiter; Cloudflare rate limiting rules are still better for serious abuse.
- Admin layout auth is a client-side UX gate; real protection is `requireAdminRequest()` on API routes.
- Images served through `/api/image/[key]` proxy from R2 with immutable 1-year cache.
- `wrangler.toml` must not contain secrets — use `wrangler secret put`.
- Orders page state/actions extracted to `useOrderActions.ts` hook; page is render-only (~437 LOC).
- Admin dashboard is intentionally educational for kids: keep money concepts explicit (revenue, snack cost, gross profit, store fee, net earnings) and backed by `calculateAdminMetrics()` tests.
- Seller admin API reads are scoped with `?scope=admin`; order mutations also check seller ownership server-side.
- Middleware (`src/middleware.ts`) adds CSRF origin check and security headers (CSP, X-Frame-Options). CSRF allows non-browser clients through — API auth still protects mutations.
- Restock writes back to `Product.cost` as a **weighted-average** of old stock and new batch: `(oldQty*oldCost + batchCost) / newQty`. Every profit/margin calc downstream relies on `cost` being honest — always restock via `POST /api/products/restock` rather than editing `cost` directly, or the running cost drifts from reality.
