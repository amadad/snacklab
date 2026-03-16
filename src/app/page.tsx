"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useCart } from "@/components/CartProvider";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  description: string;
  hot?: boolean;
};

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: "", email: "", item: "", note: "" });
  const [requestSent, setRequestSent] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json() as Promise<Product[]>)
      .then(setProducts);
  }, []);

  const inStock = products.filter((p) => p.quantity > 0);
  const soldOut = products.filter((p) => p.quantity === 0);

  function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    // For now just show a thank-you -- could POST to an API route later
    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setShowRequest(false);
      setRequestForm({ name: "", email: "", item: "", note: "" });
    }, 3000);
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-pink-bold mb-2">Welcome to Snack Lab!</h1>
        <p className="text-center text-caramel mb-8">Browse our yummy selection</p>

        {inStock.length === 0 && soldOut.length === 0 ? (
          <p className="text-center text-caramel/70 text-lg mt-20">
            No items yet — check back soon!
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {inStock.map((p) => {
                const lowStock = p.quantity <= 3;
                return (
                  <div key={p.id}
                    className="bg-white rounded-2xl shadow-md overflow-hidden border-2 border-pink-light hover:border-pink-mid hover:shadow-lg transition-all hover:-translate-y-1 relative">
                    {p.hot && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1">
                        🔥 Hot
                      </div>
                    )}
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-peach flex items-center justify-center text-4xl">🍡</div>
                    )}
                    <div className="p-4">
                      <h2 className="font-bold text-lg text-chocolate">{p.name}</h2>
                      {p.description && <p className="text-sm text-caramel mt-1">{p.description}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-pink-bold font-bold text-lg">${p.price.toFixed(2)}</span>
                        <span className={`text-xs font-semibold ${lowStock ? "text-orange-500" : "text-caramel"}`}>
                          {lowStock ? `⚡ Only ${p.quantity} left!` : `${p.quantity} left`}
                        </span>
                      </div>
                      <button
                        onClick={() => addItem({ productId: p.id, name: p.name, price: p.price, image: p.image })}
                        className="mt-3 w-full bg-pink-bold text-white py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors active:scale-95">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}

              {soldOut.map((p) => (
                <div key={p.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-pink-light/40 opacity-60">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-48 object-cover grayscale" />
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
            </div>
          </>
        )}

        {/* Request Form */}
        <div className="mt-16 border-t-2 border-pink-light pt-10">
          <div className="text-center mb-4">
            <p className="text-caramel text-sm">Don&apos;t see what you want?</p>
            <button
              onClick={() => setShowRequest(!showRequest)}
              className="mt-2 text-pink-bold font-semibold hover:underline text-sm">
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
                    <input type="text" required value={requestForm.name}
                      onChange={(e) => setRequestForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none"
                      placeholder="Name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-caramel mb-1">What do you want?</label>
                    <input type="text" required value={requestForm.item}
                      onChange={(e) => setRequestForm((f) => ({ ...f, item: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none"
                      placeholder="e.g. Takis, Sour Patch Kids..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-caramel mb-1">Anything else? (optional)</label>
                    <textarea value={requestForm.note}
                      onChange={(e) => setRequestForm((f) => ({ ...f, note: e.target.value }))}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm focus:border-pink-bold focus:outline-none"
                      rows={2} placeholder="How much would you pay? Any other notes?" />
                  </div>
                  <button type="submit"
                    className="w-full bg-pink-bold text-white py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors">
                    Send Request
                  </button>
                </form>
              )}
            </div>
          )}

          <p className="text-center text-xs text-caramel/50 mt-8">
            Snack Lab is a student-run store. All sales are final. Pay with cash at pickup.
            Questions? Find us at lunch.
          </p>
        </div>
      </main>
    </div>
  );
}
