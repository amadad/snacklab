import Image from "next/image";
import type { Product } from "@/lib/types";

type Variant = "in-stock" | "sold-out" | "unavailable" | "coming-soon";

type Props = {
  product: Product;
  variant: Variant;
  /** For in-stock: animation stagger index */
  index?: number;
  /** For in-stock: quantity already in cart */
  inCart?: number;
  /** For in-stock: just-added animation active */
  justAdded?: boolean;
  /** For in-stock: add to cart handler */
  onAdd?: (p: Product) => void;
};

const variantConfig: Record<Variant, {
  cardClass: string;
  imageClass: string;
  imageFallbackClass: string;
  imageFallbackEmoji: string;
  nameClass: string;
  descClass: string;
  priceClass: string;
  badge?: { bg: string; text: string; label: string };
  statusSlot?: { bg: string; text: string; label: string };
  stockSlot?: boolean;
}> = {
  "in-stock": {
    cardClass: "shadow-md border-pink-light hover:border-pink-mid hover:shadow-lg hover:-translate-y-1 relative animate-fade-in-up",
    imageClass: "object-cover transition-transform duration-300 hover:scale-110",
    imageFallbackClass: "bg-peach",
    imageFallbackEmoji: "🍡",
    nameClass: "text-chocolate",
    descClass: "text-caramel",
    priceClass: "text-pink-bold",
    stockSlot: true,
  },
  "sold-out": {
    cardClass: "shadow-sm border-pink-light/40 opacity-60",
    imageClass: "object-cover grayscale",
    imageFallbackClass: "bg-peach/50 grayscale",
    imageFallbackEmoji: "🍡",
    nameClass: "text-chocolate/60",
    descClass: "text-caramel/60",
    priceClass: "text-pink-bold/60",
    statusSlot: { bg: "bg-caramel/20", text: "text-caramel/60", label: "Sold Out" },
  },
  "unavailable": {
    cardClass: "shadow-sm border-yellow-200/60 opacity-50",
    imageClass: "object-cover grayscale",
    imageFallbackClass: "bg-yellow-50",
    imageFallbackEmoji: "❓",
    nameClass: "text-chocolate/50",
    descClass: "text-caramel/50",
    priceClass: "text-pink-bold/50",
    statusSlot: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Temporarily Unavailable" },
  },
  "coming-soon": {
    cardClass: "shadow-sm border-purple-200/60",
    imageClass: "object-cover opacity-70",
    imageFallbackClass: "bg-purple-50",
    imageFallbackEmoji: "🔜",
    nameClass: "text-chocolate",
    descClass: "text-caramel",
    priceClass: "text-pink-bold",
    badge: { bg: "bg-purple-600", text: "text-white", label: "🔜 Coming Soon" },
    statusSlot: { bg: "bg-purple-100", text: "text-purple-700", label: "Coming Soon" },
  },
};

export default function ProductCard({ product: p, variant, index = 0, inCart = 0, justAdded = false, onAdd }: Props) {
  const c = variantConfig[variant];
  const atMax = inCart >= p.quantity;
  const lowStock = p.quantity <= 3;

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden border-2 transition-all ${c.cardClass}`}
      style={variant === "in-stock" ? { animationDelay: `${index * 80}ms` } : undefined}
    >
      {/* Hot badge (in-stock only) */}
      {variant === "in-stock" && p.hot && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1">
          🔥 Hot
        </div>
      )}

      {/* Coming-soon badge on image */}
      {c.badge && p.image && (
        <div className="relative w-full h-48">
          <Image src={p.image} alt={p.name} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" className={c.imageClass} />
          <div className={`absolute top-2 left-2 ${c.badge.bg} ${c.badge.text} text-xs font-bold px-2 py-1 rounded-full`}>
            {c.badge.label}
          </div>
        </div>
      )}

      {/* Standard image (non-badge variants, or badge variant without image) */}
      {!c.badge && (
        p.image ? (
          <div className={`relative w-full h-48 ${variant === "in-stock" ? "overflow-hidden" : ""}`}>
            <Image src={p.image} alt={p.name} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" className={c.imageClass} />
          </div>
        ) : (
          <div className={`w-full h-48 ${c.imageFallbackClass} flex items-center justify-center text-4xl`}>{c.imageFallbackEmoji}</div>
        )
      )}

      {/* Badge variant without image */}
      {c.badge && !p.image && (
        <div className={`w-full h-48 ${c.imageFallbackClass} flex flex-col items-center justify-center gap-2`}>
          <span className="text-4xl">{c.imageFallbackEmoji}</span>
          <span className="text-xs font-bold text-purple-500">{c.badge.label}</span>
        </div>
      )}

      <div className="p-4">
        <h2 className={`font-bold text-lg ${c.nameClass}`}>{p.name}</h2>
        {p.description && <p className={`text-sm ${c.descClass} mt-1 line-clamp-2`}>{p.description}</p>}
        <div className="flex items-center justify-between mt-3 gap-4">
          <span className={`${c.priceClass} font-bold text-lg`}>${p.price.toFixed(2)}</span>
          {c.stockSlot && (
            lowStock ? (
              <span className="text-xs font-bold text-pink-bold bg-pink-light px-2 py-0.5 rounded-full">
                Only {p.quantity} left!
              </span>
            ) : (
              <span className="text-xs text-caramel">{p.quantity} left</span>
            )
          )}
          {variant === "sold-out" && (
            <span className="text-xs font-semibold text-caramel/60">Sold out</span>
          )}
        </div>

        {/* Action button */}
        {variant === "in-stock" && onAdd && (
          <button
            onClick={() => onAdd(p)}
            disabled={atMax}
            className={`mt-3 w-full py-2 rounded-full font-semibold transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-bold/40 ${
              justAdded
                ? "bg-mint-bold text-white scale-[1.02]"
                : atMax
                  ? "bg-caramel/30 text-caramel cursor-not-allowed"
                  : "bg-pink-bold text-white hover:bg-pink-mid"
            }`}
          >
            {justAdded ? "Added!" : atMax ? `Max in cart (${inCart})` : "Add to Cart"}
          </button>
        )}
        {c.statusSlot && (
          <div className={`mt-3 w-full ${c.statusSlot.bg} ${c.statusSlot.text} py-2 rounded-full font-semibold text-center text-sm`}>
            {c.statusSlot.label}
          </div>
        )}
      </div>
    </div>
  );
}
