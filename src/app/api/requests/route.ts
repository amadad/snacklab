import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { genId, getItemRequests, saveItemRequest, type ItemRequest } from "@/lib/data";
import { parseItemRequestInput } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) {
    return unauthorized;
  }

  const requests = await getItemRequests();
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const parsed = parseItemRequestInput(await req.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const itemRequest: ItemRequest = {
    id: genId(),
    ...parsed.value,
    date: new Date().toISOString(),
  };

  await saveItemRequest(itemRequest);
  return NextResponse.json({ ok: true }, { status: 201 });
}
