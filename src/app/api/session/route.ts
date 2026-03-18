import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredDefaultSeller,
  getConfiguredPlatformFee,
  getSessionInfo,
  isAdminAuthenticatedForRequest,
  ADMIN_SESSION_COOKIE,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authenticated = await isAdminAuthenticatedForRequest(req);
  if (!authenticated) return NextResponse.json({ authenticated: false });

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { seller, role } = await getSessionInfo(token);
  const platformFeePct = await getConfiguredPlatformFee();
  const defaultSeller = await getConfiguredDefaultSeller();

  return NextResponse.json({ authenticated: true, seller, role, platformFeePct, defaultSeller });
}
