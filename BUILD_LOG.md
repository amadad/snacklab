# SnackLab Build Log

Chronological record of every feature and fix. Newest at the top.

---

## 2026-03-18 — Owner controls: reassign, void, price correction, audit log

**Why:** Early orders had no seller tag (Doodar was the only seller before the affiliate model existed). Owner needed tools to correct bad data without losing history.

**What shipped:**
- `AuditEntry` type + `audit:` KV prefix — append-only, keyed `audit:<orderId>:<timestamp>:<id>` for fast per-order queries
- `writeAuditEntry` / `getAuditLog` helpers in `src/lib/data.ts`
- `Order.voided` boolean — excluded from all stats/earnings, record kept
- `parseOwnerPatch` validator — ops: `reassign_seller`, `void`, `unvoid`, `price_correction`
- `/api/orders/patch` (POST) — owner-only endpoint, writes audit entry on every mutation
- `/api/audit` (GET) — returns full log, filterable by `?orderId=`
- `DEFAULT_SELLER` env var — fallback attribution for orders with no seller tag (set to `DOODAR` in Cloudflare)
- Orders page: ✏️ Seller, 💲 Price, Void/Unvoid, 🕵️ Log buttons (owner only)
- Audit drawer — per-order, shows action / actor / before→after / note / timestamp
- Voided orders shown greyed out with warning badge; excluded from dashboard stats

**Env vars added:** `DEFAULT_SELLER`

---

## 2026-03-17 — Partial delivery flow + unknown seller fix

**Why:** Sellers deliver in batches (e.g. Doodar brings 2 gummies today, 1 tomorrow). Previous model was all-or-nothing. Also, orders placed before the affiliate model showed "unknown" in the seller breakdown.

**What shipped:**
- `OrderItem.delivered` — tracks cumulative delivered quantity per item
- `Order.status: "partial"` — new status between pending and complete
- `/api/orders` PUT: accepts `delivered[]` array, auto-promotes to `complete` when all items fully delivered
- Orders page: 📦 Deliver button → modal with per-item input + progress bar
- "Partially Delivered" filter tab
- Item rows show delivered/owed counts; completed items crossed out with ✓
- `DEFAULT_SELLER` env fallback chain: `order.seller` → `product.seller` → `DEFAULT_SELLER` → "Store"

---

## 2026-03-17 — Affiliate / multi-seller model

**Why:** Doodar, Zain, Omar each sell their own products. Owner (Ali) takes a platform fee. Each seller should only see their own inventory and orders.

**What shipped:**
- `OWNER_CODES` env — full access, sees everything
- `SELLER_CODES` env — restricted to own products/orders
- `PLATFORM_FEE_PCT` env — % of seller revenue going to owner (default 20%)
- `Product.seller` field
- Session API returns role + seller code
- Products API scopes writes to seller's own products
- Admin dashboard: owner sees per-seller breakdown + margin donut; sellers see money flow bar
- `/api/session` route

**Env vars added:** `OWNER_CODES`, `SELLER_CODES`, `PLATFORM_FEE_PCT`

---

## 2026-03-16 — Inventory quantity caps + server-side stock check

**Why:** Someone ordered 500 gummies when only 2–3 were in stock.

**What shipped:**
- `CartProvider` tracks `maxStock` per product from API response
- Cart UI caps quantity at available stock; add button disabled when at max
- `/api/orders` POST: server validates each item quantity against live inventory; returns 409 with per-item issues if stock insufficient
- Atomic inventory reservation with rollback on order save failure

---

## 2026-03-16 — Sold-out handling

**Why:** Out-of-stock items needed clear UI treatment.

**What shipped:**
- Storefront: sold-out items shown greyed (grayscale image, "Sold Out" badge, disabled add button)
- Items stay visible so customers can see what exists

---

## 2026-03-15 — Cancel orders, reconcile, hot flag, profit tracker, sales chart, request form

**What shipped:**
- Admin: cancel order with optional stock restore
- Admin: reconcile order (adjust quantities actually paid, returns delta to inventory)
- Product `hot` flag — shows flame badge on storefront
- Admin dashboard: profit tracker card + 7-day sales bar chart
- Storefront: "Request an item" form for products not currently stocked

---

## 2026-03-15 — Initial build

**Stack:** Next.js 15 + OpenNext + Cloudflare Workers + KV

**What shipped:**
- Storefront: product grid, cart, checkout with fulfillment options (pick up at school / after-school pickup / home drop-off)
- Admin: password-protected, inventory management (add/edit/delete products, image upload via R2)
- Admin: orders list with status toggle (pending → complete)
- Data layer: Cloudflare KV with per-record keys + v2 migration from legacy array storage
- Auth: HMAC-signed session cookies, configurable `ADMIN_PASSWORD`
