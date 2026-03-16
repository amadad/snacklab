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
};

type Order = {
  id: string;
  name: string;
  email: string;
  items: OrderItem[];
  fulfillment?: OrderFulfillment;
  fulfillmentFee?: number;
  status: "pending" | "complete";
  date: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "complete">("all");
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [reconcileItems, setReconcileItems] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/orders");
    if (!res.ok) {
      throw new Error("Could not load orders.");
    }

    setOrders((await res.json()) as Order[]);
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

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const activeOrder = orders.find((o) => o.id === reconcileId);

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

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-white rounded-xl p-4 border-2 border-pink-bold/30 text-pink-bold mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {(["all", "pending", "complete"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                filter === f
                  ? "bg-pink-bold text-white"
                  : "bg-white text-caramel border-2 border-pink-light hover:border-pink-mid"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
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
                      <button
                        onClick={() => toggleStatus(order)}
                        disabled={saving}
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors disabled:opacity-60 ${
                          order.status === "pending"
                            ? "bg-pink-light text-pink-bold hover:bg-pink-mid hover:text-white"
                            : "bg-mint/60 text-mint-bold hover:bg-mint-bold hover:text-white"
                        }`}
                      >
                        {order.status === "pending" ? "Mark Complete" : "Reopen"}
                      </button>
                      {order.status === "pending" && (
                        <button
                          onClick={() => openReconcile(order)}
                          disabled={saving}
                          className="px-3 py-1 rounded-full text-sm font-semibold bg-peach text-chocolate hover:bg-caramel/20 transition-colors border border-caramel/30 disabled:opacity-60"
                        >
                          Reconcile
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
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.productId} className="flex justify-between text-sm gap-4">
                        <span className="text-chocolate">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="text-caramel">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
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
