"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

type Product = {
  id: string;
  name: string;
  cost: number;
  price: number;
  image: string;
  quantity: number;
  description: string;
  hot?: boolean;
  seller?: string;
};

type Session = {
  seller?: string;
  role?: "owner" | "seller";
};

const empty: Omit<Product, "id"> = {
  name: "",
  cost: 0,
  price: 0,
  image: "",
  quantity: 0,
  description: "",
  hot: false,
};

export default function InventoryPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = session?.role === "owner";
  const mySeller = session?.seller;
  const products = isOwner ? allProducts : allProducts.filter((p) => p.seller === mySeller);

  async function load() {
    const [sessionRes, productsRes] = await Promise.all([
      fetch("/api/session"),
      fetch("/api/products"),
    ]);
    if (!sessionRes.ok || !productsRes.ok) {
      throw new Error("Could not load inventory.");
    }
    setSession((await sessionRes.json()) as Session);
    setAllProducts((await productsRes.json()) as Product[]);
  }

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load inventory.");
    });
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;

      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Could not upload image.");
      }

      setForm((f) => ({ ...f, image: data.url ?? "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Could not save item.");
      }

      setForm(empty);
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;

    setError(null);
    const res = await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;

    if (!res.ok) {
      setError(data?.error ?? "Could not delete item.");
      return;
    }

    await load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load inventory.");
    });
  }

  async function toggleHot(p: Product) {
    setError(null);
    const res = await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, hot: !p.hot }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;

    if (!res.ok) {
      setError(data?.error ?? "Could not update item.");
      return;
    }

    await load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load inventory.");
    });
  }

  function startEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      cost: p.cost || 0,
      price: p.price,
      image: p.image,
      quantity: p.quantity,
      description: p.description,
      hot: p.hot ?? false,
    });
  }

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-pink-light hover:text-white transition-colors">
            ← Back
          </Link>
          <span className="text-xl font-bold">Inventory</span>
        </div>
        <AdminLogoutButton />
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-white rounded-xl p-4 border-2 border-pink-bold/30 text-pink-bold mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border-2 border-pink-light mb-8 space-y-4">
          <h2 className="text-xl font-bold text-chocolate">{editId ? "Edit Item" : "Add New Item"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-caramel mb-1">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-caramel mb-1">Cost ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.cost || ""}
                onChange={(e) => setForm((f) => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
                className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
                placeholder="What you paid"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-caramel mb-1">Sell Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price || ""}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
                placeholder="What you charge"
              />
            </div>
            {form.cost > 0 && form.price > 0 && (
              <div className="flex items-end pb-2">
                <span className={`text-sm font-bold ${form.price > form.cost ? "text-mint-bold" : "text-pink-bold"}`}>
                  Profit: ${(form.price - form.cost).toFixed(2)} ({Math.round(((form.price - form.cost) / form.cost) * 100)}%)
                </span>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-caramel mb-1">Quantity</label>
              <input
                type="number"
                required
                min="0"
                value={form.quantity || ""}
                onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value, 10) || 0 }))}
                className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-caramel mb-1">Image</label>
              <input type="file" accept="image/*" onChange={handleUpload} className="w-full text-sm text-caramel" />
              {uploading && <p className="text-xs text-pink-bold mt-1">Uploading...</p>}
              {form.image && (
                <Image
                  src={form.image}
                  alt="preview"
                  width={64}
                  height={64}
                  unoptimized
                  className="mt-2 h-16 w-16 rounded-lg object-cover"
                />
              )}
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="hot-flag"
                checked={form.hot ?? false}
                onChange={(e) => setForm((f) => ({ ...f, hot: e.target.checked }))}
                className="w-5 h-5 accent-pink-bold cursor-pointer"
              />
              <label htmlFor="hot-flag" className="font-semibold text-chocolate cursor-pointer">
                🔥 Mark as Hot / Selling Fast
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-caramel mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-pink-bold text-white px-6 py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : editId ? "Save Changes" : "Add Item"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm(empty);
                  setError(null);
                }}
                className="text-caramel hover:text-chocolate transition-colors px-4"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <h2 className="text-xl font-bold text-chocolate mb-4">
          {isOwner ? `All Inventory (${products.length} items)` : `Your Inventory (${products.length} items)`}
        </h2>
        {products.length === 0 ? (
          <p className="text-caramel">No products yet. Add one above!</p>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 flex items-center gap-4 border-2 border-pink-light">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-peach flex items-center justify-center text-2xl">🍡</div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-chocolate flex items-center gap-1">
                    {p.name} {p.hot && <span title="Hot item">🔥</span>}
                  </h3>
                  <p className="text-sm text-caramel">
                    Cost ${(p.cost || 0).toFixed(2)} → Sell ${p.price.toFixed(2)}
                    {p.cost > 0 && (
                      <span className="text-mint-bold font-semibold ml-1">
                        (+${(p.price - p.cost).toFixed(2)} profit)
                      </span>
                    )}
                    {" · "}
                    {p.quantity} in stock
                  </p>
                </div>
                <button
                  onClick={() => toggleHot(p)}
                  className={`text-sm px-3 py-1 rounded-full font-semibold transition-colors border ${
                    p.hot
                      ? "bg-orange-100 text-orange-600 border-orange-300 hover:bg-orange-200"
                      : "bg-white text-caramel border-caramel/30 hover:bg-peach"
                  }`}
                >
                  {p.hot ? "🔥 Hot" : "Mark Hot"}
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="text-sm bg-pink-light text-pink-bold px-3 py-1 rounded-full font-semibold hover:bg-pink-mid hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-sm text-caramel hover:text-pink-bold transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
