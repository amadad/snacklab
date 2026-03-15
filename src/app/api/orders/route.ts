import { NextRequest, NextResponse } from "next/server";
import { getOrders, saveOrders, getProducts, saveProducts, genId, Order, OrderItem } from "@/lib/data";

export const runtime = "edge";

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
  const body = (await req.json()) as { id: string; status: Order["status"] };
  const orders = await getOrders();
  const idx = orders.findIndex((o) => o.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  orders[idx] = { ...orders[idx], status: body.status };
  await saveOrders(orders);
  return NextResponse.json(orders[idx]);
}
