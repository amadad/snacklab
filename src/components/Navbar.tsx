"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";

export default function Navbar() {
  const { count, total } = useCart();
  const [bounce, setBounce] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count <= prevCount.current) {
      prevCount.current = count;
      return;
    }
    prevCount.current = count;
    const t = setTimeout(() => setBounce(true), 0);
    const t2 = setTimeout(() => setBounce(false), 320);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [count]);

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="lab-mono text-base font-bold tracking-[0.18em] text-ink uppercase">
            Snack<span className="text-reagent-deep">·</span>Lab
          </span>
          <span className="lab-label hidden sm:inline group-hover:text-ink transition-colors">
            / inventory
          </span>
        </Link>

        <Link
          href="/cart"
          className="lab-btn lab-btn-ghost relative !py-1.5 !px-3"
          aria-label={`Cart: ${count} item${count === 1 ? "" : "s"}, $${total.toFixed(2)}`}
        >
          <span>Cart</span>
          <span className="text-faint">[{count}]</span>
          {count > 0 && <span className="text-ink">${total.toFixed(2)}</span>}
          {count > 0 && (
            <span
              className={`absolute -top-2 -right-2 grid h-4 w-4 place-items-center rounded-full border border-ink bg-reagent text-[10px] font-bold leading-none text-ink ${
                bounce ? "animate-badge-pop" : ""
              }`}
            >
              {count}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
