"use client";

import { useEffect, useRef, useState } from "react";

export default function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1.5 grid h-4 w-4 place-items-center rounded-full border border-line-strong bg-paper text-[10px] font-bold text-muted transition-colors hover:bg-ink hover:text-paper"
        aria-label="More info"
      >
        ?
      </button>
      {open && (
        <div className="lab-mono absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-[2px] border border-ink bg-ink px-3 py-2 text-xs leading-relaxed text-paper shadow-lg">
          {text}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
        </div>
      )}
    </div>
  );
}
