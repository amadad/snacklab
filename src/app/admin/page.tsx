"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = { productId: string; name: string; price: number; quantity: number };
type Order = { id: string; name: string; items: OrderItem[]; status: string; date: string };
type Product = { id: string; name: string; cost: number; price: number; quantity: number };

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch("/api/products").then((r) => r.json() as Promise<Product[]>).then(setProducts);
    fetch("/api/orders").then((r) => r.json() as Promise<Order[]>).then(setOrders);
  }, []);

  const productCount = products.length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const orderCount = orders.length;

  // Profit tracker
  const costMap: Record<string, number> = {};
  for (const p of products) costMap[p.id] = p.cost || 0;

  const completedOrders = orders.filter((o) => o.status === "complete");
  const totalRevenue = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0
  );
  const totalCost = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + (costMap[i.productId] || 0) * i.quantity, 0), 0
  );
  const totalProfit = totalRevenue - totalCost;

  // Top sellers by units sold (completed orders)
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

  // Sales by day (last 7 days, all orders)
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const salesByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    salesByDay[d.toDateString()] = 0;
  }
  for (const o of orders) {
    const key = new Date(o.date).toDateString();
    if (key in salesByDay) {
      salesByDay[key] += o.items.reduce((s, i) => s + i.price * i.quantity, 0);
    }
  }
  const dayEntries = Object.entries(salesByDay);
  const maxDay = Math.max(...dayEntries.map(([, v]) => v), 1);

  // Recent orders (last 5)
  const recent = [...orders].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center justify-between">
        <span className="text-xl font-bold">Admin Panel</span>
        <Link href="/" className="text-pink-light hover:text-white transition-colors text-sm">View Store</Link>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-chocolate mb-6">Dashboard</h1>

        {/* Stats row */}
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
          <div className={`bg-white rounded-xl p-4 border-2 text-center ${totalProfit >= 0 ? "border-mint-bold/50" : "border-pink-bold/50"}`}>
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? "text-mint-bold" : "text-pink-bold"}`}>
              ${totalProfit.toFixed(2)}
            </div>
            <div className="text-xs text-caramel mt-1">Profit</div>
          </div>
        </div>

        {/* Profit breakdown */}
        {completedOrders.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <h2 className="font-bold text-chocolate mb-3">Profit Breakdown</h2>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-caramel">Revenue</p>
                <p className="text-xl font-bold text-chocolate">${totalRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-caramel">Cost</p>
                <p className="text-xl font-bold text-pink-bold">-${totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-caramel">Profit</p>
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

        {/* Sales by day bar chart */}
        <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
          <h2 className="font-bold text-chocolate mb-4">Sales — Last 7 Days</h2>
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

        {/* Top sellers */}
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

        {/* Recent orders */}
        {recent.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-8">
            <h2 className="font-bold text-chocolate mb-3">Recent Orders</h2>
            <div className="space-y-2">
              {recent.map((o) => {
                const total = o.items.reduce((s, i) => s + i.price * i.quantity, 0);
                return (
                  <div key={o.id} className="flex justify-between items-center text-sm border-b border-pink-light/40 pb-2 last:border-0 last:pb-0">
                    <div>
                      <span className="font-semibold text-chocolate">{o.name}</span>
                      <span className="text-caramel ml-2 text-xs">{new Date(o.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-pink-bold font-bold">${total.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        o.status === "pending" ? "bg-pink-light text-pink-bold" : "bg-mint/40 text-mint-bold"
                      }`}>{o.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/admin/inventory"
            className="bg-pink-bold text-white rounded-xl p-8 text-center font-bold text-xl hover:bg-pink-mid transition-colors">
            Manage Inventory
          </Link>
          <Link href="/admin/orders"
            className="bg-mint-bold text-white rounded-xl p-8 text-center font-bold text-xl hover:bg-mint-bold/80 transition-colors">
            View Orders
          </Link>
        </div>
      </main>
    </div>
  );
}
