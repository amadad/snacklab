import { NextRequest, NextResponse } from "next/server";
import { getProduct, saveProduct } from "@/lib/data";
import { requireAdminRequest } from "@/lib/auth";
import { parseId } from "@/lib/validation";

// Restock a product: bump quantity, recompute weighted-average unit cost.
//
// The lesson this teaches: when you buy a new batch, your "true" unit cost
// blends the old stock and the new stock together. If you still had 3 units
// at $0.60 and bought 12 more for $5.00 ($0.42 each), your new unit cost is
// (3*0.60 + 5.00) / 15 = $0.453. This matters because your profit per sale
// uses this number, not whatever you remember paying.
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) return unauthorized;

  const body = (await req.json()) as Record<string, unknown>;

  const id = parseId(body.id);
  if (!id.ok) {
    return NextResponse.json({ error: id.error }, { status: 400 });
  }

  const quantityAdded = Number(body.quantityAdded);
  if (!Number.isInteger(quantityAdded) || quantityAdded < 1 || quantityAdded > 9999) {
    return NextResponse.json({ error: "How many did you add? Use a whole number of 1 or more." }, { status: 400 });
  }

  const batchCost = Number(body.batchCost);
  if (!Number.isFinite(batchCost) || batchCost < 0) {
    return NextResponse.json({ error: "Batch cost must be 0 or more." }, { status: 400 });
  }

  const product = await getProduct(id.value);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const oldQty = product.quantity;
  const oldCost = product.cost || 0;
  const newQty = oldQty + quantityAdded;

  // Weighted-average unit cost: (existing inventory value + new batch cost) / total units
  const newCost =
    newQty > 0
      ? Math.round(((oldQty * oldCost + batchCost) / newQty) * 100) / 100
      : oldCost;

  const updated = { ...product, quantity: newQty, cost: newCost };
  await saveProduct(updated);

  return NextResponse.json({
    product: updated,
    summary: {
      oldQty,
      oldCost,
      newQty,
      newCost,
      quantityAdded,
      batchCost,
      costDelta: Math.round((newCost - oldCost) * 100) / 100,
    },
  });
}
