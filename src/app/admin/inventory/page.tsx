"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  description: string;
};

const empty: Omit<Product, "id"> = {
  name: "",
  price: 0,
  image: "",
  quantity: 0,
  description: "",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = () =>
    fetch("/api/products")
      .then((r) => r.json() as Promise<Product[]>)
      .then(setProducts);

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { url } = (await res.json()) as { url: string };
    setForm((f) => ({ ...f, image: url }));
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...form }),
      });
    } else {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm(empty);
    setEditId(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function startEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      price: p.price,
      image: p.image,
      quantity: p.quantity,
      description: p.description,
    });
  }

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center gap-4">
        <Link href="/admin" className="text-pink-light hover:text-white transition-colors">
          ← Back
        </Link>
        <span className="text-xl font-bold">Inventory</span>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Add / Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 border-2 border-pink-light mb-8 space-y-4"
        >
          <h2 className="text-xl font-bold text-chocolate">
            {editId ? "Edit Item" : "Add New Item"}
          </h2>
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
              <label className="block text-sm font-semibold text-caramel mb-1">Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price || ""}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-caramel mb-1">Quantity</label>
              <input
                type="number"
                required
                min="0"
                value={form.quantity || ""}
                onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-caramel mb-1">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="w-full text-sm text-caramel"
              />
              {uploading && <p className="text-xs text-pink-bold mt-1">Uploading...</p>}
              {form.image && (
                <img src={form.image} alt="preview" className="mt-2 h-16 rounded-lg object-cover" />
              )}
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
              className="bg-pink-bold text-white px-6 py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors"
            >
              {editId ? "Save Changes" : "Add Item"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm(empty);
                }}
                className="text-caramel hover:text-chocolate transition-colors px-4"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Product List */}
        <h2 className="text-xl font-bold text-chocolate mb-4">
          Current Inventory ({products.length} items)
        </h2>
        {products.length === 0 ? (
          <p className="text-caramel">No products yet. Add one above!</p>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl p-4 flex items-center gap-4 border-2 border-pink-light"
              >
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-peach flex items-center justify-center text-2xl">
                    🍡
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-chocolate">{p.name}</h3>
                  <p className="text-sm text-caramel">
                    ${p.price.toFixed(2)} · {p.quantity} in stock
                  </p>
                </div>
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
