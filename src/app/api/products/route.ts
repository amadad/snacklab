import { NextRequest, NextResponse } from "next/server";
import { deleteProduct, genId, getProduct, getProducts, saveProduct } from "@/lib/data";
import type { Product } from "@/lib/types";
import { requireAdminRequest, getSessionInfo, ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { deleteManagedImageIfUnused } from "@/lib/images";
import { parseId, parseProductInput } from "@/lib/validation";

async function getSession(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return getSessionInfo(token);
}

export async function GET(req: NextRequest) {
  const products = await getProducts();
  if (req.nextUrl.searchParams.get("scope") !== "admin") {
    return NextResponse.json(products);
  }

  const authenticated = await requireAdminRequest(req);
  if (authenticated) return authenticated;

  const { seller, role } = await getSession(req);
  return NextResponse.json(role === "owner" ? products : products.filter((product) => product.seller === seller));
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) return unauthorized;

  const { seller } = await getSession(req);

  const parsed = parseProductInput(await req.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const product: Product = {
    id: genId(),
    ...parsed.value,
    // Always tag with seller (owners can create too, tagged with their code)
    seller: seller ?? "owner",
  };

  await saveProduct(product);
  return NextResponse.json(product, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) return unauthorized;

  const { seller, role } = await getSession(req);

  const body = (await req.json()) as Record<string, unknown>;
  const id = parseId(body.id);
  if (!id.ok) {
    return NextResponse.json({ error: id.error }, { status: 400 });
  }

  const parsed = parseProductInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await getProduct(id.value);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Sellers can only edit their own products
  if (role === "seller" && existing.seller !== seller) {
    return NextResponse.json({ error: "Not your product." }, { status: 403 });
  }

  const updated: Product = {
    id: id.value,
    ...parsed.value,
    seller: existing.seller ?? seller ?? "owner",
  };

  await saveProduct(updated);

  if (existing.image && existing.image !== updated.image) {
    void deleteManagedImageIfUnused(existing.image, updated.id).catch((e) => console.error("Image cleanup failed:", e));
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) return unauthorized;

  const { seller, role } = await getSession(req);

  const body = (await req.json()) as Record<string, unknown>;
  const id = parseId(body.id);
  if (!id.ok) {
    return NextResponse.json({ error: id.error }, { status: 400 });
  }

  const existing = await getProduct(id.value);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Sellers can only delete their own products
  if (role === "seller" && existing.seller !== seller) {
    return NextResponse.json({ error: "Not your product." }, { status: 403 });
  }

  await deleteProduct(id.value);
  if (existing.image) {
    void deleteManagedImageIfUnused(existing.image, id.value).catch((e) => console.error("Image cleanup failed:", e));
  }

  return NextResponse.json({ ok: true });
}
