# Snack Lab

> Diátaxis: how-to

Snack Lab is a small Next.js storefront deployed to Cloudflare Workers with OpenNext. It uses:

- **KV** for products, orders, and item requests
- **R2** for uploaded product images
- **HTTP-only cookie auth** for the admin area

## Local development

Install dependencies:

```bash
npm clean-install
```

Create a local Cloudflare vars file for development:

```bash
cp .dev.vars.example .dev.vars
```

Then set your existing admin password in `.dev.vars`:

```bash
ADMIN_PASSWORD=your-existing-password
```

Start the app:

```bash
npm run dev
```

## Cloudflare deployment

In the Cloudflare dashboard, use these commands:

- **Build command:** `npx opennextjs-cloudflare build`
- **Deploy command:** `npx wrangler deploy`
- **Non-production branch deploy command:** `npx wrangler versions upload`

Before deploying, store the admin password as a Wrangler secret:

```bash
npx wrangler secret put ADMIN_PASSWORD
```

Use the same password value you already use if you are not rotating it yet.

## Required Cloudflare bindings

`wrangler.toml` expects these bindings:

- `STORE_KV` → KV namespace
- `STORE_R2` → R2 bucket
- `ADMIN_PASSWORD` → Wrangler secret

## Useful commands

```bash
npm run dev
npm run build
npm run preview
npm run deploy
npm run lint
```

## What the app does

- Public storefront with stock-aware cart limits
- Cash-on-pickup checkout flow
- Admin inventory management
- Admin order management and reconciliation
- Customer item request submission
