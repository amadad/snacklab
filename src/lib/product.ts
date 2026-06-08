import type { Product } from "@/lib/types";

/**
 * The subset of a Product that is safe to expose to customers. Strips the
 * fields that are internal economics / attribution: `cost`, `seller`, and
 * `stolenQty`. Everything kept here already drives the public storefront.
 */
export type PublicProduct = Omit<Product, "cost" | "seller" | "stolenQty">;

export function toPublicProduct(p: Product): PublicProduct {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.image,
    quantity: p.quantity,
    description: p.description,
    hot: p.hot,
    missing: p.missing,
    stolen: p.stolen,
    comingSoon: p.comingSoon,
  };
}

/** Stable, human-readable "specimen" code derived from a product id. */
export function specCode(id: string): string {
  const cleaned = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `SPEC-${cleaned.slice(-4).padStart(4, "0")}`;
}
