"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import type { Product } from "@/lib/types";
import { useAdminData } from "@/hooks/useAdminData";

const empty: Omit<Product, "id"> = {
  name: "",
  cost: 0,
  price: 0,
  image: "",
  quantity: 0,
  description: "",
  hot: false,
  missing: false,
  stolen: false,
  stolenQty: 0,
  comingSoon: false,
};

type RestockSummary = {
  oldQty: number;
  oldCost: number;
  newQty: number;
  newCost: number;
  quantityAdded: number;
  batchCost: number;
  costDelta: number;
};

// Shared class tokens — keep styling consistent and the JSX readable.
const inputClass =
  "w-full border border-pink-light rounded-lg px-3 py-2 bg-white focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-caramel/80 mb-1";
const cardClass = "bg-white rounded-xl border border-pink-light";
const chipBase =
  "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border";
const chipAttention = `${chipBase} bg-pink-light/60 text-pink-bold border-pink-mid/40`;
const chipNeutral = `${chipBase} bg-peach text-caramel border-caramel/25`;

export default function InventoryPage() {
  const admin = useAdminData({ products: true });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Restock modal state
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockCost, setRestockCost] = useState("");
  const [restocking, setRestocking] = useState(false);
  const [restockSummary, setRestockSummary] = useState<RestockSummary | null>(null);

  const session = admin.session;
  const error = localError ?? admin.error;
  const isOwner = session?.role === "owner";
  const mySeller = session?.seller;
  const products = isOwner ? admin.products : admin.products.filter((p) => p.seller === mySeller);

  function setError(msg: string | null) { setLocalError(msg); }
  async function load() { await admin.reload(); }

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
    if (!confirm("Delete this item? This can't be undone.")) return;

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

    setEditId(null);
    setForm(empty);
    await load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load inventory.");
    });
  }

  function openRestock(p: Product) {
    setRestockId(p.id);
    setRestockQty("");
    setRestockCost("");
    setRestockSummary(null);
    setError(null);
  }

  function closeRestock() {
    setRestockId(null);
    setRestockQty("");
    setRestockCost("");
    setRestockSummary(null);
  }

  async function submitRestock() {
    if (!restockId) return;
    const qty = parseInt(restockQty, 10);
    const cost = parseFloat(restockCost);
    if (!Number.isInteger(qty) || qty < 1) {
      setError("How many did you add? Use a whole number of 1 or more.");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setError("Batch cost must be 0 or more.");
      return;
    }
    setRestocking(true);
    setError(null);
    try {
      const res = await fetch("/api/products/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: restockId, quantityAdded: qty, batchCost: cost }),
      });
      const data = (await res.json().catch(() => null)) as
        | { summary?: RestockSummary; error?: string }
        | null;
      if (!res.ok || !data?.summary) {
        throw new Error(data?.error ?? "Could not restock.");
      }
      setRestockSummary(data.summary);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restock.");
    } finally {
      setRestocking(false);
    }
  }

  const restockProduct = products.find((p) => p.id === restockId);

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
      missing: p.missing ?? false,
      stolen: p.stolen ?? false,
      stolenQty: p.stolenQty ?? 0,
      comingSoon: p.comingSoon ?? false,
    });
  }

  const profitPct =
    form.cost > 0 && form.price > 0
      ? Math.round(((form.price - form.cost) / form.cost) * 100)
      : null;

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

      {/* Restock modal */}
      {restockId && restockProduct && (
        <div className="fixed inset-0 bg-chocolate/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-pink-light shadow-2xl">
            {restockSummary ? (
              <div className="animate-bounce-in">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-mint-bold text-xl">✓</span>
                  <h2 className="text-xl font-bold text-chocolate">Restocked</h2>
                </div>
                <p className="text-sm text-caramel mb-5">
                  Added <strong className="text-chocolate">{restockSummary.quantityAdded}</strong> of{" "}
                  <strong className="text-chocolate">{restockProduct.name}</strong> for{" "}
                  <strong className="text-chocolate">${restockSummary.batchCost.toFixed(2)}</strong>.
                </p>

                <dl className="border-y border-pink-light/60 py-4 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between items-baseline">
                    <dt className="text-caramel">In stock</dt>
                    <dd className="font-semibold text-chocolate tabular-nums">
                      <span className="text-caramel">{restockSummary.oldQty}</span>
                      <span className="text-caramel/40 mx-1.5">→</span>
                      {restockSummary.newQty}
                    </dd>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <dt className="text-caramel">Unit cost</dt>
                    <dd className="font-semibold text-chocolate tabular-nums">
                      <span className="text-caramel">${restockSummary.oldCost.toFixed(2)}</span>
                      <span className="text-caramel/40 mx-1.5">→</span>
                      ${restockSummary.newCost.toFixed(2)}
                      {restockSummary.costDelta !== 0 && (
                        <span
                          className={`ml-2 text-xs font-normal ${
                            restockSummary.costDelta < 0 ? "text-mint-bold" : "text-pink-bold"
                          }`}
                        >
                          {restockSummary.costDelta > 0 ? "+" : ""}${restockSummary.costDelta.toFixed(2)}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>

                <p className="text-xs text-caramel leading-relaxed mb-5">
                  Your new unit cost blends the old stock and the new batch together. That&apos;s
                  the number you&apos;ll use to figure out profit on the next sale.
                </p>

                <button
                  onClick={closeRestock}
                  className="w-full bg-mint-bold text-white py-2.5 rounded-full font-bold hover:bg-mint-bold/90 active:scale-[0.98] transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-chocolate mb-1">Restock</h2>
                <p className="text-sm text-caramel mb-5">
                  <strong className="text-chocolate">{restockProduct.name}</strong> —{" "}
                  <span className="tabular-nums">{restockProduct.quantity}</span> in stock at{" "}
                  <span className="tabular-nums">${(restockProduct.cost || 0).toFixed(2)}</span> each.
                </p>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className={labelClass}>How many did you add?</label>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      placeholder="e.g. 12"
                      autoFocus
                      className={`${inputClass} tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>What did the whole batch cost?</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-caramel/70 font-semibold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={restockCost}
                        onChange={(e) => setRestockCost(e.target.value)}
                        placeholder="6.00"
                        className={`${inputClass} pl-7 tabular-nums`}
                      />
                    </div>
                    {restockQty && restockCost && parseInt(restockQty, 10) > 0 && parseFloat(restockCost) >= 0 && (
                      <p className="text-xs text-caramel mt-1.5">
                        That&apos;s{" "}
                        <strong className="text-chocolate tabular-nums">
                          ${(parseFloat(restockCost) / parseInt(restockQty, 10)).toFixed(2)}
                        </strong>{" "}
                        per unit for this batch.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitRestock}
                    disabled={restocking || !restockQty || !restockCost}
                    className="flex-1 bg-mint-bold text-white py-2.5 rounded-full font-bold hover:bg-mint-bold/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    {restocking ? "Saving..." : "Add to Inventory"}
                  </button>
                  <button
                    onClick={closeRestock}
                    className="px-4 text-caramel hover:text-chocolate transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div
            role="alert"
            className="bg-white rounded-xl p-4 border border-pink-bold/30 text-pink-bold"
          >
            {error}
          </div>
        )}

        {/* Add / Edit form */}
        <form onSubmit={handleSubmit} className={`${cardClass} p-6 space-y-5`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-chocolate">
              {editId ? "Edit Item" : "Add New Item"}
            </h2>
            {editId && (
              <button
                type="button"
                onClick={() => handleDelete(editId)}
                className="text-xs font-semibold text-caramel hover:text-pink-bold transition-colors"
              >
                Delete this item
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-caramel/70 font-semibold">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.cost || ""}
                  onChange={(e) => setForm((f) => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
                  className={`${inputClass} pl-7 tabular-nums`}
                  placeholder="What you paid"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Sell Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-caramel/70 font-semibold">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.price || ""}
                  onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  className={`${inputClass} pl-7 tabular-nums`}
                  placeholder="What you charge"
                />
              </div>
            </div>
            <div className="flex items-end pb-2">
              {profitPct !== null && (
                <div className="text-sm leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-caramel/80">Profit</p>
                  <p className={`font-bold tabular-nums ${form.price > form.cost ? "text-mint-bold" : "text-pink-bold"}`}>
                    ${(form.price - form.cost).toFixed(2)}
                    <span className="text-xs font-semibold ml-1">{profitPct}%</span>
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                required
                min="0"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Photo</label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <Image
                    src={form.image}
                    alt="preview"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-lg object-cover border border-pink-light"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-peach border border-pink-light flex items-center justify-center text-2xl">
                    🍡
                  </div>
                )}
                <label className="flex-1 text-xs text-caramel cursor-pointer hover:text-chocolate transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <span className="inline-block px-3 py-2 rounded-lg border border-pink-light bg-white hover:bg-peach/60 transition-colors font-semibold">
                    {uploading ? "Uploading..." : form.image ? "Change photo" : "Take / choose photo"}
                  </span>
                </label>
              </div>
            </div>
            <div>
              <p className={labelClass}>Flags</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <FlagCheckbox
                  id="hot-flag"
                  label="🔥 Hot"
                  checked={form.hot ?? false}
                  onChange={(v) => setForm((f) => ({ ...f, hot: v }))}
                />
                <FlagCheckbox
                  id="coming-soon-flag"
                  label="🔜 Coming soon"
                  checked={form.comingSoon ?? false}
                  onChange={(v) => setForm((f) => ({ ...f, comingSoon: v }))}
                />
                <FlagCheckbox
                  id="missing-flag"
                  label="❓ Missing"
                  checked={form.missing ?? false}
                  onChange={(v) => setForm((f) => ({ ...f, missing: v }))}
                />
                <FlagCheckbox
                  id="stolen-flag"
                  label="🚨 Stolen"
                  checked={form.stolen ?? false}
                  onChange={(v) => setForm((f) => ({ ...f, stolen: v }))}
                />
              </div>
              {form.stolen && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <label className="font-semibold text-caramel">Units lost</label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={form.stolenQty || ""}
                    onChange={(e) => setForm((f) => ({ ...f, stolenQty: parseInt(e.target.value, 10) || 0 }))}
                    className="w-16 border border-pink-light rounded-lg px-2 py-1 text-center font-bold tabular-nums focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={inputClass}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-pink-bold text-white px-6 py-2.5 rounded-full font-bold hover:bg-pink-mid active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
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

        {/* List */}
        <section>
          <h2 className="text-xl font-bold text-chocolate mb-4">
            {isOwner ? "All Inventory" : "Your Inventory"}
            <span className="ml-2 text-sm font-semibold text-caramel tabular-nums">
              ({products.length})
            </span>
          </h2>
          {products.length === 0 ? (
            <p className="text-caramel">No products yet. Add one above!</p>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  isEditing={editId === p.id}
                  onRestock={() => openRestock(p)}
                  onEdit={() => startEdit(p)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FlagCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer text-chocolate font-semibold">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-pink-bold cursor-pointer"
      />
      {label}
    </label>
  );
}

function ProductRow({
  product: p,
  isEditing,
  onRestock,
  onEdit,
}: {
  product: Product;
  isEditing: boolean;
  onRestock: () => void;
  onEdit: () => void;
}) {
  const profit = p.price - (p.cost || 0);
  const lowStock = p.quantity > 0 && p.quantity <= 3;
  const soldOut = p.quantity === 0 && !p.missing && !p.stolen && !p.comingSoon;

  return (
    <div
      className={`bg-white rounded-xl border p-4 flex gap-4 transition-colors ${
        isEditing ? "border-pink-bold/40 ring-2 ring-pink-bold/20" : "border-pink-light"
      }`}
    >
      {p.image ? (
        <Image
          src={p.image}
          alt={p.name}
          width={64}
          height={64}
          unoptimized
          className="w-16 h-16 rounded-lg object-cover shrink-0 border border-pink-light"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-peach flex items-center justify-center text-2xl shrink-0 border border-pink-light">
          🍡
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-chocolate flex items-center gap-1.5 flex-wrap leading-tight">
            <span className="truncate">{p.name}</span>
            {p.hot && <span aria-label="Hot item">🔥</span>}
            {p.stolen && (
              <span className={chipAttention}>
                Stolen{p.stolenQty ? ` · ${p.stolenQty}` : ""}
              </span>
            )}
            {p.missing && !p.stolen && <span className={chipNeutral}>Missing</span>}
            {p.comingSoon && <span className={chipNeutral}>Coming soon</span>}
            {soldOut && <span className={chipNeutral}>Sold out</span>}
          </h3>

          <p className="text-sm text-caramel mt-1 tabular-nums">
            <span className="text-caramel/70">cost</span> ${(p.cost || 0).toFixed(2)}
            <span className="text-caramel/40 mx-1">/</span>
            <span className="text-caramel/70">sell</span> ${p.price.toFixed(2)}
            {p.cost > 0 && (
              <span className="text-mint-bold font-semibold ml-1.5">
                +${profit.toFixed(2)}
              </span>
            )}
            <span className="text-caramel/40 mx-1.5">·</span>
            <span className={lowStock ? "text-pink-bold font-semibold" : soldOut ? "text-pink-bold font-semibold" : ""}>
              {p.quantity} in stock
            </span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onRestock}
            className="px-4 py-1.5 rounded-full text-sm font-bold bg-mint-bold text-white hover:bg-mint-bold/90 active:scale-[0.97] transition-all"
          >
            + Restock
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-1.5 rounded-full text-sm font-semibold bg-pink-light text-pink-bold hover:bg-pink-mid hover:text-white active:scale-[0.97] transition-all"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
