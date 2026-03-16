import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  createAdminSessionToken,
  getConfiguredAdminPassword,
  getConfiguredSellerCodes,
  isAdminAuthenticatedForRequest,
  setAdminSessionCookie,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authenticated = await isAdminAuthenticatedForRequest(req);
  return NextResponse.json({ authenticated });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { password?: string; seller?: string };
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const sellerInput = typeof body.seller === "string" ? body.seller.trim().toUpperCase() : "";

  const adminPassword = await getConfiguredAdminPassword();
  if (!adminPassword) {
    return NextResponse.json({ error: "Admin password is not configured." }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  // Validate seller code if SELLER_CODES is configured
  const sellerCodes = await getConfiguredSellerCodes();
  if (sellerCodes) {
    if (!sellerInput) {
      return NextResponse.json({ error: "Seller code required." }, { status: 401 });
    }
    if (!sellerCodes.includes(sellerInput)) {
      return NextResponse.json({ error: "Unknown seller code." }, { status: 401 });
    }
  }

  const seller = sellerInput || undefined;
  const token = await createAdminSessionToken(adminPassword, seller);
  const response = NextResponse.json({ ok: true, seller });
  setAdminSessionCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
