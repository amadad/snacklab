import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "snacklab_admin";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

type AdminSessionPayload = {
  exp: number;
  seller?: string;
  role?: "owner" | "seller";
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getCookieOptions(maxAge = ADMIN_SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

async function signValue(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(signature).toString("base64url");
}

function constantTimeEqual(a: string, b: string) {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    mismatch |= aBytes[i] ^ bBytes[i];
  }

  return mismatch === 0;
}

export async function getConfiguredAdminPassword() {
  const { env } = await getCloudflareContext({ async: true });
  const password = env.ADMIN_PASSWORD?.trim();
  return password ? password : null;
}

export async function createAdminSessionToken(secret: string, seller?: string, role?: "owner" | "seller") {
  const payload = encodeBase64Url(
    JSON.stringify({ exp: Date.now() + ADMIN_SESSION_MAX_AGE * 1000, seller, role } satisfies AdminSessionPayload)
  );
  const signature = await signValue(secret, payload);
  return `${payload}.${signature}`;
}

export function parseSessionPayload(token: string | undefined): Partial<AdminSessionPayload> {
  if (!token) return {};
  const [payload] = token.split(".");
  if (!payload) return {};
  try {
    return JSON.parse(decodeBase64Url(payload)) as Partial<AdminSessionPayload>;
  } catch {
    return {};
  }
}

export async function getSellerFromToken(token: string | undefined, secret: string): Promise<string | undefined> {
  return parseSessionPayload(token).seller;
}

export async function getSessionInfo(token: string | undefined): Promise<{ seller?: string; role?: "owner" | "seller" }> {
  const p = parseSessionPayload(token);
  return { seller: p.seller, role: p.role };
}

export async function getConfiguredSellerCodes() {
  const { env } = await getCloudflareContext({ async: true });
  const raw = (env as unknown as Record<string, string | undefined>).SELLER_CODES?.trim();
  if (!raw) return null;
  return raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
}

export async function getConfiguredOwnerCodes() {
  const { env } = await getCloudflareContext({ async: true });
  const raw = (env as unknown as Record<string, string | undefined>).OWNER_CODES?.trim();
  if (!raw) return null;
  return raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
}

export async function getConfiguredPlatformFee() {
  const { env } = await getCloudflareContext({ async: true });
  const raw = (env as unknown as Record<string, string | undefined>).PLATFORM_FEE_PCT?.trim();
  const pct = raw ? parseFloat(raw) : NaN;
  return isNaN(pct) ? 20 : pct; // default 20%
}

export async function getConfiguredDefaultSeller() {
  const { env } = await getCloudflareContext({ async: true });
  const raw = (env as unknown as Record<string, string | undefined>).DEFAULT_SELLER?.trim();
  return raw ? raw.toUpperCase() : null;
}

export async function verifyAdminSessionToken(token: string | undefined, secret: string) {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = await signValue(secret, payload);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as Partial<AdminSessionPayload>;
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(cookieValue?: string) {
  const adminPassword = await getConfiguredAdminPassword();
  if (!adminPassword) {
    return false;
  }

  return verifyAdminSessionToken(cookieValue, adminPassword);
}

export async function isAdminAuthenticatedForRequest(req: NextRequest) {
  return isAdminAuthenticated(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function isAdminAuthenticatedForCurrentRequest() {
  const cookieStore = await cookies();
  return isAdminAuthenticated(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminRequest(req: NextRequest) {
  const authed = await isAdminAuthenticatedForRequest(req);
  if (authed) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, getCookieOptions());
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", getCookieOptions(0));
}
