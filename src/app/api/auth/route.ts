import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  createAdminSessionToken,
  getConfiguredAdminPassword,
  isAdminAuthenticatedForRequest,
  setAdminSessionCookie,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authenticated = await isAdminAuthenticatedForRequest(req);
  return NextResponse.json({ authenticated });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";
  const adminPassword = await getConfiguredAdminPassword();

  if (!adminPassword) {
    return NextResponse.json(
      { error: "Admin password is not configured in Cloudflare." },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const token = await createAdminSessionToken(adminPassword);
  const response = NextResponse.json({ ok: true });
  setAdminSessionCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
