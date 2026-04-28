import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import {
  deleteOrder,
  genId,
  getOrder,
  getOrders,
  getProduct,
  getProducts,
  saveOrder,
  saveProduct,
  writeAuditEntry,
} from "@/lib/data";
import type { Order, OrderItem, Product } from "@/lib/types";
import { requireAdminRequest, getSellerFromToken, getSessionInfo, ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { getFulfillmentFee } from "@/lib/fulfillment";
import { parseDeleteOrderInput, parseOrderInput, parseOrderMutation } from "@/lib/validation";

type ProductChange = {
  before: Product;
  after: Product;
};

const CHECKOUT_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const CHECKOUT_RATE_LIMIT_MAX = 20;

async function checkCheckoutRateLimit(req: NextRequest) {
  const forwarded = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const bucket = Math.floor(Date.now() / (CHECKOUT_RATE_LIMIT_WINDOW_SECONDS * 1000));
  const key = `rate:checkout:${bucket}:${ip}`;
  const { env } = await getCloudflareContext({ async: true });
  const current = Number((await env.STORE_KV.get(key)) ?? "0");
  if (current >= CHECKOUT_RATE_LIMIT_MAX) {
    return false;
  }
  await env.STORE_KV.put(key, String(current + 1), { expirationTtl: CHECKOUT_RATE_LIMIT_WINDOW_SECONDS });
  return true;
}

async function canMutateOrder(req: NextRequest, order: Order) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { role, seller } = await getSessionInfo(token);
  if (role === "owner") return { ok: true as const, actor: "owner" };
  if (!seller) return { ok: false as const };

  const products = await getProducts();
  const sellerProductIds = new Set(products.filter((product) => product.seller === seller).map((product) => product.id));
  const ownsSomeItem = order.items.some((item) => sellerProductIds.has(item.productId));
  return ownsSomeItem ? { ok: true as const, actor: seller } : { ok: false as const };
}

async function applyProductChanges(changes: Map<string, ProductChange>) {
  const appliedIds: string[] = [];

  try {
    for (const [productId, change] of changes) {
      await saveProduct(change.after);
      appliedIds.push(productId);
    }

    return { ok: true as const };
  } catch {
    for (const productId of appliedIds.reverse()) {
      const change = changes.get(productId);
      if (change) {
        await saveProduct(change.before).catch((e) => console.error("Stock rollback failed:", e));
      }
    }

    return { ok: false as const };
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) {
    return unauthorized;
  }

  const orders = await getOrders();
  if (req.nextUrl.searchParams.get("scope") !== "admin") {
    return NextResponse.json(orders);
  }

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { role, seller } = await getSessionInfo(token);
  if (role === "owner") {
    return NextResponse.json(orders);
  }

  const products = await getProducts();
  const sellerProductIds = new Set(products.filter((product) => product.seller === seller).map((product) => product.id));
  return NextResponse.json(orders.filter((order) => order.items.some((item) => sellerProductIds.has(item.productId))));
}

