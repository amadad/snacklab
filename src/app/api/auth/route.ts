import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  createAdminSessionToken,
  getConfiguredAdminPassword,
  getConfiguredOwnerCodes,
  getConfiguredSellerCodes,
  getSessionInfo,
  isAdminAuthenticatedForRequest,
  setAdminSessionCookie,
  ADMIN_SESSION_COOKIE,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authenticated = await isAdminAuthenticatedForRequest(req);
  if (!authenticated) return NextResponse.json({ authenticated: false });
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { seller, role } = await getSessionInfo(token);
  return NextResponse.json({ authenticated: true, seller, role });
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
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  // Check if this is an owner code
  const ownerCodes = await getConfiguredOwnerCodes();
  if (ownerCodes && ownerCodes.includes(sellerInput)) {
    const token = await createAdminSessionToken(adminPassword, sellerInput, "owner");
    const response = NextResponse.json({ ok: true, seller: sellerInput, role: "owner" });
    setAdminSessionCookie(response, token);
    return response;
  }

  // Validate seller code
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
  const token = await createAdminSessionToken(adminPassword, seller, "seller");
  const response = NextResponse.json({ ok: true, seller, role: "seller" });
  setAdminSessionCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
