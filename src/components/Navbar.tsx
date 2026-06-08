"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";

export default function Navbar() {
  const { count, total } = useCart();
  const [bounce, setBounce] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prevCount = useRef(count);

  // Logo starts large at the top and shrinks into a compact bar on scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    <nav
      className={`sticky top-0 z-50 bg-paper/85 backdrop-blur-sm transition-colors duration-300 ${
        scrolled ? "border-b border-line" : "border-b border-transparent"
      }`}
    >
      <div
        className={`max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${
          scrolled ? "h-14" : "h-24 sm:h-32"
        }`}
      >
        <Link href="/" aria-label="Snack Lab — home" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Snack Lab"
            width={280}
            height={274}
            priority
            className={`w-auto transition-all duration-300 ${scrolled ? "h-10" : "h-20 sm:h-28"}`}
          />
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
