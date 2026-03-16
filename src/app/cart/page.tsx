"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCart } from "@/components/CartProvider";

type CheckoutIssue = {
  productId: string;
  reason: string;
};

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<CheckoutIssue[]>([]);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    setError(null);
    setIssues([]);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string; issues?: CheckoutIssue[]; order?: { id: string } }
        | null;

      if (!res.ok) {
        setError(data?.error ?? "Could not place your order. Please try again.");
        setIssues(data?.issues ?? []);
        setLoading(false);
        return;
      }

      clearCart();
      setSubmitted(true);
    } catch {
      setError("Could not place your order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-pink-bold mb-4">Order Placed!</h1>
          <p className="text-caramel mb-6">
            Thanks, {name}! Your order has been submitted. Pay with cash when you pick up.
          </p>
          <Link
            href="/"
            className="inline-block bg-pink-bold text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-mid transition-colors"
          >
            Back to Store
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-pink-bold mb-6">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-caramel text-lg mb-4">Your cart is empty</p>
            <Link
              href="/"
              className="inline-block bg-pink-bold text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-mid transition-colors"
            >
              Browse Items
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="bg-white rounded-xl p-4 flex items-center gap-4 border-2 border-pink-light"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-peach flex items-center justify-center text-2xl">
                      🍡
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-chocolate">{item.name}</h3>
                    <p className="text-pink-bold font-semibold">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-pink-light text-pink-bold font-bold hover:bg-pink-mid hover:text-white transition-colors"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-pink-light text-pink-bold font-bold hover:bg-pink-mid hover:text-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-caramel hover:text-pink-bold transition-colors ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-pink-light mb-6">
              <div className="flex justify-between text-xl font-bold text-chocolate">
                <span>Total</span>
                <span className="text-pink-bold">${total.toFixed(2)}</span>
              </div>
              <p className="text-sm text-caramel mt-1">Pay with cash at pickup</p>
            </div>

            <form onSubmit={handleCheckout} className="bg-white rounded-xl p-6 border-2 border-pink-light space-y-4">
              <h2 className="text-xl font-bold text-chocolate">Checkout</h2>

              {error && (
                <div className="rounded-xl border border-pink-bold/30 bg-peach/60 p-3 text-sm text-pink-bold space-y-2">
                  <p>{error}</p>
                  {issues.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1">
                      {issues.map((issue) => {
                        const productName = items.find((item) => item.productId === issue.productId)?.name;
                        return (
                          <li key={`${issue.productId}-${issue.reason}`}>
                            {productName ?? "Item"}: {issue.reason}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-caramel mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-caramel mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-mint-bold text-white py-3 rounded-full font-bold text-lg hover:bg-mint-bold/80 transition-colors active:scale-95 disabled:opacity-50"
              >
                {loading ? "Placing Order..." : "Place Order"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
