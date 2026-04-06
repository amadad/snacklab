import { describe, it, expect } from "vitest";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
  parseSessionPayload,
  getSellerFromToken,
} from "./auth";

const SECRET = "test-secret-key-do-not-use";

// ── createAdminSessionToken + verifyAdminSessionToken ────

describe("session token round-trip", () => {
  it("creates and verifies a valid token", async () => {
    const token = await createAdminSessionToken(SECRET, "ZAIN", "seller");
    const valid = await verifyAdminSessionToken(token, SECRET);
    expect(valid).toBe(true);
  });

  it("embeds seller and role in payload", async () => {
    const token = await createAdminSessionToken(SECRET, "SYRA", "owner");
    const payload = parseSessionPayload(token);
    expect(payload.seller).toBe("SYRA");
    expect(payload.role).toBe("owner");
  });

  it("rejects token signed with different secret", async () => {
    const token = await createAdminSessionToken(SECRET);
    const valid = await verifyAdminSessionToken(token, "wrong-secret");
    expect(valid).toBe(false);
  });

  it("rejects tampered payload", async () => {
    const token = await createAdminSessionToken(SECRET);
    const [, signature] = token.split(".");
    // Swap payload with a different one
    const fake = Buffer.from(JSON.stringify({ exp: Date.now() + 999999999 })).toString("base64url");
    const valid = await verifyAdminSessionToken(`${fake}.${signature}`, SECRET);
    expect(valid).toBe(false);
  });

  it("rejects expired token", async () => {
    // Create token with seller, then manually craft an expired one
    const expiredPayload = Buffer.from(
      JSON.stringify({ exp: Date.now() - 1000, seller: "X" })
    ).toString("base64url");

    // Sign the expired payload with the correct secret
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expiredPayload));
    const signature = Buffer.from(sig).toString("base64url");

    const valid = await verifyAdminSessionToken(`${expiredPayload}.${signature}`, SECRET);
    expect(valid).toBe(false);
  });

  it("rejects undefined token", async () => {
    expect(await verifyAdminSessionToken(undefined, SECRET)).toBe(false);
  });

  it("rejects empty string", async () => {
    expect(await verifyAdminSessionToken("", SECRET)).toBe(false);
  });

  it("rejects token without dot separator", async () => {
    expect(await verifyAdminSessionToken("nodot", SECRET)).toBe(false);
  });
});

// ── parseSessionPayload ──────────────────────────

describe("parseSessionPayload", () => {
  it("parses valid token payload", async () => {
    const token = await createAdminSessionToken(SECRET, "ZAIN", "seller");
    const payload = parseSessionPayload(token);
    expect(payload.seller).toBe("ZAIN");
    expect(payload.role).toBe("seller");
    expect(typeof payload.exp).toBe("number");
  });

  it("returns empty for undefined", () => {
    expect(parseSessionPayload(undefined)).toEqual({});
  });

  it("returns empty for garbage", () => {
    expect(parseSessionPayload("!!!garbage!!!")).toEqual({});
  });

  it("returns empty for empty string", () => {
    expect(parseSessionPayload("")).toEqual({});
  });

  it("handles token without seller", async () => {
    const token = await createAdminSessionToken(SECRET);
    const payload = parseSessionPayload(token);
    expect(payload.seller).toBeUndefined();
  });
});

// ── getSellerFromToken ───────────────────────────

describe("getSellerFromToken", () => {
  it("extracts seller from token", async () => {
    const token = await createAdminSessionToken(SECRET, "ZAIN");
    expect(getSellerFromToken(token)).toBe("ZAIN");
  });

  it("returns undefined for no-seller token", async () => {
    const token = await createAdminSessionToken(SECRET);
    expect(getSellerFromToken(token)).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(getSellerFromToken(undefined)).toBeUndefined();
  });
});
