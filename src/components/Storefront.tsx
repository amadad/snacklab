"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/components/CartProvider";
import type { Product } from "@/lib/types";

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

export default function Storefront({ initialProducts }: { initialProducts: Product[] }) {
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>(emptyRequestForm);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { addItem, items } = useCart();

  const inStock = initialProducts.filter((p) => p.quantity > 0 && !p.missing && !p.stolen && !p.comingSoon);
  const soldOut = initialProducts.filter((p) => p.quantity === 0 && !p.missing && !p.stolen && !p.comingSoon);
  const unavailable = initialProducts.filter((p) => p.missing || p.stolen);
  const comingSoon = initialProducts.filter((p) => p.comingSoon);

  function handleAdd(p: Product) {
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
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1">
        <h1 className="text-4xl font-bold text-center text-pink-bold mb-2">Welcome to Snack Lab!</h1>
        <p className="text-center text-caramel mb-8">Browse our yummy selection</p>

        {inStock.length === 0 && soldOut.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍬</div>
            <p className="text-caramel/70 text-lg">No items yet — check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
            {soldOut.map((p) => (
              <ProductCard key={p.id} product={p} variant="sold-out" />
            ))}
            {unavailable.map((p) => (
              <ProductCard key={p.id} product={p} variant="unavailable" />
            ))}
            {comingSoon.map((p) => (
              <ProductCard key={p.id} product={p} variant="coming-soon" />
            ))}
          </div>
        )}

        <div className="mt-16 border-t-2 border-pink-light pt-10">
          <div className="text-center mb-4">
            <p className="text-caramel text-sm">Don&apos;t see what you want?</p>
            <button
              onClick={() => {
                setShowRequest(!showRequest);
                setRequestError(null);
              }}
              className="mt-2 text-pink-bold font-semibold hover:underline text-sm focus:outline-none focus:ring-2 focus:ring-pink-bold/40 rounded"
            >
              {showRequest ? "Never mind" : "Request an item →"}
            </button>
          </div>

          {showRequest && (
            <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-pink-light p-6">
              {requestSent ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🙏</div>
                  <p className="font-bold text-chocolate">Got it! We&apos;ll see what we can do.</p>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-3">
                  <h3 className="font-bold text-chocolate text-lg">Request an Item</h3>
                  <div>
                    <label htmlFor="req-name" className="block text-xs font-semibold text-caramel mb-1">Your Name</label>
                    <input
                      id="req-name"
                      type="text"
                      required
                      value={requestForm.name}
                      onChange={(e) => setRequestForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-email" className="block text-xs font-semibold text-caramel mb-1">Email</label>
                    <input
                      id="req-email"
                      type="email"
                      required
                      value={requestForm.email}
                      onChange={(e) => setRequestForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-item" className="block text-xs font-semibold text-caramel mb-1">What do you want?</label>
                    <input
                      id="req-item"
                      type="text"
                      required
                      value={requestForm.item}
                      onChange={(e) => setRequestForm((f) => ({ ...f, item: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
                      placeholder="e.g. Takis, Sour Patch Kids..."
                    />
                  </div>
                  <div>
                    <label htmlFor="req-note" className="block text-xs font-semibold text-caramel mb-1">Anything else? (optional)</label>
                    <textarea
                      id="req-note"
                      value={requestForm.note}
                      onChange={(e) => setRequestForm((f) => ({ ...f, note: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
                      rows={2}
                      placeholder="How much would you pay? Any other notes?"
                    />
                  </div>
                  {requestError && <p role="alert" className="text-sm text-pink-bold">{requestError}</p>}
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="w-full bg-pink-bold text-white py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-pink-bold/40"
                  >
                    {submittingRequest ? "Sending..." : "Send Request"}
                  </button>
                </form>
              )}
            </div>
          )}

          <p className="text-center text-xs text-caramel/50 mt-8">
            Snack Lab is a student-run store. All sales are final. Pay with cash when your order is
            handed off. Questions? Find us at lunch.
          </p>
        </div>
      </main>

      <footer className="border-t border-pink-light/60 px-6 py-4 flex items-center justify-between text-sm text-caramel/60">
        <span>Snack Lab</span>
        <Link href="/admin" className="hover:text-caramel transition-colors">
          Admin
        </Link>
      </footer>
    </div>
  );
}
