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
  type Order,
  type OrderItem,
  type Product,
} from "@/lib/data";
import { requireAdminRequest, getSellerFromToken, getConfiguredAdminPassword, ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { getFulfillmentFee } from "@/lib/fulfillment";
import { parseDeleteOrderInput, parseOrderInput, parseOrderMutation } from "@/lib/validation";

type ProductChange = {
  before: Product;
  after: Product;
};

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
        await saveProduct(change.before).catch(() => undefined);
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
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
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
  const adminPassword = await getConfiguredAdminPassword();
  const seller = adminPassword ? await getSellerFromToken(sessionToken, adminPassword) : undefined;

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
      await saveProduct(change.before).catch(() => undefined);
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

  const updated: Order = {
    ...existing,
    status: parsed.value.status,
  };

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
    } catch {
      for (const change of productChanges.values()) {
        await saveProduct(change.before).catch(() => undefined);
      }

      return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
    }
  } else {
    await saveOrder(updated);
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
    await deleteOrder(parsed.value.id);
  } catch {
    for (const change of productChanges.values()) {
      await saveProduct(change.before).catch(() => undefined);
    }

    return NextResponse.json({ error: "Could not delete the order." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
