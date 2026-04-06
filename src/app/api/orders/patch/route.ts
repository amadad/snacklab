import { NextRequest, NextResponse } from "next/server";
import { getOrder, saveOrder, writeAuditEntry } from "@/lib/data";
import { requireAdminRequest, getSessionInfo, ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { parseOwnerPatch } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) return unauthorized;

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { role } = await getSessionInfo(token);

  if (role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const actor = "owner";

  const parsed = parseOwnerPatch(await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const order = await getOrder(parsed.value.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (parsed.value.op === "reassign_seller") {
    const before = { seller: order.seller ?? null };
    order.seller = parsed.value.seller;
    await saveOrder(order);
    await writeAuditEntry({
      orderId: order.id,
      action: "reassign_seller",
      actor,
      before,
      after: { seller: order.seller },
      note: parsed.value.note,
    });
    return NextResponse.json(order);
  }

  if (parsed.value.op === "void") {
    const before = { voided: order.voided ?? false };
    order.voided = true;
    await saveOrder(order);
    await writeAuditEntry({
      orderId: order.id,
      action: "void_order",
      actor,
      before,
      after: { voided: true },
      note: parsed.value.note,
    });
    return NextResponse.json(order);
  }

  if (parsed.value.op === "unvoid") {
    const before = { voided: order.voided ?? false };
    order.voided = false;
    await saveOrder(order);
    await writeAuditEntry({
      orderId: order.id,
      action: "unvoid_order",
      actor,
      before,
      after: { voided: false },
      note: parsed.value.note,
    });
    return NextResponse.json(order);
  }

  if (parsed.value.op === "price_correction") {
    const priceMap = new Map(parsed.value.items.map((i) => [i.productId, i.price]));
    const before = { items: order.items.map((i) => ({ productId: i.productId, price: i.price })) };
    order.items = order.items.map((item) =>
      priceMap.has(item.productId) ? { ...item, price: priceMap.get(item.productId)! } : item
    );
    await saveOrder(order);
    await writeAuditEntry({
      orderId: order.id,
      action: "price_correction",
      actor,
      before,
      after: { items: order.items.map((i) => ({ productId: i.productId, price: i.price })) },
      note: parsed.value.note,
    });
    return NextResponse.json(order);
  }

  return NextResponse.json({ error: "Unhandled op." }, { status: 400 });
}
