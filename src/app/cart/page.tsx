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
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-16">
          <div className="lab-panel p-6 text-center animate-fade-in-up">
            <p className="lab-label mb-2 text-reagent-deep">Order logged ✓</p>
            <h1 className="lab-mono text-2xl font-bold uppercase tracking-[0.08em] text-ink">
              Reserved
            </h1>
            <p className="mt-2 text-sm text-muted">
              Thanks, {submittedOrder.name}. Pay with cash when you collect.
            </p>
            <p className="lab-mono mt-1 text-xs text-faint">
              {getFulfillmentSummary(submittedOrder.fulfillment)}
            </p>

            <div className="mt-6 border-t border-line pt-4 text-left">
              <p className="lab-label mb-3">Manifest</p>
              <div className="space-y-2">
                {submittedOrder.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-ink">
                      {item.name} <span className="lab-mono text-faint">×{item.quantity}</span>
                    </span>
                    <span className="lab-mono text-muted">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-line pt-3">
                <span className="lab-label">Total due</span>
                <span className="lab-mono text-lg font-bold text-ink">
                  ${submittedOrder.total.toFixed(2)}
                </span>
              </div>
            </div>

            <Link href="/" className="lab-btn lab-btn-primary mt-6 w-full">
              ← Back to shelf
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6 flex items-end justify-between">
          <h1 className="lab-mono text-2xl font-bold uppercase tracking-[0.08em] text-ink">Cart</h1>
          <span className="lab-label">
            {items.length} line{items.length === 1 ? "" : "s"}
          </span>
        </header>

        {items.length === 0 ? (
          <div className="lab-panel grid place-items-center px-6 py-16 text-center">
            <p className="lab-label mb-2">Cart empty — 0 specimens</p>
            <p className="text-sm text-muted mb-6">Nothing reserved yet.</p>
            <Link href="/" className="lab-btn lab-btn-primary">
              Browse shelf
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start">
            {/* Cart line items */}
            <div className="space-y-3 mb-6 lg:mb-0">
              {items.map((item) => (
                <div key={item.productId} className="lab-panel flex items-center gap-4 p-3">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-14 w-14 rounded-[2px] border border-line object-cover"
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-[2px] border border-line bg-paper">
                      <span className="lab-label text-faint">—</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-ink">{item.name}</h3>
                    <p className="lab-mono text-sm text-muted">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center border border-line-strong rounded-[2px]">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="lab-mono h-9 w-9 text-ink hover:bg-ink hover:text-paper transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-reagent-deep"
                    >
                      −
                    </button>
                    <span
                      className="lab-mono w-9 text-center text-sm font-semibold"
                      aria-label={`${item.quantity} in cart`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="lab-mono h-9 w-9 text-ink hover:bg-ink hover:text-paper transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-reagent-deep"
                    >
                      +
                    </button>
                  </div>
                  <div className="ml-1 text-right">
                    <p className="lab-mono text-sm font-semibold text-ink">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="lab-label hover:text-hazard transition-colors focus:outline-none focus-visible:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky summary + checkout */}
            <div className="lg:sticky lg:top-20 space-y-4">
              <div className="lab-panel p-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="lab-mono text-ink">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Fulfillment</span>
                  <span className="lab-mono text-ink">{getFulfillmentLabel(fulfillmentMethod)}</span>
                </div>
                {fulfillmentFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Drop-off fee</span>
                    <span className="lab-mono text-ink">${fulfillmentFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-line pt-2">
                  <span className="lab-label">Total</span>
                  <span className="lab-mono text-xl font-bold text-ink">${orderTotal.toFixed(2)}</span>
                </div>
                <p className="lab-mono text-xs text-faint pt-1">Cash on pickup</p>
              </div>

              {error && (
                <div
                  ref={errorRef}
                  role="alert"
                  aria-live="assertive"
                  className="rounded-[2px] border border-hazard bg-hazard-soft p-3 text-sm text-hazard space-y-2"
                >
                  <p className="lab-mono">{error}</p>
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

              <form onSubmit={handleCheckout} className="lab-panel p-5 space-y-4">
                <h2 className="lab-mono text-sm font-bold uppercase tracking-[0.1em] text-ink">
                  Checkout
                </h2>

                <div>
                  <label htmlFor="checkout-name" className="lab-label mb-1 block">Your name</label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="lab-field"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-email" className="lab-label mb-1 block">Email</label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lab-field"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="lab-label mb-2 block">How should we get this to you?</label>
                  <div className="space-y-2">
                    {(["during-school", "after-school", "house-dropoff"] as FulfillmentMethod[]).map((method) => (
                      <label
                        key={method}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-[2px] border px-3 py-2.5 transition-colors ${
                          fulfillmentMethod === method
                            ? "border-ink bg-reagent/25"
                            : "border-line-strong hover:border-ink"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-semibold text-ink">
                            {getFulfillmentLabel(method)}
                          </span>
                          <span className="lab-mono block text-xs text-muted">
                            {getFulfillmentDescription(method)}
                          </span>
                        </span>
                        <input
                          type="radio"
                          name="fulfillment-method"
                          value={method}
                          checked={fulfillmentMethod === method}
                          onChange={() => updateFulfillmentMethod(method)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                            fulfillmentMethod === method ? "border-ink bg-reagent" : "border-line-strong"
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {fulfillmentNeedsTime && (
                  <div>
                    <label htmlFor="checkout-timeslot" className="lab-label mb-1 block">
                      After-school time slot
                    </label>
                    <select
                      id="checkout-timeslot"
                      value={timeSlot}
                      required={fulfillmentNeedsTime}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="lab-field"
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
                    <label htmlFor="checkout-location" className="lab-label mb-1 block">
                      {getLocationDetailsLabel(fulfillmentMethod)}
                    </label>
                    <textarea
                      id="checkout-location"
                      value={locationDetails}
                      required={fulfillmentNeedsLocation}
                      onChange={(e) => setLocationDetails(e.target.value)}
                      className="lab-field"
                      rows={2}
                      placeholder={getLocationDetailsPlaceholder(fulfillmentMethod)}
                    />
                  </div>
                )}

                <button type="submit" disabled={loading} className="lab-btn lab-btn-primary w-full !py-3">
                  {loading ? "Placing order…" : "Place order"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
