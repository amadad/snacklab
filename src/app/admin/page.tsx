"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json() as Promise<{ id: string }[]>)
      .then((p) => setProductCount(p.length));
    fetch("/api/orders")
      .then((r) => r.json() as Promise<{ status: string }[]>)
      .then((o) => {
        setOrderCount(o.length);
        setPendingCount(o.filter((x) => x.status === "pending").length);
      });
  }, []);

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center justify-between">
        <span className="text-xl font-bold">Admin Panel</span>
        <Link href="/" className="text-pink-light hover:text-white transition-colors text-sm">
          View Store
        </Link>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-chocolate mb-6">Dashboard</h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-pink-bold">{productCount}</div>
            <div className="text-sm text-caramel mt-1">Products</div>
          </div>
          <div className="bg-white rounded-xl p-6 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-mint-bold">{pendingCount}</div>
            <div className="text-sm text-caramel mt-1">Pending Orders</div>
          </div>
          <div className="bg-white rounded-xl p-6 border-2 border-pink-light text-center">
            <div className="text-3xl font-bold text-chocolate">{orderCount}</div>
            <div className="text-sm text-caramel mt-1">Total Orders</div>
          </div>
        </div>

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
