import { useState } from "react";
import type { Order, AuditEntry } from "@/lib/types";
import { useAdminData } from "@/hooks/useAdminData";

export function useOrderActions() {
  const admin = useAdminData({ products: true, orders: true });
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reconcile
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [reconcileItems, setReconcileItems] = useState<Record<string, number>>({});

  // Partial delivery
  const [partialId, setPartialId] = useState<string | null>(null);
  const [partialDelivered, setPartialDelivered] = useState<Record<string, number>>({});

  // Reassign seller
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignSeller, setReassignSeller] = useState("");
  const [reassignNote, setReassignNote] = useState("");

  // Price correction
  const [priceCorrId, setPriceCorrId] = useState<string | null>(null);
  const [priceCorrItems, setPriceCorrItems] = useState<Record<string, string>>({});
  const [priceCorrNote, setPriceCorrNote] = useState("");

  // Audit drawer
  const [auditOrderId, setAuditOrderId] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const session = admin.session;
  const error = localError ?? admin.error;
  const isOwner = session?.role === "owner";
  const mySeller = session?.seller;
  const myProductIds = new Set(admin.products.filter((p) => isOwner || p.seller === mySeller).map((p) => p.id));
  const orders = isOwner
    ? admin.orders
    : admin.orders.filter((o) => o.items.some((i) => myProductIds.has(i.productId)));

  function setError(msg: string | null) { setLocalError(msg); }
  async function load() { await admin.reload(); }

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
      if (!res.ok) throw new Error(data?.error ?? "Could not update order.");
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
      if (!res.ok) throw new Error(data?.error ?? "Could not cancel order.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order.");
    } finally {
      setSaving(false);
    }
  }

  function openReconcile(order: Order) {
    const defaults: Record<string, number> = {};
    for (const item of order.items) defaults[item.productId] = item.quantity;
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
      if (!res.ok) throw new Error(data?.error ?? "Could not reconcile order.");
      setReconcileId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reconcile order.");
    } finally {
      setSaving(false);
    }
  }

  function openPartial(order: Order) {
    const defaults: Record<string, number> = {};
    for (const item of order.items) defaults[item.productId] = item.delivered ?? 0;
    setPartialDelivered(defaults);
    setPartialId(order.id);
  }

  async function submitPartial(order: Order) {
    setSaving(true);
    setError(null);
    try {
      const delivered = order.items.map((item) => ({
        productId: item.productId,
        quantity: partialDelivered[item.productId] ?? (item.delivered ?? 0),
      }));
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: "partial", delivered }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save delivery.");
      setPartialId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save delivery.");
    } finally {
      setSaving(false);
    }
  }

  async function ownerPatch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReassign() {
    if (!reassignId || !reassignSeller.trim()) return;
    await ownerPatch({ op: "reassign_seller", id: reassignId, seller: reassignSeller.trim(), note: reassignNote || undefined });
    setReassignId(null);
    setReassignSeller("");
    setReassignNote("");
  }

  async function submitPriceCorr(order: Order) {
    const items = order.items
      .filter((i) => priceCorrItems[i.productId] !== undefined && priceCorrItems[i.productId] !== "")
      .map((i) => ({ productId: i.productId, price: parseFloat(priceCorrItems[i.productId]) }))
      .filter((i) => !isNaN(i.price));
    if (items.length === 0) return;
    await ownerPatch({ op: "price_correction", id: order.id, items, note: priceCorrNote || undefined });
    setPriceCorrId(null);
    setPriceCorrItems({});
    setPriceCorrNote("");
  }

  async function openAudit(orderId: string) {
    setAuditOrderId(orderId);
    setAuditLoading(true);
    setAuditEntries([]);
    try {
      const res = await fetch(`/api/audit?orderId=${orderId}`);
      setAuditEntries((await res.json()) as AuditEntry[]);
    } catch (e) { console.error("Failed to load audit log:", e); }
    finally { setAuditLoading(false); }
  }

  return {
    // Data
    orders, session, error, saving, isOwner,
    // Reconcile
    reconcileId, reconcileItems, setReconcileItems, setReconcileId,
    activeOrder: orders.find((o) => o.id === reconcileId),
    openReconcile, submitReconcile,
    // Partial delivery
    partialId, partialDelivered, setPartialDelivered, setPartialId,
    partialOrder: orders.find((o) => o.id === partialId),
    openPartial, submitPartial,
    // Owner actions
    reassignId, reassignSeller, reassignNote, setReassignId, setReassignSeller, setReassignNote,
    submitReassign,
    priceCorrId, priceCorrItems, priceCorrNote, setPriceCorrId, setPriceCorrItems, setPriceCorrNote,
    submitPriceCorr,
    ownerPatch,
    // Audit
    auditOrderId, auditEntries, auditLoading, setAuditOrderId, openAudit,
    // Actions
    toggleStatus, cancelOrder,
  };
}
