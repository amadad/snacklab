"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCart, type CartItem } from "@/components/CartProvider";
import {
  getFulfillmentDescription,
  getFulfillmentFee,
  getFulfillmentLabel,
  getFulfillmentSummary,
  getLocationDetailsLabel,
  getLocationDetailsPlaceholder,
  getTimeSlotOptions,
  needsLocationDetails,
  needsTimeSlot,
  type FulfillmentMethod,
} from "@/lib/fulfillment";

type CheckoutIssue = {
  productId: string;
  reason: string;
};

type SubmittedOrder = {
  name: string;
  items: CartItem[];
  total: number;
  fulfillment: {
    method: FulfillmentMethod;
    timeSlot?: string;
    locationDetails?: string;
  };
};

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>("during-school");
  const [timeSlot, setTimeSlot] = useState("");
  const [locationDetails, setLocationDetails] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<CheckoutIssue[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);

  const fulfillmentNeedsTime = needsTimeSlot(fulfillmentMethod);
  const fulfillmentNeedsLocation = needsLocationDetails(fulfillmentMethod);
  const fulfillmentFee = getFulfillmentFee(fulfillmentMethod);
  const orderTotal = total + fulfillmentFee;

  function updateFulfillmentMethod(method: FulfillmentMethod) {
    setFulfillmentMethod(method);
    setTimeSlot("");
    if (method !== "house-dropoff") {
      setLocationDetails("");
    }
  }

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
          fulfillment: {
            method: fulfillmentMethod,
            timeSlot,
            locationDetails,
          },
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
        setTimeout(() => {
          errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        return;
      }

      setSubmittedOrder({
        name,
        items: [...items],
        total: orderTotal,
        fulfillment: {
          method: fulfillmentMethod,
          timeSlot,
          locationDetails,
        },
      });
      clearCart();
    } catch {
      setError("Could not place your order. Please try again.");
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } finally {
      setLoading(false);
    }
  }

  if (submittedOrder) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4 animate-bounce-in">🎉</div>
          <h1 className="text-3xl font-bold text-pink-bold mb-4 animate-fade-in-up">Order Placed!</h1>
          <p className="text-caramel mb-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            Thanks, {submittedOrder.name}! Your order has been submitted. Pay with cash when you get it.
          </p>
          <p className="text-sm text-caramel/80 mb-2 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            {getFulfillmentSummary(submittedOrder.fulfillment)}
          </p>

          <div
            className="bg-white rounded-xl p-5 border-2 border-pink-light text-left mb-6 animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            <h2 className="font-bold text-chocolate mb-3">Order Summary</h2>
            <div className="space-y-2">
              {submittedOrder.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-chocolate">{item.name} x{item.quantity}</span>
                  <span className="text-caramel">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-pink-light mt-3 pt-2 flex justify-between font-bold">
              <span className="text-chocolate">Total</span>
              <span className="text-pink-bold">${submittedOrder.total.toFixed(2)}</span>
            </div>
          </div>

          <Link
            href="/"
            className="inline-block bg-pink-bold text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-mid transition-colors animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-pink-bold mb-6">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-7xl mb-2">🍡</div>
            <div className="text-3xl mb-4">💤</div>
            <p className="text-caramel text-lg mb-1">Your cart is empty</p>
            <p className="text-caramel/60 text-sm mb-6">Your snacks are waiting for you!</p>
            <Link
              href="/"
              className="inline-block bg-pink-bold text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-mid transition-colors"
            >
              Browse Items
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start">
            {/* Cart items */}
            <div className="space-y-4 mb-8 lg:mb-0">
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-chocolate">{item.name}</h3>
                    <p className="text-pink-bold font-semibold">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-10 h-10 rounded-full bg-pink-light text-pink-bold font-bold hover:bg-pink-mid hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-pink-bold/40"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-10 h-10 rounded-full bg-pink-light text-pink-bold font-bold hover:bg-pink-mid hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-pink-bold/40"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-semibold text-chocolate">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-caramel hover:text-pink-bold transition-colors text-sm focus:outline-none focus:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky summary + checkout */}
            <div className="lg:sticky lg:top-20 space-y-6">
              <div className="bg-white rounded-xl p-6 border-2 border-pink-light space-y-2">
                <div className="flex justify-between text-sm text-caramel">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-caramel">
                  <span>Fulfillment</span>
                  <span>{getFulfillmentLabel(fulfillmentMethod)}</span>
                </div>
                {fulfillmentFee > 0 && (
                  <div className="flex justify-between text-sm text-caramel">
                    <span>Home drop-off fee</span>
                    <span>${fulfillmentFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-chocolate border-t border-pink-light pt-2">
                  <span>Total</span>
                  <span className="text-pink-bold">${orderTotal.toFixed(2)}</span>
                </div>
                <p className="text-sm text-caramel mt-1">Pay with cash when your order is handed off</p>
              </div>

              {error && (
                <div
                  ref={errorRef}
                  className="rounded-xl border border-pink-bold/30 bg-peach/60 p-3 text-sm text-pink-bold space-y-2"
                >
                  <p>{error}</p>
                  {issues.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1">
                      {issues.map((issue) => {
                        const productName = items.find((it) => it.productId === issue.productId)?.name;
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

              <form onSubmit={handleCheckout} className="bg-white rounded-xl p-6 border-2 border-pink-light space-y-4">
                <h2 className="text-xl font-bold text-chocolate">Checkout</h2>

                <div>
                  <label className="block text-sm font-semibold text-caramel mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
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
                    className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-caramel mb-2">How should we get this to you?</label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(["during-school", "after-school", "house-dropoff"] as FulfillmentMethod[]).map((method) => (
                      <label
                        key={method}
                        className={`rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${
                          fulfillmentMethod === method
                            ? "border-pink-bold bg-pink-light/60"
                            : "border-pink-light bg-white hover:border-pink-mid"
                        }`}
                      >
                        <input
                          type="radio"
                          name="fulfillment-method"
                          value={method}
                          checked={fulfillmentMethod === method}
                          onChange={() => updateFulfillmentMethod(method)}
                          className="sr-only"
                        />
                        <span className="block font-semibold text-chocolate">{getFulfillmentLabel(method)}</span>
                        <span className="block text-xs text-caramel mt-1">{getFulfillmentDescription(method)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {fulfillmentNeedsTime && (
                  <div>
                    <label className="block text-sm font-semibold text-caramel mb-1">After-school time slot</label>
                    <select
                      value={timeSlot}
                      required={fulfillmentNeedsTime}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30 bg-white"
                    >
                      <option value="">Choose a time</option>
                      {getTimeSlotOptions(fulfillmentMethod).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {fulfillmentNeedsLocation && (
                  <div>
                    <label className="block text-sm font-semibold text-caramel mb-1">
                      {getLocationDetailsLabel(fulfillmentMethod)}
                    </label>
                    <textarea
                      value={locationDetails}
                      required={fulfillmentNeedsLocation}
                      onChange={(e) => setLocationDetails(e.target.value)}
                      className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
                      rows={2}
                      placeholder={getLocationDetailsPlaceholder(fulfillmentMethod)}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-mint-bold text-white py-3 rounded-full font-bold text-lg hover:bg-mint-bold/80 transition-colors active:scale-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-mint-bold/40"
                >
                  {loading ? "Placing Order..." : "Place Order"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