// Public endpoint — no auth required (customers place orders).
export async function POST(req: NextRequest) {
  const allowed = await checkCheckoutRateLimit(req);
  if (!allowed) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const parsed = parseOrderInput(await req.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const products = await getProducts();
  const productsById = new Map(products.map((product) => [product.id, product]));
  const issues: { productId: string; reason: string }[] = [];
  const orderItems: OrderItem[] = [];
  const productChanges = new Map<string, ProductChange>();

  for (const item of parsed.value.items) {
    const product = productsById.get(item.productId);
    if (!product) {
      issues.push({ productId: item.productId, reason: "Item not found." });
      continue;
    }

    if (product.quantity < item.quantity) {
      issues.push({ productId: item.productId, reason: `Only ${product.quantity} left in stock.` });
      continue;
    }

    const existingChange = productChanges.get(product.id);
    const before = existingChange?.before ?? { ...product };
    const after = existingChange?.after ?? { ...product };
    after.quantity -= item.quantity;
    productChanges.set(product.id, { before, after });

    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      cost: product.cost,
    });
  }

  if (issues.length > 0) {
    return NextResponse.json(
      { error: "Some items changed before checkout. Please review your cart and try again.", issues },
      { status: 409 }
    );
  }

  // Tag order with seller if session has one
  const sessionToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const seller = getSellerFromToken(sessionToken);

  const order: Order = {
    id: genId(),
    name: parsed.value.name,
    email: parsed.value.email,
    items: orderItems,
    fulfillment: parsed.value.fulfillment,
    fulfillmentFee: getFulfillmentFee(parsed.value.fulfillment.method),
    status: "pending",
    date: new Date().toISOString(),
    seller,
  };

  const changeResult = await applyProductChanges(productChanges);
  if (!changeResult.ok) {
    return NextResponse.json({ error: "Could not reserve inventory. Please try again." }, { status: 500 });
  }

  try {
    await saveOrder(order);
  } catch {
    for (const change of productChanges.values()) {
      await saveProduct(change.before).catch((e) => console.error("Stock rollback failed:", e));
    }

    return NextResponse.json({ error: "Could not place your order. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ order }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = parseOrderMutation(await req.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await getOrder(parsed.value.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await canMutateOrder(req, existing);
  if (!access.ok) {
    return NextResponse.json({ error: "Not your order." }, { status: 403 });
  }

  const updated: Order = {
    ...existing,
    status: parsed.value.status,
  };

  // Handle partial delivery — record how many were delivered for each item
  if (parsed.value.delivered) {
    const deliveredMap = new Map(parsed.value.delivered.map((d) => [d.productId, d.quantity]));
    const nextItems: OrderItem[] = existing.items.map((item) => {
      const newDelivered = deliveredMap.has(item.productId)
        ? deliveredMap.get(item.productId)!
        : (item.delivered ?? 0);
      return { ...item, delivered: Math.min(newDelivered, item.quantity) };
    });

    const allDelivered = nextItems.every((i) => (i.delivered ?? 0) >= i.quantity);
    updated.items = nextItems;
    updated.status = allDelivered ? "complete" : "partial";
    await saveOrder(updated);
    await writeAuditEntry({
      orderId: updated.id,
      action: "partial_delivery",
      actor: access.actor,
      before: { items: existing.items.map((item) => ({ productId: item.productId, delivered: item.delivered ?? 0 })) },
      after: { items: nextItems.map((item) => ({ productId: item.productId, delivered: item.delivered ?? 0 })) },
    });
    return NextResponse.json(updated);
  }

  if (parsed.value.items) {
    const existingItems = new Map(existing.items.map((item) => [item.productId, item]));
    const seen = new Set<string>();

    for (const item of parsed.value.items) {
      if (!existingItems.has(item.productId)) {
        return NextResponse.json({ error: "Cannot reconcile an item that was not in the order." }, { status: 400 });
      }
      if (seen.has(item.productId)) {
        return NextResponse.json({ error: "Duplicate reconciled items are not allowed." }, { status: 400 });
      }
      seen.add(item.productId);
    }

    const productChanges = new Map<string, ProductChange>();
    const nextItems: OrderItem[] = [];

    for (const originalItem of existing.items) {
      const requestedQuantity =
        parsed.value.items.find((item) => item.productId === originalItem.productId)?.quantity ??
        originalItem.quantity;

      if (requestedQuantity > originalItem.quantity) {
        return NextResponse.json(
          { error: `Cannot increase ${originalItem.name} above the original ordered quantity.` },
          { status: 400 }
        );
      }

      if (requestedQuantity > 0) {
        nextItems.push({ ...originalItem, quantity: requestedQuantity });
      }

      const restoreQuantity = originalItem.quantity - requestedQuantity;
      if (restoreQuantity <= 0) {
        continue;
      }

      const product = await getProduct(originalItem.productId);
      if (!product) {
        continue;
      }

      const existingChange = productChanges.get(product.id);
      const before = existingChange?.before ?? { ...product };
      const after = existingChange?.after ?? { ...product };
      after.quantity += restoreQuantity;
      productChanges.set(product.id, { before, after });
    }

    if (nextItems.length === 0) {
      return NextResponse.json(
        { error: "An order must keep at least one item. Cancel the order instead." },
        { status: 400 }
      );
    }

    const changeResult = await applyProductChanges(productChanges);
    if (!changeResult.ok) {
      return NextResponse.json({ error: "Could not update inventory for this order." }, { status: 500 });
    }

    updated.items = nextItems;

    try {
      await saveOrder(updated);
      await writeAuditEntry({
        orderId: updated.id,
        action: "reconcile",
        actor: access.actor,
        before: { items: existing.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) },
        after: { items: nextItems.map((item) => ({ productId: item.productId, quantity: item.quantity })) },
      });
    } catch {
      for (const change of productChanges.values()) {
        await saveProduct(change.before).catch((e) => console.error("Stock rollback failed:", e));
      }

      return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
    }
  } else {
    await saveOrder(updated);
    if (existing.status !== updated.status) {
      await writeAuditEntry({
        orderId: updated.id,
        action: "status_change",
        actor: access.actor,
        before: { status: existing.status },
        after: { status: updated.status },
      });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = parseDeleteOrderInput(await req.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await getOrder(parsed.value.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await canMutateOrder(req, existing);
  if (!access.ok) {
    return NextResponse.json({ error: "Not your order." }, { status: 403 });
  }

  const productChanges = new Map<string, ProductChange>();
  if (parsed.value.restoreStock) {
    for (const item of existing.items) {
      const product = await getProduct(item.productId);
      if (!product) {
        continue;
      }

      const existingChange = productChanges.get(product.id);
      const before = existingChange?.before ?? { ...product };
      const after = existingChange?.after ?? { ...product };
      after.quantity += item.quantity;
      productChanges.set(product.id, { before, after });
    }
  }

  const changeResult = await applyProductChanges(productChanges);
  if (!changeResult.ok) {
    return NextResponse.json({ error: "Could not restore inventory for this order." }, { status: 500 });
  }

  try {
    await writeAuditEntry({
      orderId: existing.id,
      action: "cancel_order",
      actor: access.actor,
      before: { status: existing.status, items: existing.items, restoreStock: parsed.value.restoreStock },
      after: { deleted: true },
    });
    await deleteOrder(parsed.value.id);
  } catch {
    for (const change of productChanges.values()) {
      await saveProduct(change.before).catch((e) => console.error("Stock rollback failed:", e));
    }

    return NextResponse.json({ error: "Could not delete the order." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
