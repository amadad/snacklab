import { NextRequest, NextResponse } from "next/server";
import { getProducts, saveProducts, genId, Product } from "@/lib/data";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Product>;
  const products = await getProducts();
  const product: Product = {
    id: genId(),
    name: body.name ?? "",
    price: Number(body.price),
    image: body.image || "",
    quantity: Number(body.quantity),
    description: body.description || "",
  };
  products.push(product);
  await saveProducts(products);
  return NextResponse.json(product, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Partial<Product> & { id: string };
  const products = await getProducts();
  const idx = products.findIndex((p) => p.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  products[idx] = { ...products[idx], ...body, price: Number(body.price), quantity: Number(body.quantity) };
  await saveProducts(products);
  return NextResponse.json(products[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = (await req.json()) as { id: string };
  const products = (await getProducts()).filter((p) => p.id !== id);
  await saveProducts(products);
  return NextResponse.json({ ok: true });
}
