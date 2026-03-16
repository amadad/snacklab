import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdminRequest } from "@/lib/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminRequest(req);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (!(file.type in ALLOWED_TYPES)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WEBP, and GIF images are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Images must be 5MB or smaller." }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const key = `${crypto.randomUUID()}.${ALLOWED_TYPES[file.type]}`;

  await env.STORE_R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return NextResponse.json({ url: `/api/image/${key}` });
}
