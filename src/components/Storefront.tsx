"use client";

import { useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useCart } from "@/components/CartProvider";
import type { Product } from "@/lib/data";

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
  const { addItem, items } = useCart();

  const inStock = initialProducts.filter((p) => p.quantity > 0 && !p.missing);
  const soldOut = initialProducts.filter((p) => p.quantity === 0 && !p.missing);
  const missing = initialProducts.filter((p) => p.missing);

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
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-pink-bold mb-2">Welcome to Snack Lab!</h1>
        <p className="text-center text-caramel mb-8">Browse our yummy selection</p>

        {inStock.length === 0 && soldOut.length === 0 ? (
          <p className="text-center text-caramel/70 text-lg mt-20">No items yet — check back soon!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {inStock.map((p) => {
              const lowStock = p.quantity <= 3;
              const inCart = items.find((i) => i.productId === p.id)?.quantity ?? 0;
              const atMax = inCart >= p.quantity;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden border-2 border-pink-light hover:border-pink-mid hover:shadow-lg transition-all hover:-translate-y-1 relative"
                >
                  {p.hot && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1">
                      🔥 Hot
                    </div>
                  )}
                  {p.image ? (
                    <div className="relative w-full h-48">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-peach flex items-center justify-center text-4xl">🍡</div>
                  )}
                  <div className="p-4">
                    <h2 className="font-bold text-lg text-chocolate">{p.name}</h2>
                    {p.description && <p className="text-sm text-caramel mt-1">{p.description}</p>}
                    <div className="flex items-center justify-between mt-3 gap-4">
                      <span className="text-pink-bold font-bold text-lg">${p.price.toFixed(2)}</span>
                      <span className={`text-xs font-semibold ${lowStock ? "text-orange-500" : "text-caramel"}`}>
                        {lowStock ? `⚡ Only ${p.quantity} left!` : `${p.quantity} left`}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        !atMax &&
                        addItem({
                          productId: p.id,
                          name: p.name,
                          price: p.price,
                          image: p.image,
                          maxQuantity: p.quantity,
                        })
                      }
                      disabled={atMax}
                      className={`mt-3 w-full py-2 rounded-full font-semibold transition-colors active:scale-95 ${
                        atMax
                          ? "bg-caramel/30 text-caramel cursor-not-allowed"
                          : "bg-pink-bold text-white hover:bg-pink-mid"
                      }`}
                    >
                      {atMax ? `Max in cart (${inCart})` : "Add to Cart"}
                    </button>
                  </div>
                </div>
              );
            })}

            {soldOut.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-pink-light/40 opacity-60"
              >
                {p.image ? (
                  <div className="relative w-full h-48">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover grayscale"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-peach/50 flex items-center justify-center text-4xl grayscale">🍡</div>
                )}
                <div className="p-4">
                  <h2 className="font-bold text-lg text-chocolate/60">{p.name}</h2>
                  {p.description && <p className="text-sm text-caramel/60 mt-1">{p.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-pink-bold/60 font-bold text-lg">${p.price.toFixed(2)}</span>
                    <span className="text-xs font-semibold text-caramel/60">Sold out</span>
                  </div>
                  <div className="mt-3 w-full bg-caramel/20 text-caramel/60 py-2 rounded-full font-semibold text-center text-sm">
                    Sold Out
                  </div>
                </div>
              </div>
            ))}

            {missing.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-yellow-200/60 opacity-50"
              >
                {p.image ? (
                  <div className="relative w-full h-48">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover grayscale"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-yellow-50 flex items-center justify-center text-4xl">❓</div>
                )}
                <div className="p-4">
                  <h2 className="font-bold text-lg text-chocolate/50">{p.name}</h2>
                  {p.description && <p className="text-sm text-caramel/50 mt-1">{p.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-pink-bold/50 font-bold text-lg">${p.price.toFixed(2)}</span>
                  </div>
                  <div className="mt-3 w-full bg-yellow-100 text-yellow-700 py-2 rounded-full font-semibold text-center text-sm">
                    Temporarily Unavailable
                  </div>
                </div>
              </div>
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
              className="mt-2 text-pink-bold font-semibold hover:underline text-sm"
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
                    <label className="block text-xs font-semibold text-caramel mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={requestForm.name}
                      onChange={(e) => setRequestForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none"
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-caramel mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={requestForm.email}
                      onChange={(e) => setRequestForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-caramel mb-1">What do you want?</label>
                    <input
                      type="text"
                      required
                      value={requestForm.item}
                      onChange={(e) => setRequestForm((f) => ({ ...f, item: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none"
                      placeholder="e.g. Takis, Sour Patch Kids..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-caramel mb-1">Anything else? (optional)</label>
                    <textarea
                      value={requestForm.note}
                      onChange={(e) => setRequestForm((f) => ({ ...f, note: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none"
                      rows={2}
                      placeholder="How much would you pay? Any other notes?"
                    />
                  </div>
                  {requestError && <p className="text-sm text-pink-bold">{requestError}</p>}
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="w-full bg-pink-bold text-white py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors disabled:opacity-60"
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
    </div>
  );
}
