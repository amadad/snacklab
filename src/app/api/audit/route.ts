import { NextRequest, NextResponse } from "next/server";
import { getAuditLog } from "@/lib/data";
import { requireAdminRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) return unauthorized;

  const orderId = req.nextUrl.searchParams.get("orderId") ?? undefined;
  const entries = await getAuditLog(orderId);
  return NextResponse.json(entries);
}
