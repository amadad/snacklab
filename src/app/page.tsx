import Storefront from "@/components/Storefront";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const products = await getProducts();
  return <Storefront initialProducts={products} />;
}
