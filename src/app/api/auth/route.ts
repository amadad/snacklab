import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password: string };
  const { env } = await getCloudflareContext({ async: true });
  const adminPassword = env.ADMIN_PASSWORD || "snacklab";

  if (password === adminPassword) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}
