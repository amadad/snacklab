"use client";

import { useEffect, useState, useRef } from "react";
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
  items: OrderItem[];
  fulfillment?: OrderFulfillment;
  fulfillmentFee?: number;
  status: "pending" | "complete";
  date: string;
  seller?: string;
};

type Product = {
  id: string;
  name: string;
  cost: number;
  price: number;
  quantity: number;
  seller?: string;
};

type ItemRequest = {
  id: string;
  name: string;
  email: string;
  item: string;
  note: string;
  date: string;
};

type Session = {
  authenticated: boolean;
  seller?: string;
  role?: "owner" | "seller";
  platformFeePct?: number;
  defaultSeller?: string;
};

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full bg-pink-light text-caramel text-[10px] font-bold flex items-center justify-center hover:bg-caramel hover:text-white transition-colors ml-1.5"
        aria-label="More info"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-chocolate text-white text-xs rounded-lg px-3 py-2 shadow-lg leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-chocolate" />
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [sessionRes, productsRes, ordersRes, requestsRes] = await Promise.all([
          fetch("/api/session"),
          fetch("/api/products"),
          fetch("/api/orders"),
          fetch("/api/requests"),
        ]);

        if (!sessionRes.ok || !productsRes.ok || !ordersRes.ok || !requestsRes.ok) {
          throw new Error("Could not load admin dashboard.");
        }

        const [sessionData, productsData, ordersData, requestsData] = (await Promise.all([
          sessionRes.json(),
          productsRes.json(),
          ordersRes.json(),
          requestsRes.json(),
        ])) as [Session, Product[], Order[], ItemRequest[]];

        if (!active) return;

        setSession(sessionData);
        setProducts(productsData);
        setOrders(ordersData);
        setRequests(requestsData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load admin dashboard.");
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  const isOwner = session?.role === "owner";
  const mySeller = session?.seller;
  const platformFeePct = session?.platformFeePct ?? 20;
  const defaultSeller = session?.defaultSeller ?? null;

  // Filter data by role
  const myProducts = isOwner ? products : products.filter((p) => p.seller === mySeller);
  const myOrders = isOwner
    ? orders
    : orders.filter((o) =>
        o.items.some((i) => myProducts.find((p) => p.id === i.productId))
      );

  const costMap: Record<string, number> = {};
  for (const p of products) costMap[p.id] = p.cost || 0;

  const completedOrders = myOrders.filter((o) => o.status === "complete");

  const totalRevenue = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0) + (o.fulfillmentFee ?? 0),
    0
  );
  const totalCost = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + (i.cost ?? costMap[i.productId] ?? 0) * i.quantity, 0),
    0
  );
  const totalProfit = totalRevenue - totalCost;
  const platformFeeOwed = isOwner ? 0 : totalRevenue * (platformFeePct / 100);
  const netEarnings = totalRevenue - totalCost - platformFeeOwed;

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

  // Build product → seller map for fallback attribution
  const productSellerMap: Record<string, string> = {};
  for (const p of products) {
    if (p.seller) productSellerMap[p.id] = p.seller;
  }

  // Per-seller breakdown (owner only) — resolve seller from order.seller or product lookup
  const sellerBreakdown: Record<string, { revenue: number; cost: number; orders: number }> = {};
  if (isOwner) {
    for (const o of completedOrders) {
      // Prefer o.seller, fall back to product lookup, then DEFAULT_SELLER env, then "Store"
      const sellerCode =
        o.seller ||
        (o.items.length > 0 ? productSellerMap[o.items[0].productId] : null) ||
        defaultSeller ||
        "Store";
      if (!sellerBreakdown[sellerCode]) sellerBreakdown[sellerCode] = { revenue: 0, cost: 0, orders: 0 };
      sellerBreakdown[sellerCode].revenue += o.items.reduce((s, i) => s + i.price * i.quantity, 0) + (o.fulfillmentFee ?? 0);
      sellerBreakdown[sellerCode].cost += o.items.reduce((s, i) => s + (i.cost ?? costMap[i.productId] ?? 0) * i.quantity, 0);
      sellerBreakdown[sellerCode].orders += 1;
    }
  }
  const sellerRows = Object.entries(sellerBreakdown).sort((a, b) => b[1].revenue - a[1].revenue);
  const platformEarnings = sellerRows.reduce((sum, [, v]) => sum + v.revenue * (platformFeePct / 100), 0);

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
      salesByDay[key] += o.items.reduce((s, i) => s + i.price * i.quantity, 0) + (o.fulfillmentFee ?? 0);
    }
  }
  const dayEntries = Object.entries(salesByDay);
  const maxDay = Math.max(...dayEntries.map(([, v]) => v), 1);

  const recentOrders = [...myOrders].reverse().slice(0, 5);
  const recentRequests = [...requests].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center justify-between gap-4">
        <span className="text-xl font-bold">
          {isOwner ? "🍫 Owner Panel" : `🍫 ${mySeller ?? "Seller"} Dashboard`}
        </span>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-pink-light hover:text-white transition-colors text-sm">
            View Store
          </Link>
          <AdminLogoutButton />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-chocolate mb-2">
          {isOwner ? "Dashboard" : `Your Dashboard`}
        </h1>
        {!isOwner && (
          <p className="text-sm text-caramel mb-6">
            Platform fee: <strong>{platformFeePct}%</strong> of your revenue goes to the store.
          </p>
        )}

        {error && (
          <div className="bg-white rounded-xl p-4 border-2 border-pink-bold/30 text-pink-bold mb-6">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-pink-bold">{myProducts.length}</div>
            <div className="text-xs text-caramel mt-1">{isOwner ? "Products" : "Your Products"}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-mint-bold">{myOrders.filter((o) => o.status === "pending").length}</div>
            <div className="text-xs text-caramel mt-1">Pending</div>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-chocolate">{myOrders.length}</div>
            <div className="text-xs text-caramel mt-1">Total Orders</div>
          </div>
          <div className={`bg-white rounded-xl p-4 border-2 text-center ${(isOwner ? totalProfit : netEarnings) >= 0 ? "border-mint-bold/50" : "border-pink-bold/50"}`}>
            <div className={`text-3xl font-bold ${(isOwner ? totalProfit : netEarnings) >= 0 ? "text-mint-bold" : "text-pink-bold"}`}>
              ${(isOwner ? totalProfit : netEarnings).toFixed(2)}
            </div>
            <div className="text-xs text-caramel mt-1">{isOwner ? "Profit" : "You Keep"}</div>
          </div>
        </div>

        {/* Seller breakdown (owner) */}
        {isOwner && sellerRows.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-chocolate">Seller Breakdown</h2>
              {platformEarnings > 0 && (
                <span className="text-sm font-semibold text-mint-bold">Your cut: ${platformEarnings.toFixed(2)}</span>
              )}
            </div>
            <div className="space-y-3">
              {sellerRows.map(([code, v]) => {
                const fee = v.revenue * (platformFeePct / 100);
                const net = v.revenue - v.cost - fee;
                return (
                  <div key={code} className="flex flex-wrap gap-x-6 gap-y-1 text-sm border-b border-pink-light/40 pb-3 last:border-0 last:pb-0">
                    <span className="font-bold text-chocolate w-20">{code}</span>
                    <span className="text-caramel">{v.orders} orders</span>
                    <span className="text-chocolate">Revenue: <strong>${v.revenue.toFixed(2)}</strong></span>
                    <span className="text-pink-bold">Fee owed: ${fee.toFixed(2)}</span>
                    <span className={net >= 0 ? "text-mint-bold" : "text-pink-bold"}>Their net: ${net.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Seller fee summary (seller) — money flow visual */}
        {!isOwner && completedOrders.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <div className="flex items-center mb-4">
              <h2 className="font-bold text-chocolate">Where your money goes</h2>
              <Tooltip text="Every dollar you earn gets split three ways: what you paid for the item (cost), the store's cut (platform fee), and what's left for you. Bigger green = more profit." />
            </div>
            {totalRevenue > 0 ? (() => {
              const costPct = Math.round((totalCost / totalRevenue) * 100);
              const feePct = Math.round((platformFeeOwed / totalRevenue) * 100);
              const keepPct = 100 - costPct - feePct;
              return (
                <>
                  {/* Stacked bar */}
                  <div className="flex rounded-lg overflow-hidden h-10 mb-3 text-xs font-bold">
                    {costPct > 0 && (
                      <div className="flex items-center justify-center bg-pink-bold text-white" style={{ width: `${costPct}%` }}>
                        {costPct > 8 ? `${costPct}%` : ""}
                      </div>
                    )}
                    {feePct > 0 && (
                      <div className="flex items-center justify-center bg-caramel text-white" style={{ width: `${feePct}%` }}>
                        {feePct > 8 ? `${feePct}%` : ""}
                      </div>
                    )}
                    {keepPct > 0 && (
                      <div className="flex items-center justify-center bg-mint-bold text-white" style={{ width: `${keepPct}%` }}>
                        {keepPct > 8 ? `${keepPct}%` : ""}
                      </div>
                    )}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-pink-bold" />
                      <span className="text-caramel">Your cost <strong className="text-chocolate">${totalCost.toFixed(2)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-caramel" />
                      <span className="text-caramel">Store fee ({platformFeePct}%) <strong className="text-chocolate">${platformFeeOwed.toFixed(2)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-mint-bold" />
                      <span className="text-caramel">You keep <strong className="text-chocolate">${netEarnings.toFixed(2)}</strong></span>
                    </div>
                  </div>
                  <p className="text-xs text-caramel">
                    Out of every <strong className="text-chocolate">$1.00</strong> you sell:&nbsp;
                    <strong className="text-pink-bold">${(totalCost / totalRevenue).toFixed(2)}</strong> cost,&nbsp;
                    <strong className="text-caramel">${(platformFeeOwed / totalRevenue).toFixed(2)}</strong> store fee,&nbsp;
                    <strong className="text-mint-bold">${(netEarnings / totalRevenue).toFixed(2)}</strong> yours.
                  </p>
                </>
              );
            })() : (
              <p className="text-sm text-caramel">No completed sales yet.</p>
            )}
          </div>
        )}

        {/* Owner profit breakdown — margin visual */}
        {isOwner && completedOrders.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <div className="flex items-center mb-4">
              <h2 className="font-bold text-chocolate">Store Totals</h2>
              <Tooltip text="Margin is what you keep after paying for inventory. 30%+ is healthy for a snack store. If margin is low, your costs are eating into profit — consider raising prices or lowering what you pay for stock." />
            </div>
            {totalRevenue > 0 ? (() => {
              const costPct = Math.round((totalCost / totalRevenue) * 100);
              const profitPct = 100 - costPct;
              // SVG donut
              const r = 40;
              const circ = 2 * Math.PI * r;
              const profitDash = (profitPct / 100) * circ;
              return (
                <div className="flex items-center gap-8 flex-wrap">
                  {/* Donut */}
                  <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r={r} fill="none" stroke="#fce7e7" strokeWidth="14" />
                      <circle
                        cx="50" cy="50" r={r} fill="none"
                        stroke={profitPct >= 0 ? "#34d399" : "#f87171"}
                        strokeWidth="14"
                        strokeDasharray={`${profitDash} ${circ}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-xl font-bold ${profitPct >= 0 ? "text-mint-bold" : "text-pink-bold"}`}>{profitPct}%</span>
                      <span className="text-xs text-caramel">margin</span>
                    </div>
                  </div>
                  {/* Numbers */}
                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-pink-light" />
                      <span className="text-caramel">Cost</span>
                      <strong className="text-chocolate ml-auto pl-4">${totalCost.toFixed(2)}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-mint-bold" />
                      <span className="text-caramel">Profit</span>
                      <strong className={`ml-auto pl-4 ${totalProfit >= 0 ? "text-mint-bold" : "text-pink-bold"}`}>${totalProfit.toFixed(2)}</strong>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-pink-light/40">
                      <span className="text-caramel font-semibold">Revenue</span>
                      <strong className="text-chocolate ml-auto pl-4">${totalRevenue.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <p className="text-sm text-caramel">No completed sales yet.</p>
            )}
          </div>
        )}

        {/* Sales chart */}
        <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
          <h2 className="font-bold text-chocolate mb-4">
            {isOwner ? "Completed Sales" : "Your Sales"} — Last 7 Days
          </h2>
          <div className="flex items-end gap-2 h-28">
            {dayEntries.map(([dateStr, val]) => {
              const d = new Date(dateStr);
              const label = dayLabels[d.getDay()];
              const heightPct = (val / maxDay) * 100;
              return (
                <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-caramel font-semibold">{val > 0 ? `$${val.toFixed(0)}` : ""}</span>
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
            <h2 className="font-bold text-chocolate mb-4">Top Products</h2>
            <div className="space-y-3">
              {topSellers.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-chocolate">{s.name}</span>
                    <span className="text-caramel">{s.units} sold · ${s.revenue.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-pink-light rounded-full h-2">
                    <div className="bg-pink-bold h-2 rounded-full transition-all" style={{ width: `${(s.units / maxUnits) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory health */}
        {myProducts.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <div className="flex items-center mb-1">
              <h2 className="font-bold text-chocolate">Inventory Health</h2>
              <Tooltip text="Shows how much stock you have left for each item. Green = plenty, orange = running low (restock soon), red = sold out. Items are sorted worst-first so you spot problems fast." />
            </div>
            <p className="text-xs text-caramel mb-4">Stock levels across your products</p>
            <div className="space-y-3">
              {[...myProducts].sort((a, b) => a.quantity - b.quantity).slice(0, 8).map((p) => {
                const max = Math.max(...myProducts.map((x) => x.quantity), 1);
                const pct = Math.round((p.quantity / max) * 100);
                const color = p.quantity === 0 ? "bg-pink-bold" : p.quantity <= 2 ? "bg-caramel" : "bg-mint-bold";
                const label = p.quantity === 0 ? "Sold out" : p.quantity <= 2 ? "Low" : "OK";
                const labelColor = p.quantity === 0 ? "text-pink-bold" : p.quantity <= 2 ? "text-caramel" : "text-mint-bold";
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-chocolate truncate max-w-[60%]">{p.name}</span>
                      <span className={`font-bold ${labelColor}`}>{p.quantity} left · {label}</span>
                    </div>
                    <div className="w-full bg-pink-light rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.max(pct, p.quantity > 0 ? 3 : 0)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent orders */}
        {recentOrders.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-6">
            <h2 className="font-bold text-chocolate mb-3">{isOwner ? "Recent Orders" : "Your Recent Orders"}</h2>
            <div className="space-y-2">
              {recentOrders.map((o) => {
                const total = o.items.reduce((s, i) => s + i.price * i.quantity, 0) + (o.fulfillmentFee ?? 0);
                return (
                  <div key={o.id} className="flex justify-between items-center text-sm border-b border-pink-light/40 pb-2 last:border-0 last:pb-0">
                    <div>
                      <div>
                        <span className="font-semibold text-chocolate">{o.name}</span>
                        <span className="text-caramel ml-2 text-xs">{new Date(o.date).toLocaleDateString()}</span>
                        {isOwner && o.seller && (
                          <span className="text-xs ml-2 bg-peach text-caramel px-1.5 py-0.5 rounded-full">{o.seller}</span>
                        )}
                      </div>
                      <p className="text-xs text-caramel mt-1">{getFulfillmentSummary(o.fulfillment)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-pink-bold font-bold">${total.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${o.status === "pending" ? "bg-pink-light text-pink-bold" : "bg-mint/40 text-mint-bold"}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Item requests (owner only) */}
        {isOwner && recentRequests.length > 0 && (
          <div className="bg-white rounded-xl p-5 border-2 border-pink-light mb-8">
            <h2 className="font-bold text-chocolate mb-3">Recent Item Requests</h2>
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="border-b border-pink-light/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-chocolate">{request.item}</p>
                      <p className="text-sm text-caramel">{request.name} · {request.email}</p>
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
            {isOwner ? "All Inventory" : "My Inventory"}
          </Link>
          <Link
            href="/admin/orders"
            className="bg-mint-bold text-white rounded-xl p-8 text-center font-bold text-xl hover:bg-mint-bold/80 transition-colors"
          >
            {isOwner ? "All Orders" : "My Orders"}
          </Link>
        </div>
      </main>
    </div>
  );
}
