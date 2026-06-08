import Image from "next/image";
import type { PublicProduct } from "@/lib/product";
import { specCode } from "@/lib/product";

type Variant = "in-stock" | "sold-out" | "unavailable" | "coming-soon";

type Props = {
  product: PublicProduct;
  variant: Variant;
  /** For in-stock: animation stagger index */
  index?: number;
  /** For in-stock: quantity already in cart */
  inCart?: number;
  /** For in-stock: just-added animation active */
  justAdded?: boolean;
  /** For in-stock: add to cart handler */
  onAdd?: (p: PublicProduct) => void;
};

const statusTag: Record<Exclude<Variant, "in-stock">, string> = {
  "sold-out": "Out of stock",
  unavailable: "Off-shelf",
  "coming-soon": "Inbound",
};

function ImageWell({
  product: p,
  dim,
}: {
  product: PublicProduct;
  dim?: boolean;
}) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[2px] border border-line bg-paper">
      {p.image ? (
        <Image
          src={p.image}
          alt={p.name}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          className={`object-cover transition-transform duration-300 ${dim ? "grayscale" : ""}`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="lab-label text-faint">No image</span>
        </div>
      )}
    </div>
  );
}

export default function ProductCard({
  product: p,
  variant,
  index = 0,
  inCart = 0,
  justAdded = false,
  onAdd,
}: Props) {
  const dim = variant !== "in-stock";
  const atMax = inCart >= p.quantity;
  const lowStock = p.quantity <= 3 && p.quantity > 0;

  return (
    <article
      className={`lab-card ${variant === "in-stock" ? "lab-card-interactive animate-fade-in-up" : ""} group flex flex-col ${
        dim ? "opacity-70" : ""
      }`}
      style={variant === "in-stock" ? { animationDelay: `${Math.min(index, 8) * 45}ms` } : undefined}
    >
      {/* Header strip: spec code · tag · price */}
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="lab-label truncate">{specCode(p.id)}</span>
        <div className="flex items-center gap-1.5">
          {variant === "in-stock" && p.hot && <span className="lab-tag lab-tag-accent">Hot</span>}
          {variant !== "in-stock" && (
            <span className={`lab-tag ${variant === "unavailable" ? "lab-tag-hazard" : ""}`}>
              {statusTag[variant]}
            </span>
          )}
          <span className="lab-mono text-sm font-bold text-ink">${p.price.toFixed(2)}</span>
        </div>
      </header>

      <div className="p-3">
        <ImageWell product={p} dim={dim} />

        <h2 className="mt-3 font-semibold leading-tight text-ink">{p.name}</h2>
        {p.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>
        )}
      </div>

      {/* Footer: stock readout + action */}
      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-line px-3 py-2.5">
        {variant === "in-stock" ? (
          <span
            className={`lab-mono text-xs ${lowStock ? "text-hazard" : "text-muted"}`}
            aria-live="polite"
          >
            {lowStock ? `Only ${p.quantity} left` : `${p.quantity} in stock`}
          </span>
        ) : (
          <span className="lab-label">{statusTag[variant]}</span>
        )}

        {variant === "in-stock" && onAdd ? (
          <button
            onClick={() => onAdd(p)}
            disabled={atMax}
            className={`lab-btn ${justAdded ? "lab-btn-primary !bg-reagent !text-ink" : "lab-btn-primary"} !py-1.5`}
          >
            {justAdded ? "Added ✓" : atMax ? `Max [${inCart}]` : "+ Add"}
          </button>
        ) : null}
      </footer>
    </article>
  );
}
