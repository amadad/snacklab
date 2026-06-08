import Storefront from "@/components/Storefront";
import { getProducts } from "@/lib/data";
import { toPublicProduct } from "@/lib/product";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const products = await getProducts();
  // Only ship public fields to the client — never cost / seller / stolenQty.
  return <Storefront initialProducts={products.map(toPublicProduct)} />;
}
