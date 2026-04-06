import { NextRequest, NextResponse } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  // Browsers send Origin on cross-origin requests. Non-browser clients
  // (curl, Postman, server-to-server) omit it entirely, so we allow
  // those through — API auth (session cookies) still protects mutations.
  // This only blocks browser-based CSRF (e.g. malicious page POSTing).
  if (!origin) return true;
  const url = new URL(request.url);
  return origin === url.origin;
}

export function middleware(request: NextRequest) {
  // Block cross-origin mutations (CSRF protection)
  if (MUTATION_METHODS.has(request.method) && !isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'"
  );

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
