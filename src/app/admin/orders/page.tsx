"use client";

import { useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { getFulfillmentSummary } from "@/lib/fulfillment";
import type { Order } from "@/lib/types";
import { useOrderActions } from "./useOrderActions";

export default function OrdersPage() {
  const actions = useOrderActions();
  const [filter, setFilter] = useState<"all" | "pending" | "partial" | "complete">("all");

  const filtered = filter === "all" ? actions.orders : actions.orders.filter((o) => o.status === filter);
  const pendingCount = actions.orders.filter((o) => o.status === "pending" || o.status === "partial").length;

  return (
    <div className="min-h-screen bg-peach/30">
      <nav className="bg-chocolate text-white px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-pink-light hover:text-white transition-colors">
            ← Back
          </Link>
          <span className="text-xl font-bold">Orders</span>
          {pendingCount > 0 && (
            <span className="bg-pink-bold text-white text-xs px-2 py-1 rounded-full">{pendingCount} pending</span>
          )}
        </div>
        <AdminLogoutButton />
      </nav>

      {/* Reconcile modal */}
      {actions.reconcileId && actions.activeOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border-2 border-pink-mid shadow-xl">
            <h2 className="text-xl font-bold text-chocolate mb-1">Reconcile Order</h2>
            <p className="text-sm text-caramel mb-4">
              Set what <strong>{actions.activeOrder.name}</strong> actually paid for. Any reductions will be
              returned to inventory.
            </p>
            <div className="space-y-3 mb-6">
              {actions.activeOrder.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-chocolate text-sm">{item.name}</p>
                    <p className="text-xs text-caramel">
                      Ordered: {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-caramel font-semibold">Actually paid:</label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={actions.reconcileItems[item.productId] ?? item.quantity}
                      onChange={(e) =>
                        actions.setReconcileItems((prev) => ({
                          ...prev,
                          [item.productId]: Math.min(
                            item.quantity,
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          ),
                        }))
                      }
                      className="w-16 border-2 border-pink-light rounded-lg px-2 py-1 text-center font-bold focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => actions.submitReconcile(actions.activeOrder!)}
                disabled={actions.saving}
                className="flex-1 bg-mint-bold text-white py-2 rounded-full font-bold hover:bg-mint-bold/80 transition-colors disabled:opacity-60"
              >
                {actions.saving ? "Saving..." : "Save & Mark Complete"}
              </button>
              <button
                onClick={() => actions.setReconcileId(null)}
                className="px-4 text-caramel hover:text-chocolate transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial delivery modal */}
      {actions.partialId && actions.partialOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border-2 border-caramel/40 shadow-xl">
            <h2 className="text-xl font-bold text-chocolate mb-1">📦 Record Delivery</h2>
            <p className="text-sm text-caramel mb-4">
              How many did you deliver to <strong>{actions.partialOrder.name}</strong> today? Set each item to what you actually handed off.
            </p>
            <div className="space-y-4 mb-6">
              {actions.partialOrder.items.map((item) => {
                const alreadyDelivered = item.delivered ?? 0;
                const remaining = item.quantity - alreadyDelivered;
                return (
                  <div key={item.productId}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div>
                        <p className="font-semibold text-chocolate text-sm">{item.name}</p>
                        <p className="text-xs text-caramel">
                          Ordered: {item.quantity} · Already delivered: {alreadyDelivered} · Still owed: {remaining}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-caramel font-semibold whitespace-nowrap">Delivering now:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={actions.partialDelivered[item.productId] ?? alreadyDelivered}
                          onChange={(e) =>
                            actions.setPartialDelivered((prev) => ({
                              ...prev,
                              [item.productId]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value, 10) || 0)),
                            }))
                          }
                          className="w-16 border-2 border-pink-light rounded-lg px-2 py-1 text-center font-bold focus:border-caramel focus:outline-none focus:ring-2 focus:ring-caramel/30"
                        />
                      </div>
                    </div>
                    <div className="w-full bg-pink-light rounded-full h-1.5">
                      <div
                        className="bg-mint-bold h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round(((actions.partialDelivered[item.productId] ?? alreadyDelivered) / item.quantity) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => actions.submitPartial(actions.partialOrder!)}
                disabled={actions.saving}
                className="flex-1 bg-chocolate text-white py-2 rounded-full font-bold hover:bg-chocolate/80 transition-colors disabled:opacity-60"
              >
                {actions.saving ? "Saving..." : "Save Delivery"}
              </button>
              <button
                onClick={() => actions.setPartialId(null)}
                className="px-4 text-caramel hover:text-chocolate transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign seller modal */}
      {actions.reassignId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border-2 border-pink-mid shadow-xl">
            <h2 className="text-lg font-bold text-chocolate mb-1">Reassign Seller</h2>
            <p className="text-sm text-caramel mb-4">Enter the seller code this order belongs to.</p>
            <input
              type="text"
              placeholder="e.g. DOODAR"
              value={actions.reassignSeller}
              onChange={(e) => actions.setReassignSeller(e.target.value.toUpperCase())}
              className="w-full border-2 border-pink-light rounded-lg px-3 py-2 font-bold uppercase mb-3 focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={actions.reassignNote}
              onChange={(e) => actions.setReassignNote(e.target.value)}
              className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm mb-4 focus:border-pink-bold focus:outline-none focus:ring-2 focus:ring-pink-bold/30"
            />
            <div className="flex gap-2">
              <button onClick={() => void actions.submitReassign()} disabled={actions.saving || !actions.reassignSeller.trim()} className="flex-1 bg-chocolate text-white py-2 rounded-full font-bold hover:bg-chocolate/80 transition-colors disabled:opacity-60">
                {actions.saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => actions.setReassignId(null)} className="px-4 text-caramel hover:text-chocolate transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Price correction modal */}
      {actions.priceCorrId && (() => { const o = actions.orders.find((x) => x.id === actions.priceCorrId); if (!o) return null; return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border-2 border-caramel/40 shadow-xl">
            <h2 className="text-lg font-bold text-chocolate mb-1">Price Correction</h2>
            <p className="text-sm text-caramel mb-4">Override line item prices. Leave blank to keep original.</p>
            <div className="space-y-3 mb-4">
              {o.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-chocolate text-sm">{item.name}</p>
                    <p className="text-xs text-caramel">Current: ${item.price.toFixed(2)}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={item.price.toFixed(2)}
                    value={actions.priceCorrItems[item.productId] ?? ""}
                    onChange={(e) => actions.setPriceCorrItems((prev) => ({ ...prev, [item.productId]: e.target.value }))}
                    className="w-24 border-2 border-pink-light rounded-lg px-2 py-1 text-center focus:border-caramel focus:outline-none focus:ring-2 focus:ring-caramel/30"
                  />
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="Note (optional, e.g. 'agreed discount')"
              value={actions.priceCorrNote}
              onChange={(e) => actions.setPriceCorrNote(e.target.value)}
              className="w-full border-2 border-pink-light rounded-lg px-3 py-2 text-sm mb-4 focus:border-caramel focus:outline-none focus:ring-2 focus:ring-caramel/30"
            />
            <div className="flex gap-2">
              <button onClick={() => void actions.submitPriceCorr(o)} disabled={actions.saving} className="flex-1 bg-chocolate text-white py-2 rounded-full font-bold hover:bg-chocolate/80 transition-colors disabled:opacity-60">
                {actions.saving ? "Saving..." : "Apply Correction"}
              </button>
              <button onClick={() => actions.setPriceCorrId(null)} className="px-4 text-caramel hover:text-chocolate transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      ); })()}

      {/* Audit log drawer */}
      {actions.auditOrderId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[70vh] flex flex-col border-2 border-caramel/30 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-pink-light">
              <h2 className="text-lg font-bold text-chocolate">Audit Log</h2>
              <button onClick={() => actions.setAuditOrderId(null)} className="text-caramel hover:text-chocolate text-xl font-bold">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {actions.auditLoading && <p className="text-sm text-caramel">Loading...</p>}
              {!actions.auditLoading && actions.auditEntries.length === 0 && <p className="text-sm text-caramel">No audit entries for this order yet.</p>}
              <div className="space-y-3">
                {[...actions.auditEntries].reverse().map((entry) => (
                  <div key={entry.id} className="text-sm border-l-2 border-caramel/30 pl-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-chocolate">{entry.action.replace(/_/g, " ")}</span>
                      <span className="text-xs text-caramel/60">by {entry.actor}</span>
                      <span className="text-xs text-caramel/40 ml-auto">{new Date(entry.date).toLocaleString()}</span>
                    </div>
                    {entry.note && <p className="text-xs text-caramel italic mb-0.5">{entry.note}</p>}
                    <div className="text-xs text-caramel/70 font-mono">
                      <span className="line-through">{JSON.stringify(entry.before)}</span>
                      {" → "}
                      <span className="text-mint-bold">{JSON.stringify(entry.after)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8">
        {actions.error && (
          <div role="alert" className="bg-white rounded-xl p-4 border-2 border-pink-bold/30 text-pink-bold mb-6">
            {actions.error}
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "partial", "complete"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                filter === f
                  ? "bg-pink-bold text-white"
                  : "bg-white text-caramel border-2 border-pink-light hover:border-pink-mid"
              }`}
            >
              {f === "partial" ? "Partially Delivered" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-caramel text-center py-12">No orders to show</p>
        ) : (
          <div className="space-y-4">
            {[...filtered].reverse().map((order) => (
              <OrderCard key={order.id} order={order} actions={actions} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order, actions: a }: { order: Order; actions: ReturnType<typeof useOrderActions> }) {
  const itemsTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fulfillmentFee = order.fulfillmentFee ?? 0;
  const orderTotal = itemsTotal + fulfillmentFee;

  return (
    <div
      className={`bg-white rounded-xl p-5 border-2 ${
        order.voided
          ? "border-caramel/20 opacity-60"
          : order.status === "pending"
          ? "border-pink-mid"
          : "border-mint-bold/40"
      }`}
    >
      <div className="flex items-start justify-between mb-3 gap-4">
        <div>
          <h3 className="font-bold text-chocolate text-lg">{order.name}</h3>
          <p className="text-sm text-caramel break-all">{order.email}</p>
          <p className="text-xs text-caramel mt-1">{getFulfillmentSummary(order.fulfillment)}</p>
          <p className="text-xs text-caramel/60 mt-1">{new Date(order.date).toLocaleString()}</p>
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0">
          {order.status !== "complete" && (
            <button
              onClick={() => a.openPartial(order)}
              disabled={a.saving}
              className="px-3 py-1 rounded-full text-sm font-semibold bg-caramel/20 text-chocolate hover:bg-caramel/40 transition-colors border border-caramel/30 disabled:opacity-60"
            >
              📦 Deliver
            </button>
          )}
          {order.status === "pending" && (
            <button
              onClick={() => a.openReconcile(order)}
              disabled={a.saving}
              className="px-3 py-1 rounded-full text-sm font-semibold bg-peach text-chocolate hover:bg-caramel/20 transition-colors border border-caramel/30 disabled:opacity-60"
            >
              Reconcile
            </button>
          )}
          {order.status === "complete" && (
            <button
              onClick={() => a.toggleStatus(order)}
              disabled={a.saving}
              className="px-3 py-1 rounded-full text-sm font-semibold bg-mint/60 text-mint-bold hover:bg-mint-bold hover:text-white transition-colors disabled:opacity-60"
            >
              Reopen
            </button>
          )}
          {a.isOwner && (
            <>
              <button
                onClick={() => { a.setReassignId(order.id); a.setReassignSeller(order.seller ?? ""); a.setReassignNote(""); }}
                disabled={a.saving}
                className="px-3 py-1 rounded-full text-sm font-semibold text-caramel hover:text-white hover:bg-caramel transition-colors border border-caramel/30 disabled:opacity-60"
              >
                ✏️ Seller
              </button>
              <button
                onClick={() => { a.setPriceCorrId(order.id); a.setPriceCorrItems({}); a.setPriceCorrNote(""); }}
                disabled={a.saving}
                className="px-3 py-1 rounded-full text-sm font-semibold text-caramel hover:text-white hover:bg-caramel transition-colors border border-caramel/30 disabled:opacity-60"
              >
                💲 Price
              </button>
              <button
                onClick={() => void a.ownerPatch({ op: order.voided ? "unvoid" : "void", id: order.id })}
                disabled={a.saving}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors border disabled:opacity-60 ${order.voided ? "border-mint-bold text-mint-bold hover:bg-mint-bold hover:text-white" : "border-caramel/30 text-caramel hover:bg-caramel/20"}`}
              >
                {order.voided ? "Unvoid" : "Void"}
              </button>
              <button
                onClick={() => void a.openAudit(order.id)}
                className="px-3 py-1 rounded-full text-sm font-semibold text-caramel/60 hover:text-chocolate transition-colors border border-caramel/20"
              >
                🕵️ Log
              </button>
            </>
          )}
          <button
            onClick={() => a.cancelOrder(order)}
            disabled={a.saving}
            className="px-3 py-1 rounded-full text-sm font-semibold text-caramel hover:text-white hover:bg-pink-bold transition-colors border border-caramel/30 disabled:opacity-60"
          >
            Cancel Order
          </button>
        </div>
      </div>
      {order.voided && (
        <div className="mb-2 text-xs font-bold text-caramel/60 bg-caramel/10 px-2 py-1 rounded-lg inline-block">
          ⚠️ Voided — excluded from stats
        </div>
      )}
      {a.isOwner && order.seller && (
        <div className="mb-2 text-xs text-caramel bg-peach px-2 py-1 rounded-lg inline-block ml-1">
          {order.seller}
        </div>
      )}
      {order.status === "partial" && (
        <div className="mb-2 text-xs font-bold text-caramel bg-peach px-2 py-1 rounded-lg inline-block">
          🕐 Partially delivered — still owed items below
        </div>
      )}
      <div className="space-y-1">
        {order.items.map((item) => {
          const del = item.delivered ?? 0;
          const remaining = item.quantity - del;
          return (
          <div key={item.productId} className="flex justify-between text-sm gap-4">
            <span className={remaining === 0 ? "text-caramel line-through" : "text-chocolate"}>
              {item.name} x{item.quantity}
              {del > 0 && del < item.quantity && (
                <span className="ml-1 text-xs text-caramel">(delivered {del}, still owe {remaining})</span>
              )}
              {del >= item.quantity && (
                <span className="ml-1 text-xs text-mint-bold">✓ done</span>
              )}
            </span>
            <span className="text-caramel">${(item.price * item.quantity).toFixed(2)}</span>
          </div>
          );
        })}
        {fulfillmentFee > 0 && (
          <div className="flex justify-between text-sm gap-4">
            <span className="text-chocolate">Home drop-off fee</span>
            <span className="text-caramel">${fulfillmentFee.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div className="border-t border-pink-light mt-3 pt-2 flex justify-between font-bold">
        <span className="text-chocolate">Total</span>
        <span className="text-pink-bold">${orderTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
