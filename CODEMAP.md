# Codemap — Snack Lab

## Layout

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (IBM Plex Mono+Sans fonts, CartProvider, ErrorBoundary)
│   ├── globals.css                 # "Lab specimen" design system: theme tokens + @layer components (.lab-panel/-card/-btn/-field/-label/-mono/-tag) + keyframes (badge-pop, fade-in-up)
│   ├── icon.png                    # Favicon (candy-beaker logo); old favicon.ico removed
│   ├── page.tsx                    # SSR storefront (force-dynamic, maps products through toPublicProduct → Storefront)
│   ├── new/page.tsx                # Changelog page
│   ├── cart/
│   │   └── page.tsx                # Cart + checkout + fulfillment selection + order confirmation
│   ├── admin/
│   │   ├── layout.tsx              # Server-side auth gate → AdminLogin component + ErrorBoundary
│   │   ├── page.tsx                # Dashboard: educational business math lab, stats, charts, seller breakdown, theft report
│   │   ├── inventory/page.tsx      # CRUD products, restock modal w/ weighted-avg cost; FlagCheckbox + ProductRow extracted
│   │   └── orders/
│   │       ├── page.tsx            # Orders UI: status, reconcile, partial delivery, audit, owner ops
│   │       └── useOrderActions.ts  # Orders state + API calls hook (extracted from page)
│   └── api/
│       ├── auth/route.ts           # POST: login, GET: check, DELETE: logout
│       ├── session/route.ts        # GET: role + seller + config for client
│       ├── products/route.ts       # CRUD (POST/PUT/DELETE require admin, admin reads scoped by seller; public read strips cost/seller/stolenQty via toPublicProduct)
│       ├── products/restock/route.ts # POST: restock a product, recomputes weighted-average unit cost
│       ├── orders/route.ts         # GET (admin scoped), POST (public checkout + rate limit), PUT/DELETE (seller-guarded + audit)
│       ├── orders/patch/route.ts   # POST: owner-only ops (reassign, void, price correction) + audit
│       ├── requests/route.ts       # GET (admin), POST (public item request)
│       ├── audit/route.ts          # GET: audit log by orderId
│       ├── upload/route.ts         # POST: image upload to R2 (admin, 5MB, JPG/PNG/WEBP/GIF)
│       └── image/[key]/route.ts    # GET: serve image from R2 (public, immutable cache)
├── components/
│   ├── CartProvider.tsx            # Cart context + localStorage + maxQuantity enforcement
│   ├── ErrorBoundary.tsx           # Client error boundary with key-based retry/remount
│   ├── Navbar.tsx                  # Sticky nav: logo wordmark, badge bounce animation, cart total
│   ├── ProductCard.tsx             # Specimen card (SPEC code + tags), variants: in-stock, sold-out, unavailable, coming-soon
│   ├── Storefront.tsx              # Slim header strip + in-stock grid + collapsible "Off shelf" accordion (sold-out/unavailable/coming-soon) + item request form
│   ├── AdminNav.tsx                # Shared admin chrome: logo + section crumb + nav links + logout
│   ├── AdminLogin.tsx              # Seller code + password login form (logo header)
│   ├── AdminLogoutButton.tsx       # Logout button (DELETE /api/auth)
│   └── Tooltip.tsx                 # Reusable click-to-open tooltip with outside-click dismiss
├── hooks/
│   └── useAdminData.ts             # Shared hook: fetch session + products/orders/requests for admin pages
├── lib/
│   ├── auth.ts                     # HMAC sessions, role helpers, requireAdminRequest
│   ├── data.ts                     # KV data layer: per-record CRUD, audit log, legacy migration
│   ├── adminMetrics.ts             # Tested business math for dashboard: revenue, cost, profit, fees, inventory, seller rows
│   ├── product.ts                  # toPublicProduct() (strips cost/seller/stolenQty) + specCode() for public storefront
│   ├── types.ts                    # Shared types: Product, Order, OrderItem, ItemRequest, AuditEntry, ClientSession
│   ├── validation.ts               # Input parsers: product, order, mutation, owner patch, item request
│   ├── fulfillment.ts              # Fulfillment methods, fees, labels, time slots
│   └── images.ts                   # R2 image cleanup (delete unused after product edit/delete)
├── middleware.ts                    # CSRF origin check + security headers (CSP, X-Frame-Options)
vitest.config.ts                     # Vitest config with @/ alias
```

## Key Flows

**Customer order**: `page.tsx` (SSR) → `Storefront` → `addItem()` (CartProvider, maxQty enforced) → `cart/page.tsx` → fulfillment selection → `POST /api/orders` → KV rate limit → validates stock → reserves inventory (with rollback) → saves order

**Admin login**: `admin/layout.tsx` (server) → checks cookie → `AdminLogin` (client) → `POST /api/auth` → cookie set → `router.refresh()`

**Partial delivery**: `admin/orders` → Deliver → modal per-item → `PUT /api/orders` with `delivered[]` → auto-completes when all items fully delivered

**Owner audit**: `admin/orders` → Log → `GET /api/audit?orderId=` → drawer with action/actor/before/after/note. Owner ops plus normal status/reconcile/partial/cancel actions write audit entries.

**Restock**: `admin/inventory` → `+ Restock` per row → modal asks quantity + batch cost → `POST /api/products/restock` → server recomputes weighted-average unit cost `(oldQty*oldCost + batchCost) / newQty`, bumps quantity, returns before/after summary → success view animates in

## Custom Animations (globals.css)

| Token | Use |
|-------|-----|
| `animate-badge-pop` | Cart count badge bounce on add |
| `animate-fade-in-up` | Staggered specimen-card entrance, modals, confirmation |
| `animate-bounce-in` | Legacy alias → `fade-in-up` (kept for back-compat) |

## Tests

| File | Coverage |
|------|----------|
| `src/lib/auth.test.ts` | Session tokens: round-trip, tamper, expiry, parse, seller extraction |
| `src/lib/validation.test.ts` | All input parsers: products, orders, mutations, owner patches, requests |
| `src/lib/adminMetrics.test.ts` | Educational business math: seller totals, owner seller rows, inventory/shrinkage values |
