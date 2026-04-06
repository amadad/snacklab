import type { Product } from "@/lib/types";
import {
  isFulfillmentMethod,
  isValidTimeSlot,
  needsLocationDetails,
  needsTimeSlot,
  type OrderFulfillment,
} from "@/lib/fulfillment";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type ProductInput = Omit<Product, "id">;
export type OrderInput = {
  name: string;
  email: string;
  items: { productId: string; quantity: number }[];
  fulfillment: OrderFulfillment;
};
export type ItemRequestInput = {
  name: string;
  email: string;
  item: string;
  note: string;
};

type RecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null;
}

function cleanString(value: unknown, field: string, maxLength: number, required = true) {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) {
      return { ok: true as const, value: "" };
    }

    return { ok: false as const, error: `${field} must be text.` };
  }

  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    return { ok: false as const, error: `${field} is required.` };
  }

  if (trimmed.length > maxLength) {
    return { ok: false as const, error: `${field} must be ${maxLength} characters or fewer.` };
  }

  return { ok: true as const, value: trimmed };
}

function cleanMoney(value: unknown, field: string) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false as const, error: `${field} must be a valid non-negative number.` };
  }

  return { ok: true as const, value: Math.round(amount * 100) / 100 };
}

function cleanInteger(value: unknown, field: string, min = 0, max = 9999) {
  const quantity = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(quantity) || quantity < min || quantity > max) {
    return { ok: false as const, error: `${field} must be an integer between ${min} and ${max}.` };
  }

  return { ok: true as const, value: quantity };
}

function cleanBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseProductInput(input: unknown): ValidationResult<ProductInput> {
  if (!isRecord(input)) {
    return { ok: false, error: "Invalid product payload." };
  }

  const name = cleanString(input.name, "Name", 80);
  if (!name.ok) return name;

  const cost = cleanMoney(input.cost, "Cost");
  if (!cost.ok) return cost;

  const price = cleanMoney(input.price, "Price");
  if (!price.ok) return price;

  const image = cleanString(input.image ?? "", "Image URL", 500, false);
  if (!image.ok) return image;

  const quantity = cleanInteger(input.quantity, "Quantity", 0, 9999);
  if (!quantity.ok) return quantity;

  const description = cleanString(input.description ?? "", "Description", 500, false);
  if (!description.ok) return description;

  return {
    ok: true,
    value: {
      name: name.value,
      cost: cost.value,
      price: price.value,
      image: image.value,
      quantity: quantity.value,
      description: description.value,
      hot: cleanBoolean(input.hot),
      missing: cleanBoolean(input.missing),
      stolen: cleanBoolean(input.stolen),
      stolenQty: typeof input.stolenQty === "number" ? Math.max(0, Math.floor(input.stolenQty)) : 0,
      comingSoon: cleanBoolean(input.comingSoon),
    },
  };
}

export function parseId(input: unknown, field = "id"): ValidationResult<string> {
  const value = cleanString(input, field, 120);
  if (!value.ok) {
    return value;
  }

  return { ok: true, value: value.value };
}

export function parseOrderInput(input: unknown): ValidationResult<OrderInput> {
  if (!isRecord(input) || !Array.isArray(input.items)) {
    return { ok: false, error: "Invalid order payload." };
  }

  const name = cleanString(input.name, "Name", 80);
  if (!name.ok) return name;

  const email = cleanString(input.email, "Email", 120);
  if (!email.ok) return email;
  if (!isValidEmail(email.value)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  if (!isRecord(input.fulfillment) || !isFulfillmentMethod(input.fulfillment.method)) {
    return { ok: false, error: "Choose when and where you want to get your order." };
  }

  const timeSlot = cleanString(input.fulfillment.timeSlot ?? "", "Time slot", 40, false);
  if (!timeSlot.ok) return timeSlot;

  const locationDetails = cleanString(input.fulfillment.locationDetails ?? "", "Location details", 200, false);
  if (!locationDetails.ok) return locationDetails;

  if (needsTimeSlot(input.fulfillment.method) && !timeSlot.value) {
    return { ok: false, error: "Please choose an after-school time slot." };
  }

  if (timeSlot.value && !isValidTimeSlot(input.fulfillment.method, timeSlot.value)) {
    return { ok: false, error: "Choose a valid time slot." };
  }

  if (needsLocationDetails(input.fulfillment.method) && !locationDetails.value) {
    return { ok: false, error: "Please add the address or drop-off details." };
  }

  if (input.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const merged = new Map<string, number>();

  for (const item of input.items) {
    if (!isRecord(item)) {
      return { ok: false, error: "Invalid order item." };
    }

    const productId = cleanString(item.productId, "Product", 120);
    if (!productId.ok) return productId;

    const quantity = cleanInteger(item.quantity, "Quantity", 1, 99);
    if (!quantity.ok) return quantity;

    merged.set(productId.value, (merged.get(productId.value) ?? 0) + quantity.value);
  }

  return {
    ok: true,
    value: {
      name: name.value,
      email: email.value.toLowerCase(),
      fulfillment: {
        method: input.fulfillment.method,
        timeSlot: timeSlot.value,
        locationDetails: locationDetails.value,
      },
      items: Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity })),
    },
  };
}

