import type { OrderFulfillment } from "@/lib/fulfillment";

export type Product = {
  id: string;
  name: string;
  cost: number;
  price: number;
  image: string;
  quantity: number;
  description: string;
  hot?: boolean;
  missing?: boolean;
  stolen?: boolean;
  stolenQty?: number;
  comingSoon?: boolean;
  seller?: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  cost?: number;
  delivered?: number; // how many have been handed off so far
};

export type Order = {
  id: string;
  name: string;
  email: string;
  items: OrderItem[];
  fulfillment?: OrderFulfillment;
  fulfillmentFee?: number;
  status: "pending" | "partial" | "complete";
  date: string;
  seller?: string;
  voided?: boolean; // excluded from stats/earnings; record kept for audit
};

export type ItemRequest = {
  id: string;
  name: string;
  email: string;
  item: string;
  note: string;
  date: string;
};

export type AuditAction =
  | "reassign_seller"
  | "void_order"
  | "unvoid_order"
  | "price_correction"
  | "status_change"
  | "reconcile"
  | "partial_delivery"
  | "cancel_order";

export type AuditEntry = {
  id: string;
  orderId: string;
  action: AuditAction;
  actor: string; // seller code or "owner"
  date: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  note?: string;
};

/** Shape returned by GET /api/session for authenticated users */
export type ClientSession = {
  authenticated: boolean;
  seller?: string;
  role?: "owner" | "seller";
  platformFeePct?: number;
  defaultSeller?: string;
};
