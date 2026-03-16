"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

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
  items: OrderItem[];
  status: "pending" | "complete";
  date: string;
};

type Product = {
  id: string;
  name: string;
  cost: number;
  price: number;
  quantity: number;
};

type ItemRequest = {
  id: string;
  name: string;
  email: string;
  item: string;
  note: string;
  date: string;
};

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [productsRes, ordersRes, requestsRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/orders"),
          fetch("/api/requests"),
        ]);

        if (!productsRes.ok || !ordersRes.ok || !requestsRes.ok) {
          throw new Error("Could not load admin dashboard.");
        }

        const [productsData, ordersData, requestsData] = (await Promise.all([
          productsRes.json(),
          ordersRes.json(),
          requestsRes.json(),
        ])) as [Product[], Order[], ItemRequest[]];

        if (!active) {
          return;
        }

        setProducts(productsData);
        setOrders(ordersData);
        setRequests(requestsData);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Could not load admin dashboard.");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const productCount = products.length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const orderCount = orders.length;

  const costMap: Record<string, number> = {};
  for (const p of products) costMap[p.id] = p.cost || 0;

  const completedOrders = orders.filter((o) => o.status === "complete");
  const totalRevenue = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );
  const totalCost = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + (i.cost ?? costMap[i.productId] ?? 0) * i.quantity, 0),
    0
  );
  const totalProfit = totalRevenue - totalCost;

  const unitsSold: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const o of completedOrders) {
    for (const i of o.items) {
      if (!unitsSold[i.productId]) unitsSold[i.productId] = { name: i.name, units: 0, revenue: 0 };
      unitsSold[i.productId].units += i.quantity;
      unitsSold[i.productId].revenue += i.price * i.quantity;
    }
  }
  const topSellers = Object.values(unitsSold).sort((a, b) => b.units - a.units).slice(0, 6);
  const maxUnits = Math.max(...topSellers.map((s) => s.units), 1);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const salesByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    salesByDay[d.toDateString()] = 0;
  }
  for (const o of completedOrders) {
    const key = new Date(o.date).toDateString();
    if (key in salesByDay) {
      salesByDay[key] += o.items.reduce((s, i) => s + i.price * i.quantity, 0);
    }
  }
  const dayEntries = Object.entries(salesByDay);
  const maxDay = Math.max(...dayEntries.map(([, v]) => v), 1);

  const recentOrders = [...orders].reverse().slice(0, 5);
  const recentRequests = [...requests].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center justify-between gap-4">
        <span className="text-xl font-bold">Admin Panel</span>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-pink-light hover:text-white transition-colors text-sm">
            View Store
          </Link>
          <AdminLogoutButton />
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-chocolate mb-6">Dashboard</h1>

        {error && (
          <div className="bg-white rounded-xl p-4 border-2 border-pink-bold/30 text-pink-bold mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-pink-bold">{productCount}</div>
            <div className="text-xs text-caramel mt-1">Products</div>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-mint-bold">{pendingCount}</div>
            <div className="text-xs text-caramel mt-1">Pending</div>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-chocolate">{orderCount}</div>
            <div className="text-xs text-caramel mt-1">Total Orders</div>
          </div>
          <div
            className={`bg-white rounded-xl p-4 border-2 text-center ${
              totalProfit >= 0 ? "border-mint-bold/50" : "border-pink-bold/50"
            }`}
          >
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? "text-mint-bold" : "text-pink-bold"}`}>
              ${totalProfit.toFixed(2)}
            </div>
            <div className="text-xs text-caramel mt-1">Profit</div>
          </div>
        </div>

        {completedOrders.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <h2 className="font-bold text-chocolate mb-3">Profit Breakdown</h2>
            <div className="flex gap-6 text-sm flex-wrap">
              <div>
                <p className="text-caramel">Completed Revenue</p>
                <p className="text-xl font-bold text-chocolate">${totalRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-caramel">Completed Cost</p>
                <p className="text-xl font-bold text-pink-bold">-${totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-caramel">Completed Profit</p>
                <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-mint-bold" : "text-pink-bold"}`}>
                  ${totalProfit.toFixed(2)}
                  {totalRevenue > 0 && (
                    <span className="text-sm font-normal text-caramel ml-1">
                      ({Math.round((totalProfit / totalRevenue) * 100)}% margin)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
          <h2 className="font-bold text-chocolate mb-4">Completed Sales — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-28">
            {dayEntries.map(([dateStr, val]) => {
              const d = new Date(dateStr);
              const label = dayLabels[d.getDay()];
              const heightPct = (val / maxDay) * 100;
              return (
                <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-caramel font-semibold">
                    {val > 0 ? `$${val.toFixed(0)}` : ""}
                  </span>
                  <div className="w-full rounded-t-lg bg-pink-light relative" style={{ height: "80px" }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-lg bg-pink-bold transition-all"
                      style={{ height: `${Math.max(heightPct, val > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-caramel">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {topSellers.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <h2 className="font-bold text-chocolate mb-4">Top Sellers</h2>
            <div className="space-y-3">
              {topSellers.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-chocolate">{s.name}</span>
                    <span className="text-caramel">{s.units} sold · ${s.revenue.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-pink-light rounded-full h-2">
                    <div
                      className="bg-pink-bold h-2 rounded-full transition-all"
                      style={{ width: `${(s.units / maxUnits) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentOrders.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <h2 className="font-bold text-chocolate mb-3">Recent Orders</h2>
            <div className="space-y-2">
              {recentOrders.map((o) => {
                const total = o.items.reduce((s, i) => s + i.price * i.quantity, 0);
                return (
                  <div
                    key={o.id}
                    className="flex justify-between items-center text-sm border-b border-pink-light/40 pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <span className="font-semibold text-chocolate">{o.name}</span>
                      <span className="text-caramel ml-2 text-xs">{new Date(o.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-pink-bold font-bold">${total.toFixed(2)}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          o.status === "pending"
                            ? "bg-pink-light text-pink-bold"
                            : "bg-mint/40 text-mint-bold"
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recentRequests.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-8">
            <h2 className="font-bold text-chocolate mb-3">Recent Item Requests</h2>
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="border-b border-pink-light/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-chocolate">{request.item}</p>
                      <p className="text-sm text-caramel">
                        {request.name} · {request.email}
                      </p>
                    </div>
                    <span className="text-xs text-caramel">{new Date(request.date).toLocaleDateString()}</span>
                  </div>
                  {request.note && <p className="text-sm text-caramel mt-1">{request.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/admin/inventory"
            className="bg-pink-bold text-white rounded-xl p-8 text-center font-bold text-xl hover:bg-pink-mid transition-colors"
          >
            Manage Inventory
          </Link>
          <Link
            href="/admin/orders"
            className="bg-mint-bold text-white rounded-xl p-8 text-center font-bold text-xl hover:bg-mint-bold/80 transition-colors"
          >
            View Orders
          </Link>
        </div>
      </main>
    </div>
  );
}
