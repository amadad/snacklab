import { describe, expect, it } from "vitest";
import { calculateAdminMetrics } from "./adminMetrics";
import type { Order, Product } from "./types";

const products: Product[] = [
  { id: "chips", name: "Chips", cost: 1, price: 3, image: "", quantity: 10, description: "", seller: "ZAIN" },
  { id: "soda", name: "Soda", cost: 0.5, price: 2, image: "", quantity: 5, description: "", seller: "SYRA", stolenQty: 1 },
];

const orders: Order[] = [
  {
    id: "o1",
    name: "A",
    email: "a@example.com",
    status: "complete",
    date: "2026-01-01T00:00:00.000Z",
    seller: "ZAIN",
    items: [{ productId: "chips", name: "Chips", price: 3, quantity: 2, cost: 1 }],
  },
  {
    id: "o2",
    name: "B",
    email: "b@example.com",
    status: "complete",
    date: "2026-01-02T00:00:00.000Z",
    seller: "SYRA",
    items: [{ productId: "soda", name: "Soda", price: 2, quantity: 3, cost: 0.5 }],
  },
  {
    id: "o3",
    name: "C",
    email: "c@example.com",
    status: "pending",
    date: "2026-01-03T00:00:00.000Z",
    items: [{ productId: "chips", name: "Chips", price: 3, quantity: 1, cost: 1 }],
  },
];

describe("calculateAdminMetrics", () => {
  it("teaches seller math from only that seller's products and completed orders", () => {
    const metrics = calculateAdminMetrics(products, orders, { isOwner: false, seller: "ZAIN", platformFeePct: 20 });

    expect(metrics.revenue).toBe(6);
    expect(metrics.cost).toBe(2);
    expect(metrics.grossProfit).toBe(4);
    expect(metrics.platformFee).toBe(1.2);
    expect(metrics.netEarnings).toBe(2.8);
    expect(metrics.marginPct).toBe(67);
    expect(metrics.products.map((p) => p.id)).toEqual(["chips"]);
    expect(metrics.lessons[0].kidExplanation).toContain("customer money");
  });

  it("builds owner seller rows and inventory values", () => {
    const metrics = calculateAdminMetrics(products, orders, { isOwner: true, platformFeePct: 20 });

    expect(metrics.revenue).toBe(12);
    expect(metrics.cost).toBe(3.5);
    expect(metrics.sellerRows).toHaveLength(2);
    expect(metrics.sellerRows[0]).toMatchObject({ seller: "ZAIN", revenue: 6, netEarnings: 2.8 });
    expect(metrics.inventoryCostValue).toBe(12.5);
    expect(metrics.inventoryRetailValue).toBe(40);
    expect(metrics.stolenRetailValue).toBe(2);
    expect(metrics.topProducts[0].name).toBe("Soda");
  });
});
