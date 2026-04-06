import { describe, it, expect } from "vitest";
import {
  parseProductInput,
  parseId,
  parseOrderInput,
  parseOrderMutation,
  parseOwnerPatch,
  parseDeleteOrderInput,
  parseItemRequestInput,
} from "./validation";

// ── parseProductInput ────────────────────────────

describe("parseProductInput", () => {
  const valid = {
    name: "Chips",
    cost: 1.5,
    price: 3.0,
    image: "https://example.com/img.png",
    quantity: 10,
    description: "Tasty chips",
  };

  it("accepts valid input", () => {
    const result = parseProductInput(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Chips");
      expect(result.value.cost).toBe(1.5);
      expect(result.value.price).toBe(3.0);
      expect(result.value.quantity).toBe(10);
    }
  });

  it("trims whitespace", () => {
    const result = parseProductInput({ ...valid, name: "  Chips  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Chips");
  });

  it("rejects non-object", () => {
    expect(parseProductInput(null).ok).toBe(false);
    expect(parseProductInput("string").ok).toBe(false);
    expect(parseProductInput(42).ok).toBe(false);
  });

  it("rejects missing name", () => {
    const result = parseProductInput({ ...valid, name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Name");
  });

  it("rejects name over 80 chars", () => {
    const result = parseProductInput({ ...valid, name: "x".repeat(81) });
    expect(result.ok).toBe(false);
  });

  it("rejects negative cost", () => {
    const result = parseProductInput({ ...valid, cost: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Cost");
  });

  it("rejects non-numeric price", () => {
    const result = parseProductInput({ ...valid, price: "abc" });
    expect(result.ok).toBe(false);
  });

  it("rounds money to cents", () => {
    const result = parseProductInput({ ...valid, price: 1.999 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.price).toBe(2.0);
  });

  it("rejects fractional quantity", () => {
    const result = parseProductInput({ ...valid, quantity: 3.5 });
    expect(result.ok).toBe(false);
  });

  it("rejects quantity over 9999", () => {
    const result = parseProductInput({ ...valid, quantity: 10000 });
    expect(result.ok).toBe(false);
  });

  it("defaults boolean flags to false", () => {
    const result = parseProductInput(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hot).toBe(false);
      expect(result.value.missing).toBe(false);
      expect(result.value.stolen).toBe(false);
      expect(result.value.comingSoon).toBe(false);
    }
  });

  it("accepts boolean flags when true", () => {
    const result = parseProductInput({ ...valid, hot: true, stolen: true, stolenQty: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hot).toBe(true);
      expect(result.value.stolen).toBe(true);
      expect(result.value.stolenQty).toBe(3);
    }
  });

  it("treats non-boolean flags as false", () => {
    const result = parseProductInput({ ...valid, hot: "yes" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.hot).toBe(false);
  });

  it("allows optional image and description", () => {
    const result = parseProductInput({
      name: valid.name,
      cost: valid.cost,
      price: valid.price,
      quantity: valid.quantity,
    });
    expect(result.ok).toBe(true);
  });
});

// ── parseId ──────────────────────────────────────

describe("parseId", () => {
  it("accepts valid id", () => {
    const result = parseId("abc123");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("abc123");
  });

  it("rejects empty string", () => {
    expect(parseId("").ok).toBe(false);
  });

  it("rejects non-string", () => {
    expect(parseId(123).ok).toBe(false);
    expect(parseId(null).ok).toBe(false);
  });

  it("rejects id over 120 chars", () => {
    expect(parseId("x".repeat(121)).ok).toBe(false);
  });
});

// ── parseOrderInput ──────────────────────────────

describe("parseOrderInput", () => {
  const validOrder = {
    name: "Student",
    email: "student@school.edu",
    items: [{ productId: "p1", quantity: 2 }],
    fulfillment: { method: "during-school" },
  };

  it("accepts valid order", () => {
    const result = parseOrderInput(validOrder);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Student");
      expect(result.value.email).toBe("student@school.edu");
      expect(result.value.items).toHaveLength(1);
    }
  });

  it("lowercases email", () => {
    const result = parseOrderInput({ ...validOrder, email: "ABC@SCHOOL.edu" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBe("abc@school.edu");
  });

  it("rejects invalid email", () => {
    const result = parseOrderInput({ ...validOrder, email: "notanemail" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("email");
  });

  it("rejects empty cart", () => {
    const result = parseOrderInput({ ...validOrder, items: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("empty");
  });

  it("rejects non-array items", () => {
    const result = parseOrderInput({ ...validOrder, items: "not-array" });
    expect(result.ok).toBe(false);
  });

  it("rejects quantity 0", () => {
    const result = parseOrderInput({
      ...validOrder,
      items: [{ productId: "p1", quantity: 0 }],
    });
    expect(result.ok).toBe(false);
  });

  it("merges duplicate product ids", () => {
    const result = parseOrderInput({
      ...validOrder,
      items: [
        { productId: "p1", quantity: 2 },
        { productId: "p1", quantity: 3 },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0].quantity).toBe(5);
    }
  });

  it("rejects invalid fulfillment method", () => {
    const result = parseOrderInput({
      ...validOrder,
      fulfillment: { method: "teleport" },
    });
    expect(result.ok).toBe(false);
  });

  it("requires time slot for after-school", () => {
    const result = parseOrderInput({
      ...validOrder,
      fulfillment: { method: "after-school" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("time slot");
  });

  it("accepts after-school with valid time slot", () => {
    const result = parseOrderInput({
      ...validOrder,
      fulfillment: { method: "after-school", timeSlot: "3:00-3:15" },
    });
    expect(result.ok).toBe(true);
  });

  it("requires location for house-dropoff", () => {
    const result = parseOrderInput({
      ...validOrder,
      fulfillment: { method: "house-dropoff", timeSlot: "3:00-3:15" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("address");
  });

  it("accepts house-dropoff with time + location", () => {
    const result = parseOrderInput({
      ...validOrder,
      fulfillment: {
        method: "house-dropoff",
        timeSlot: "3:00-3:15",
        locationDetails: "123 Main St",
      },
    });
    expect(result.ok).toBe(true);
  });
});

// ── parseOrderMutation ───────────────────────────

describe("parseOrderMutation", () => {
  it("accepts valid mutation", () => {
    const result = parseOrderMutation({ id: "o1", status: "complete" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("o1");
      expect(result.value.status).toBe("complete");
    }
  });

  it("rejects invalid status", () => {
    const result = parseOrderMutation({ id: "o1", status: "shipped" });
    expect(result.ok).toBe(false);
  });

  it("parses optional reconcile items", () => {
    const result = parseOrderMutation({
      id: "o1",
      status: "pending",
      items: [{ productId: "p1", quantity: 3 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
    }
  });

  it("parses optional delivered items", () => {
    const result = parseOrderMutation({
      id: "o1",
      status: "partial",
      delivered: [{ productId: "p1", quantity: 1 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.delivered).toHaveLength(1);
    }
  });

  it("rejects non-object", () => {
    expect(parseOrderMutation(null).ok).toBe(false);
  });
});

// ── parseOwnerPatch ──────────────────────────────

describe("parseOwnerPatch", () => {
  it("parses reassign_seller", () => {
    const result = parseOwnerPatch({ op: "reassign_seller", id: "o1", seller: "zain" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.op).toBe("reassign_seller");
      if (result.value.op === "reassign_seller") {
        expect(result.value.seller).toBe("ZAIN"); // uppercased
      }
    }
  });

  it("parses void", () => {
    const result = parseOwnerPatch({ op: "void", id: "o1", note: "test void" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.op).toBe("void");
  });

  it("parses unvoid", () => {
    const result = parseOwnerPatch({ op: "unvoid", id: "o1" });
    expect(result.ok).toBe(true);
  });

  it("parses price_correction", () => {
    const result = parseOwnerPatch({
      op: "price_correction",
      id: "o1",
      items: [{ productId: "p1", price: 2.5 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.value.op === "price_correction") {
      expect(result.value.items[0].price).toBe(2.5);
    }
  });

  it("rejects price_correction without items", () => {
    const result = parseOwnerPatch({ op: "price_correction", id: "o1", items: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown op", () => {
    const result = parseOwnerPatch({ op: "nuke", id: "o1" });
    expect(result.ok).toBe(false);
  });

  it("rejects null", () => {
    expect(parseOwnerPatch(null).ok).toBe(false);
  });
});

// ── parseDeleteOrderInput ────────────────────────

describe("parseDeleteOrderInput", () => {
  it("accepts valid input", () => {
    const result = parseDeleteOrderInput({ id: "o1", restoreStock: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.restoreStock).toBe(true);
    }
  });

  it("defaults restoreStock to false", () => {
    const result = parseDeleteOrderInput({ id: "o1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.restoreStock).toBe(false);
  });

  it("rejects non-object", () => {
    expect(parseDeleteOrderInput("x").ok).toBe(false);
  });
});

// ── parseItemRequestInput ────────────────────────

describe("parseItemRequestInput", () => {
  const valid = {
    name: "Student",
    email: "student@school.edu",
    item: "Pocky",
    note: "The strawberry flavor please",
  };

  it("accepts valid request", () => {
    const result = parseItemRequestInput(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Student");
      expect(result.value.item).toBe("Pocky");
    }
  });

  it("lowercases email", () => {
    const result = parseItemRequestInput({ ...valid, email: "ABC@SCHOOL.EDU" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBe("abc@school.edu");
  });

  it("rejects invalid email", () => {
    const result = parseItemRequestInput({ ...valid, email: "bad" });
    expect(result.ok).toBe(false);
  });

  it("allows empty note", () => {
    const result = parseItemRequestInput({ ...valid, note: "" });
    expect(result.ok).toBe(true);
  });

  it("rejects missing item", () => {
    const result = parseItemRequestInput({ ...valid, item: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects non-object", () => {
    expect(parseItemRequestInput(undefined).ok).toBe(false);
  });
});
