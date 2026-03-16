"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  name: string;
  email: string;
  items: OrderItem[];
  status: "pending" | "complete";
  date: string;
};

type Product = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "complete">("all");
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [reconcileItems, setReconcileItems] = useState<Record<string, number>>({});

  const load = () =>
    fetch("/api/orders")
      .then((r) => r.json() as Promise<Order[]>)
      .then(setOrders);

  useEffect(() => {
    load();
    fetch("/api/products")
      .then((r) => r.json() as Promise<Product[]>)
      .then(setProducts);
  }, []);

  async function toggleStatus(order: Order) {
    const newStatus = order.status === "pending" ? "complete" : "pending";
    await fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, status: newStatus }),
    });
    load();
  }

  async function cancelOrder(order: Order) {
    const restore = confirm(
      `Cancel order for ${order.name}?\n\nRestore stock back to inventory?`
    );
    // If they hit Cancel on the confirm, restore=false but we still delete.
    // Use a two-step confirm so they can choose.
    const really = window.confirm(
      `Are you sure you want to delete this order? This cannot be undone.`
    );
    if (!really) return;
    await fetch("/api/orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, restoreStock: restore }),
    });
    load();
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
    // Build adjusted items -- only what was actually paid for
    const adjusted = order.items.map((item) => ({
      ...item,
      quantity: reconcileItems[item.productId] ?? item.quantity,
    })).filter((i) => i.quantity > 0);

    // Restore stock for the difference
    const restoreDiff: Record<string, number> = {};
    for (const item of order.items) {
      const actual = reconcileItems[item.productId] ?? item.quantity;
      const diff = item.quantity - actual;
      if (diff > 0) restoreDiff[item.productId] = diff;
    }

    // Update order with reconciled items + mark complete
    await fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, status: "complete", items: adjusted }),
    });

    // Restore stock differences via a small products patch
    if (Object.keys(restoreDiff).length > 0) {
      const updated = products.map((p) =>
        restoreDiff[p.id]
          ? { ...p, quantity: p.quantity + restoreDiff[p.id] }
          : p
      );
      for (const p of updated.filter((p) => restoreDiff[p.id])) {
        await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
      }
    }

    setReconcileId(null);
    load();
  }

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const activeOrder = orders.find((o) => o.id === reconcileId);

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center gap-4">
        <Link href="/admin" className="text-pink-light hover:text-white transition-colors">
          ← Back
        </Link>
        <span className="text-xl font-bold">Orders</span>
        {pendingCount > 0 && (
          <span className="bg-pink-bold text-white text-xs px-2 py-1 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </nav>

      {/* Reconcile Modal */}
      {reconcileId && activeOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border-2 border-pink-mid shadow-xl">
            <h2 className="text-xl font-bold text-chocolate mb-1">Reconcile Order</h2>
            <p className="text-sm text-caramel mb-4">
              Set what <strong>{activeOrder.name}</strong> actually paid for. Stock is restored for anything reduced.
            </p>
            <div className="space-y-3 mb-6">
              {activeOrder.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-chocolate text-sm">{item.name}</p>
                    <p className="text-xs text-caramel">Ordered: {item.quantity} × ${item.price.toFixed(2)}</p>
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
                          [item.productId]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0)),
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
                className="flex-1 bg-mint-bold text-white py-2 rounded-full font-bold hover:bg-mint-bold/80 transition-colors"
              >
                Save & Mark Complete
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
              const orderTotal = order.items.reduce(
                (sum, i) => sum + i.price * i.quantity,
                0
              );
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl p-5 border-2 ${
                    order.status === "pending"
                      ? "border-pink-mid"
                      : "border-mint-bold/40"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-chocolate text-lg">{order.name}</h3>
                      <p className="text-sm text-caramel">{order.email}</p>
                      <p className="text-xs text-caramel/60 mt-1">
                        {new Date(order.date).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <button
                        onClick={() => toggleStatus(order)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
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
                          className="px-3 py-1 rounded-full text-sm font-semibold bg-peach text-chocolate hover:bg-caramel/20 transition-colors border border-caramel/30"
                        >
                          Reconcile
                        </button>
                      )}
                      <button
                        onClick={() => cancelOrder(order)}
                        className="px-3 py-1 rounded-full text-sm font-semibold text-caramel hover:text-white hover:bg-pink-bold transition-colors border border-caramel/30"
                      >
                        Cancel Order
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-chocolate">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="text-caramel">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
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
