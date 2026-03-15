import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const { env } = await getCloudflareContext();
  const ext = file.name.split(".").pop() || "jpg";
  const key = `${Date.now().toString(36)}.${ext}`;

  await env.STORE_R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return NextResponse.json({ url: `/api/image/${key}` });
}