export function parseOrderMutation(
  input: unknown
): ValidationResult<{ id: string; status: "pending" | "partial" | "complete"; items?: { productId: string; quantity: number }[]; delivered?: { productId: string; quantity: number }[] }> {
  if (!isRecord(input)) {
    return { ok: false, error: "Invalid order payload." };
  }

  const id = parseId(input.id);
  if (!id.ok) return id;

  if (input.status !== "pending" && input.status !== "partial" && input.status !== "complete") {
    return { ok: false, error: "Status must be pending, partial, or complete." };
  }

  // Parse optional reconcile items
  let items: { productId: string; quantity: number }[] | undefined;
  if (Array.isArray(input.items)) {
    items = [];
    for (const item of input.items) {
      if (!isRecord(item)) return { ok: false, error: "Invalid reconciled order item." };
      const productId = parseId(item.productId, "Product");
      if (!productId.ok) return productId;
      const quantity = cleanInteger(item.quantity, "Quantity", 0, 99);
      if (!quantity.ok) return quantity;
      items.push({ productId: productId.value, quantity: quantity.value });
    }
  }

  // Parse optional partial delivery quantities
  let delivered: { productId: string; quantity: number }[] | undefined;
  if (Array.isArray(input.delivered)) {
    delivered = [];
    for (const item of input.delivered) {
      if (!isRecord(item)) return { ok: false, error: "Invalid delivery item." };
      const productId = parseId(item.productId, "Product");
      if (!productId.ok) return productId;
      const quantity = cleanInteger(item.quantity, "Quantity", 0, 99);
      if (!quantity.ok) return quantity;
      delivered.push({ productId: productId.value, quantity: quantity.value });
    }
  }

  return { ok: true, value: { id: id.value, status: input.status, items, delivered } };
}

export type OwnerPatchInput =
  | { op: "reassign_seller"; id: string; seller: string; note?: string }
  | { op: "void"; id: string; note?: string }
  | { op: "unvoid"; id: string; note?: string }
  | { op: "price_correction"; id: string; items: { productId: string; price: number }[]; note?: string };

export function parseOwnerPatch(input: unknown): ValidationResult<OwnerPatchInput> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Invalid patch payload." };
  }
  const r = input as Record<string, unknown>;
  const id = parseId(r.id);
  if (!id.ok) return id;

  const note = typeof r.note === "string" ? r.note.trim().slice(0, 300) : undefined;

  if (r.op === "reassign_seller") {
    const seller = cleanString(r.seller, "Seller", 40);
    if (!seller.ok) return seller;
    return { ok: true, value: { op: "reassign_seller", id: id.value, seller: seller.value.toUpperCase(), note } };
  }

  if (r.op === "void") {
    return { ok: true, value: { op: "void", id: id.value, note } };
  }

  if (r.op === "unvoid") {
    return { ok: true, value: { op: "unvoid", id: id.value, note } };
  }

  if (r.op === "price_correction") {
    if (!Array.isArray(r.items) || r.items.length === 0) {
      return { ok: false, error: "price_correction requires at least one item." };
    }
    const items: { productId: string; price: number }[] = [];
    for (const item of r.items) {
      if (typeof item !== "object" || item === null) return { ok: false, error: "Invalid correction item." };
      const productId = parseId((item as Record<string, unknown>).productId, "Product");
      if (!productId.ok) return productId;
      const price = cleanMoney((item as Record<string, unknown>).price, "Price");
      if (!price.ok) return price;
      items.push({ productId: productId.value, price: price.value });
    }
    return { ok: true, value: { op: "price_correction", id: id.value, items, note } };
  }

  return { ok: false, error: "Unknown op. Must be reassign_seller, void, unvoid, or price_correction." };
}

export function parseDeleteOrderInput(input: unknown): ValidationResult<{ id: string; restoreStock: boolean }> {
  if (!isRecord(input)) {
    return { ok: false, error: "Invalid order payload." };
  }

  const id = parseId(input.id);
  if (!id.ok) return id;

  return {
    ok: true,
    value: {
      id: id.value,
      restoreStock: Boolean(input.restoreStock),
    },
  };
}

export function parseItemRequestInput(input: unknown): ValidationResult<ItemRequestInput> {
  if (!isRecord(input)) {
    return { ok: false, error: "Invalid request payload." };
  }

  const name = cleanString(input.name, "Name", 80);
  if (!name.ok) return name;

  const email = cleanString(input.email, "Email", 120);
  if (!email.ok) return email;
  if (!isValidEmail(email.value)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const item = cleanString(input.item, "Item", 120);
  if (!item.ok) return item;

  const note = cleanString(input.note ?? "", "Note", 500, false);
  if (!note.ok) return note;

  return {
    ok: true,
    value: {
      name: name.value,
      email: email.value.toLowerCase(),
      item: item.value,
      note: note.value,
    },
  };
}
