"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/components/CartProvider";
import type { PublicProduct } from "@/lib/product";

type RequestFormState = {
  name: string;
  email: string;
  item: string;
  note: string;
};

const emptyRequestForm: RequestFormState = {
  name: "",
  email: "",
  item: "",
  note: "",
};

export default function Storefront({ initialProducts }: { initialProducts: PublicProduct[] }) {
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>(emptyRequestForm);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [showOffShelf, setShowOffShelf] = useState(false);
  const { addItem, items } = useCart();

  const inStock = initialProducts.filter((p) => p.quantity > 0 && !p.missing && !p.stolen && !p.comingSoon);
  const soldOut = initialProducts.filter((p) => p.quantity === 0 && !p.missing && !p.stolen && !p.comingSoon);
  const unavailable = initialProducts.filter((p) => p.missing || p.stolen);
  const comingSoon = initialProducts.filter((p) => p.comingSoon);

  // Everything a customer can't buy right now, collapsed under one section.
  const offShelf = [
    ...soldOut.map((p) => ({ p, variant: "sold-out" as const })),
    ...unavailable.map((p) => ({ p, variant: "unavailable" as const })),
    ...comingSoon.map((p) => ({ p, variant: "coming-soon" as const })),
  ];

  function handleAdd(p: PublicProduct) {
    const inCart = items.find((i) => i.productId === p.id)?.quantity ?? 0;
    if (inCart >= p.quantity) return;

    addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      maxQuantity: p.quantity,
    });
    setAddedIds((prev) => new Set(prev).add(p.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }, 1200);
  }

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingRequest(true);
    setRequestError(null);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Could not send your request.");
      }

      setRequestSent(true);
      setRequestForm(emptyRequestForm);
      setTimeout(() => {
        setRequestSent(false);
        setShowRequest(false);
      }, 3000);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setSubmittingRequest(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        <h1 className="sr-only">Snack Lab</h1>

        {initialProducts.length === 0 ? (
          <div className="lab-panel grid place-items-center px-6 py-20 text-center">
            <p className="lab-label mb-2">No specimens on record</p>
            <p className="text-sm text-muted">The shelf is empty — check back soon.</p>
          </div>
        ) : (
          <>
            {inStock.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {inStock.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    variant="in-stock"
                    index={i}
                    inCart={items.find((it) => it.productId === p.id)?.quantity ?? 0}
                    justAdded={addedIds.has(p.id)}
                    onAdd={handleAdd}
                  />
                ))}
              </div>
            ) : (
              <div className="lab-panel px-6 py-10 text-center">
                <p className="lab-label mb-1">Nothing on the shelf right now</p>
                <p className="text-sm text-muted">Everything&apos;s off-shelf — expand below or file a request.</p>
              </div>
            )}

            {offShelf.length > 0 && (
              <section className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowOffShelf((v) => !v)}
                  aria-expanded={showOffShelf}
                  aria-controls="off-shelf-grid"
                  className="flex w-full items-center justify-between border-y border-line py-3 text-left transition-colors hover:bg-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-reagent-deep"
                >
                  <span className="lab-label">Off shelf [{offShelf.length}]</span>
                  <span className="lab-mono text-sm text-muted">{showOffShelf ? "[ − ]" : "[ + ]"}</span>
                </button>
                {showOffShelf && (
                  <div
                    id="off-shelf-grid"
                    className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 md:grid-cols-3 animate-fade-in-up"
                  >
                    {offShelf.map(({ p, variant }) => (
                      <ProductCard key={p.id} product={p} variant={variant} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Request bench */}
        <section className="mt-14 border-t border-line pt-8">
          <div className="flex items-center justify-between gap-4">
            <p className="lab-label">Specimen not listed?</p>
            <button
              onClick={() => {
                setShowRequest(!showRequest);
                setRequestError(null);
              }}
              className="lab-btn lab-btn-ghost !py-1.5"
            >
              {showRequest ? "Cancel" : "File a request →"}
            </button>
          </div>

          {showRequest && (
            <div className="lab-panel mt-4 max-w-md p-5 animate-fade-in-up">
              {requestSent ? (
                <div className="py-4 text-center">
                  <p className="lab-label mb-1 text-reagent-deep">Request logged</p>
                  <p className="font-semibold text-ink">Got it — we&apos;ll see what we can source.</p>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-3">
                  <h3 className="lab-mono text-sm font-bold uppercase tracking-[0.1em] text-ink">
                    Request form
                  </h3>
                  <div>
                    <label htmlFor="req-name" className="lab-label mb-1 block">Your name</label>
                    <input
                      id="req-name"
                      type="text"
                      required
                      value={requestForm.name}
                      onChange={(e) => setRequestForm((f) => ({ ...f, name: e.target.value }))}
                      className="lab-field"
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-email" className="lab-label mb-1 block">Email</label>
                    <input
                      id="req-email"
                      type="email"
                      required
                      value={requestForm.email}
                      onChange={(e) => setRequestForm((f) => ({ ...f, email: e.target.value }))}
                      className="lab-field"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-item" className="lab-label mb-1 block">What do you want?</label>
                    <input
                      id="req-item"
                      type="text"
                      required
                      value={requestForm.item}
                      onChange={(e) => setRequestForm((f) => ({ ...f, item: e.target.value }))}
                      className="lab-field"
                      placeholder="e.g. Takis, Sour Patch Kids…"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-note" className="lab-label mb-1 block">Notes (optional)</label>
                    <textarea
                      id="req-note"
                      value={requestForm.note}
                      onChange={(e) => setRequestForm((f) => ({ ...f, note: e.target.value }))}
                      className="lab-field"
                      rows={2}
                      placeholder="How much would you pay? Anything else?"
                    />
                  </div>
                  {requestError && (
                    <p role="alert" className="lab-mono text-sm text-hazard">
                      {requestError}
                    </p>
                  )}
                  <button type="submit" disabled={submittingRequest} className="lab-btn lab-btn-primary w-full">
                    {submittingRequest ? "Sending…" : "Submit request"}
                  </button>
                </form>
              )}
            </div>
          )}

          <p className="mt-8 max-w-2xl text-xs leading-relaxed text-faint">
            Snack Lab is a student-run store. All sales are final. Pay with cash when your order is
            handed off. Questions? Find us at lunch.
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <span className="lab-label">Snack Lab · est. lunch period</span>
          <Link href="/admin" className="lab-label hover:text-ink transition-colors">
            Admin →
          </Link>
        </div>
      </footer>
    </div>
  );
}
