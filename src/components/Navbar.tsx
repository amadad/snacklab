"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";

export default function Navbar() {
  const { count, total } = useCart();
  const [bounce, setBounce] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 350);
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <nav className="sticky top-0 z-50 bg-pink-light/90 backdrop-blur-sm border-b-2 border-pink-mid px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-2xl font-bold text-pink-bold hover:scale-105 transition-transform">
        Snack Lab
      </Link>
      <Link
        href="/cart"
        className="relative bg-pink-bold text-white px-4 py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors"
      >
        Cart
        {count > 0 && (
          <>
            <span className="ml-1 text-white/80 text-sm">
              ${total.toFixed(2)}
            </span>
            <span
              className={`absolute -top-2 -right-2 bg-mint-bold text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                bounce ? "animate-badge-pop" : ""
              }`}
            >
              {count}
            </span>
          </>
        )}
      </Link>
    </nav>
  );
}
