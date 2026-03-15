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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "complete">("all");

  const load = () =>
    fetch("/api/orders")
      .then((r) => r.json() as Promise<Order[]>)
      .then(setOrders);

  useEffect(() => {
    load();
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

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

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
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Filter tabs */}
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
