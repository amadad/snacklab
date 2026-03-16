import { NextRequest, NextResponse } from "next/server";
import { getOrders, saveOrders, getProducts, saveProducts, genId, Order, OrderItem } from "@/lib/data";

type CreateOrderBody = {
  name: string;
  email: string;
  items: OrderItem[];
};

export async function GET() {
  const orders = await getOrders();
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateOrderBody;
  const products = await getProducts();

  for (const item of body.items) {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      prod.quantity = Math.max(0, prod.quantity - item.quantity);
    }
  }
  await saveProducts(products);

  const order: Order = {
    id: genId(),
    name: body.name,
    email: body.email,
    items: body.items,
    status: "pending",
    date: new Date().toISOString(),
  };
  const orders = await getOrders();
  orders.push(order);
  await saveOrders(orders);
  return NextResponse.json(order, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { id: string; status: Order["status"]; items?: OrderItem[] };
  const orders = await getOrders();
  const idx = orders.findIndex((o) => o.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  orders[idx] = {
    ...orders[idx],
    status: body.status,
    ...(body.items ? { items: body.items } : {}),
  };
  await saveOrders(orders);
  return NextResponse.json(orders[idx]);
}

export async function DELETE(req: NextRequest) {
  const body = (await req.json()) as { id: string; restoreStock?: boolean };
  const orders = await getOrders();
  const idx = orders.findIndex((o) => o.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Optionally restore stock when cancelling
  if (body.restoreStock) {
    const products = await getProducts();
    for (const item of orders[idx].items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) prod.quantity += item.quantity;
    }
    await saveProducts(products);
  }

  orders.splice(idx, 1);
  await saveOrders(orders);
  return NextResponse.json({ ok: true });
}
