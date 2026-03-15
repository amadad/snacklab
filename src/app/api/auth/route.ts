import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password: string };
  const { env } = await getCloudflareContext();
  const adminPassword = env.ADMIN_PASSWORD || "snacklab";

  if (password === adminPassword) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}
