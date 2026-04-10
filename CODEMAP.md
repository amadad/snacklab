# Codemap — Snack Lab

## Layout

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (Quicksand font, CartProvider, ErrorBoundary)
│   ├── globals.css                 # Tailwind theme + keyframe animations (badge-pop, fade-in-up, bounce-in)
│   ├── page.tsx                    # SSR storefront (force-dynamic, passes products to Storefront)
│   ├── new/page.tsx                # Changelog page
│   ├── cart/
│   │   └── page.tsx                # Cart + checkout + fulfillment selection + order confirmation
│   ├── admin/
│   │   ├── layout.tsx              # Server-side auth gate → AdminLogin component + ErrorBoundary
│   │   ├── page.tsx                # Dashboard: stats, charts, seller breakdown, theft report
│   │   ├── inventory/page.tsx      # CRUD products, restock modal w/ weighted-avg cost; FlagCheckbox + ProductRow extracted
│   │   └── orders/
│   │       ├── page.tsx            # Orders UI: status, reconcile, partial delivery, audit, owner ops
│   │       └── useOrderActions.ts  # Orders state + API calls hook (extracted from page)
│   └── api/
│       ├── auth/route.ts           # POST: login, GET: check, DELETE: logout
│       ├── session/route.ts        # GET: role + seller + config for client
│       ├── products/route.ts       # CRUD (POST/PUT/DELETE require admin, scoped by seller)
│       ├── products/restock/route.ts # POST: restock a product, recomputes weighted-average unit cost
│       ├── orders/route.ts         # GET (admin), POST (public checkout), PUT (status/reconcile/delivery), DELETE (cancel)
│       ├── orders/patch/route.ts   # POST: owner-only ops (reassign, void, price correction) + audit
│       ├── requests/route.ts       # GET (admin), POST (public item request)
│       ├── audit/route.ts          # GET: audit log by orderId
│       ├── upload/route.ts         # POST: image upload to R2 (admin, 5MB, JPG/PNG/WEBP/GIF)
│       └── image/[key]/route.ts    # GET: serve image from R2 (public, immutable cache)
├── components/
│   ├── CartProvider.tsx            # Cart context + localStorage + maxQuantity enforcement
│   ├── ErrorBoundary.tsx           # Client error boundary with key-based retry/remount
│   ├── Navbar.tsx                  # Sticky nav, badge bounce animation, cart total
│   ├── ProductCard.tsx             # Product card with variants: in-stock, sold-out, unavailable, coming-soon
│   ├── Storefront.tsx              # Product grid layout + item request form (cards via ProductCard)
│   ├── AdminLogin.tsx              # Seller code + password login form
│   ├── AdminLogoutButton.tsx       # Logout button (DELETE /api/auth)
│   └── Tooltip.tsx                 # Reusable click-to-open tooltip with outside-click dismiss
├── hooks/
│   └── useAdminData.ts             # Shared hook: fetch session + products/orders/requests for admin pages
├── lib/
│   ├── auth.ts                     # HMAC sessions, role helpers, requireAdminRequest
│   ├── data.ts                     # KV data layer: per-record CRUD, audit log, legacy migration
│   ├── types.ts                    # Shared types: Product, Order, OrderItem, ItemRequest, AuditEntry, ClientSession
│   ├── validation.ts               # Input parsers: product, order, mutation, owner patch, item request
│   ├── fulfillment.ts              # Fulfillment methods, fees, labels, time slots
│   └── images.ts                   # R2 image cleanup (delete unused after product edit/delete)
├── middleware.ts                    # CSRF origin check + security headers (CSP, X-Frame-Options)
vitest.config.ts                     # Vitest config with @/ alias
```

## Key Flows

**Customer order**: `page.tsx` (SSR) → `Storefront` → `addItem()` (CartProvider, maxQty enforced) → `cart/page.tsx` → fulfillment selection → `POST /api/orders` → validates stock → reserves inventory (with rollback) → saves order

**Admin login**: `admin/layout.tsx` (server) → checks cookie → `AdminLogin` (client) → `POST /api/auth` → cookie set → `router.refresh()`

**Partial delivery**: `admin/orders` → 📦 Deliver → modal per-item → `PUT /api/orders` with `delivered[]` → auto-completes when all items fully delivered

**Owner audit**: `admin/orders` → 🕵️ Log → `GET /api/audit?orderId=` → drawer with action/actor/before/after/note

**Restock**: `admin/inventory` → `+ Restock` per row → modal asks quantity + batch cost → `POST /api/products/restock` → server recomputes weighted-average unit cost `(oldQty*oldCost + batchCost) / newQty`, bumps quantity, returns before/after summary → success view animates in

## Custom Animations (globals.css)

| Token | Use |
|-------|-----|
| `animate-badge-pop` | Cart count badge bounce on add |
| `animate-fade-in-up` | Staggered product card entrance |
| `animate-bounce-in` | Confirmation page celebration |

## Tests

| File | Coverage |
|------|----------|
| `src/lib/auth.test.ts` | Session tokens: round-trip, tamper, expiry, parse, seller extraction |
| `src/lib/validation.test.ts` | All input parsers: products, orders, mutations, owner patches, requests |
