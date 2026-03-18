"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { getFulfillmentSummary, type OrderFulfillment } from "@/lib/fulfillment";

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  cost?: number;
  delivered?: number;
};

type Order = {
  id: string;
  name: string;
  email: string;
  items: OrderItem[];
  fulfillment?: OrderFulfillment;
  fulfillmentFee?: number;
  status: "pending" | "partial" | "complete";
  date: string;
  seller?: string;
};

type Session = {
  seller?: string;
  role?: "owner" | "seller";
};

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<{ id: string; seller?: string }[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "partial" | "complete">("all");
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [reconcileItems, setReconcileItems] = useState<Record<string, number>>({});
  const [partialId, setPartialId] = useState<string | null>(null);
  const [partialDelivered, setPartialDelivered] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isOwner = session?.role === "owner";
  const mySeller = session?.seller;
  const myProductIds = new Set(allProducts.filter((p) => isOwner || p.seller === mySeller).map((p) => p.id));
  const orders = isOwner
    ? allOrders
    : allOrders.filter((o) => o.items.some((i) => myProductIds.has(i.productId)));

  async function load() {
    const [sessionRes, ordersRes, productsRes] = await Promise.all([
      fetch("/api/session"),
      fetch("/api/orders"),
      fetch("/api/products"),
    ]);
    if (!sessionRes.ok || !ordersRes.ok || !productsRes.ok) {
      throw new Error("Could not load orders.");
    }
    setSession((await sessionRes.json()) as Session);
    setAllOrders((await ordersRes.json()) as Order[]);
    setAllProducts((await productsRes.json()) as { id: string; seller?: string }[]);
  }

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    });
  }, []);

  async function toggleStatus(order: Order) {
    setSaving(true);
    setError(null);

    try {
      const newStatus = order.status === "pending" ? "complete" : "pending";
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: newStatus }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Could not update order.");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(order: Order) {
    const shouldDelete = window.confirm(
      `Cancel order for ${order.name}?\n\nThis will remove the order record.`
    );
    if (!shouldDelete) return;

    const restore = window.confirm("Restore the reserved stock back to inventory?");

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, restoreStock: restore }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Could not cancel order.");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order.");
    } finally {
      setSaving(false);
    }
  }

  function openReconcile(order: Order) {
    const defaults: Record<string, number> = {};
    for (const item of order.items) {
      defaults[item.productId] = item.quantity;
    }
    setReconcileItems(defaults);
    setReconcileId(order.id);
  }

  async function submitReconcile(order: Order) {
    setSaving(true);
    setError(null);

    try {
      const adjustedItems = order.items.map((item) => ({
        productId: item.productId,
        quantity: reconcileItems[item.productId] ?? item.quantity,
      }));

      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: "complete", items: adjustedItems }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Could not reconcile order.");
      }

      setReconcileId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reconcile order.");
    } finally {
      setSaving(false);
    }
  }

  function openPartial(order: Order) {
    const defaults: Record<string, number> = {};
    for (const item of order.items) {
      defaults[item.productId] = item.delivered ?? 0;
    }
    setPartialDelivered(defaults);
    setPartialId(order.id);
  }

  async function submitPartial(order: Order) {
    setSaving(true);
    setError(null);
    try {
      const delivered = order.items.map((item) => ({
        productId: item.productId,
        quantity: partialDelivered[item.productId] ?? (item.delivered ?? 0),
      }));
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: "partial", delivered }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save delivery.");
      setPartialId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save delivery.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const pendingCount = orders.filter((o) => o.status === "pending" || o.status === "partial").length;
  const activeOrder = orders.find((o) => o.id === reconcileId);
  const partialOrder = orders.find((o) => o.id === partialId);

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-pink-light hover:text-white transition-colors">
            ← Back
          </Link>
          <span className="text-xl font-bold">Orders</span>
          {pendingCount > 0 && (
            <span className="bg-pink-bold text-white text-xs px-2 py-1 rounded-full">{pendingCount} pending</span>
          )}
        </div>
        <AdminLogoutButton />
      </nav>

      {reconcileId && activeOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border-2 border-pink-mid shadow-xl">
            <h2 className="text-xl font-bold text-chocolate mb-1">Reconcile Order</h2>
            <p className="text-sm text-caramel mb-4">
              Set what <strong>{activeOrder.name}</strong> actually paid for. Any reductions will be
              returned to inventory.
            </p>
            <div className="space-y-3 mb-6">
              {activeOrder.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-chocolate text-sm">{item.name}</p>
                    <p className="text-xs text-caramel">
                      Ordered: {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-caramel font-semibold">Actually paid:</label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={reconcileItems[item.productId] ?? item.quantity}
                      onChange={(e) =>
                        setReconcileItems((prev) => ({
                          ...prev,
                          [item.productId]: Math.min(
                            item.quantity,
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          ),
                        }))
                      }
                      className="w-16 border-2 border-pink-light rounded-lg px-2 py-1 text-center font-bold focus:border-pink-bold focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => submitReconcile(activeOrder)}
                disabled={saving}
                className="flex-1 bg-mint-bold text-white py-2 rounded-full font-bold hover:bg-mint-bold/80 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save & Mark Complete"}
              </button>
              <button
                onClick={() => setReconcileId(null)}
                className="px-4 text-caramel hover:text-chocolate transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {partialId && partialOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border-2 border-caramel/40 shadow-xl">
            <h2 className="text-xl font-bold text-chocolate mb-1">📦 Record Delivery</h2>
            <p className="text-sm text-caramel mb-4">
              How many did you deliver to <strong>{partialOrder.name}</strong> today? Set each item to what you actually handed off.
            </p>
            <div className="space-y-4 mb-6">
              {partialOrder.items.map((item) => {
                const alreadyDelivered = item.delivered ?? 0;
                const remaining = item.quantity - alreadyDelivered;
                return (
                  <div key={item.productId}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div>
                        <p className="font-semibold text-chocolate text-sm">{item.name}</p>
                        <p className="text-xs text-caramel">
                          Ordered: {item.quantity} · Already delivered: {alreadyDelivered} · Still owed: {remaining}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-caramel font-semibold whitespace-nowrap">Delivering now:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={partialDelivered[item.productId] ?? alreadyDelivered}
                          onChange={(e) =>
                            setPartialDelivered((prev) => ({
                              ...prev,
                              [item.productId]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value, 10) || 0)),
                            }))
                          }
                          className="w-16 border-2 border-pink-light rounded-lg px-2 py-1 text-center font-bold focus:border-caramel focus:outline-none"
                        />
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-pink-light rounded-full h-1.5">
                      <div
                        className="bg-mint-bold h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round(((partialDelivered[item.productId] ?? alreadyDelivered) / item.quantity) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => submitPartial(partialOrder)}
                disabled={saving}
                className="flex-1 bg-chocolate text-white py-2 rounded-full font-bold hover:bg-chocolate/80 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Delivery"}
              </button>
              <button
                onClick={() => setPartialId(null)}
                className="px-4 text-caramel hover:text-chocolate transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-white rounded-xl p-4 border-2 border-pink-bold/30 text-pink-bold mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "partial", "complete"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                filter === f
                  ? "bg-pink-bold text-white"
                  : "bg-white text-caramel border-2 border-pink-light hover:border-pink-mid"
              }`}
            >
              {f === "partial" ? "Partially Delivered" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-caramel text-center py-12">No orders to show</p>
        ) : (
          <div className="space-y-4">
            {[...filtered].reverse().map((order) => {
              const itemsTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
              const fulfillmentFee = order.fulfillmentFee ?? 0;
              const orderTotal = itemsTotal + fulfillmentFee;
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl p-5 border-2 ${
                    order.status === "pending" ? "border-pink-mid" : "border-mint-bold/40"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div>
                      <h3 className="font-bold text-chocolate text-lg">{order.name}</h3>
                      <p className="text-sm text-caramel break-all">{order.email}</p>
                      <p className="text-xs text-caramel mt-1">{getFulfillmentSummary(order.fulfillment)}</p>
                      <p className="text-xs text-caramel/60 mt-1">{new Date(order.date).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      {order.status !== "complete" && (
                        <button
                          onClick={() => openPartial(order)}
                          disabled={saving}
                          className="px-3 py-1 rounded-full text-sm font-semibold bg-caramel/20 text-chocolate hover:bg-caramel/40 transition-colors border border-caramel/30 disabled:opacity-60"
                        >
                          📦 Deliver
                        </button>
                      )}
                      {order.status === "pending" && (
                        <button
                          onClick={() => openReconcile(order)}
                          disabled={saving}
                          className="px-3 py-1 rounded-full text-sm font-semibold bg-peach text-chocolate hover:bg-caramel/20 transition-colors border border-caramel/30 disabled:opacity-60"
                        >
                          Reconcile
                        </button>
                      )}
                      {order.status === "complete" && (
                        <button
                          onClick={() => toggleStatus(order)}
                          disabled={saving}
                          className="px-3 py-1 rounded-full text-sm font-semibold bg-mint/60 text-mint-bold hover:bg-mint-bold hover:text-white transition-colors disabled:opacity-60"
                        >
                          Reopen
                        </button>
                      )}
                      <button
                        onClick={() => cancelOrder(order)}
                        disabled={saving}
                        className="px-3 py-1 rounded-full text-sm font-semibold text-caramel hover:text-white hover:bg-pink-bold transition-colors border border-caramel/30 disabled:opacity-60"
                      >
                        Cancel Order
                      </button>
                    </div>
                  </div>
                  {/* Status badge */}
                  {order.status === "partial" && (
                    <div className="mb-2 text-xs font-bold text-caramel bg-peach px-2 py-1 rounded-lg inline-block">
                      🕐 Partially delivered — still owed items below
                    </div>
                  )}
                  <div className="space-y-1">
                    {order.items.map((item) => {
                      const del = item.delivered ?? 0;
                      const remaining = item.quantity - del;
                      return (
                      <div key={item.productId} className="flex justify-between text-sm gap-4">
                        <span className={remaining === 0 ? "text-caramel line-through" : "text-chocolate"}>
                          {item.name} x{item.quantity}
                          {del > 0 && del < item.quantity && (
                            <span className="ml-1 text-xs text-caramel">(delivered {del}, still owe {remaining})</span>
                          )}
                          {del >= item.quantity && (
                            <span className="ml-1 text-xs text-mint-bold">✓ done</span>
                          )}
                        </span>
                        <span className="text-caramel">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      );
                    })}
                    {fulfillmentFee > 0 && (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="text-chocolate">Home drop-off fee</span>
                        <span className="text-caramel">${fulfillmentFee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-pink-light mt-3 pt-2 flex justify-between font-bold">
                    <span className="text-chocolate">Total</span>
                    <span className="text-pink-bold">${orderTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
