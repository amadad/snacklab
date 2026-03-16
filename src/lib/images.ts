import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getProducts } from "@/lib/data";

const MANAGED_IMAGE_PREFIX = "/api/image/";

export function getManagedImageKey(imageUrl: string) {
  if (!imageUrl) {
    return null;
  }

  try {
    const parsed = new URL(imageUrl, "http://localhost");
    if (!parsed.pathname.startsWith(MANAGED_IMAGE_PREFIX)) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(MANAGED_IMAGE_PREFIX.length));
  } catch {
    return null;
  }
}

export async function deleteManagedImageIfUnused(imageUrl: string, excludingProductId?: string) {
  const key = getManagedImageKey(imageUrl);
  if (!key) {
    return;
  }

  const products = await getProducts();
  const stillUsed = products.some(
    (product) => product.id !== excludingProductId && getManagedImageKey(product.image) === key
  );

  if (stillUsed) {
    return;
  }

  const { env } = await getCloudflareContext({ async: true });
  await env.STORE_R2.delete(key);
}
