import { getCloudflareContext } from "@opennextjs/cloudflare";
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

const PRODUCT_PREFIX = "product:";
const ORDER_PREFIX = "order:";
const REQUEST_PREFIX = "request:";
const AUDIT_PREFIX = "audit:";
const MIGRATION_KEY = "data:migrated:v2";

// In-memory flag: migration check runs at most once per worker instance,
// not on every KV call. Cuts ~50% of KV reads under normal traffic.
let _migrationDone = false;

async function getKV() {
  const { env } = await getCloudflareContext({ async: true });
  return env.STORE_KV;
}

async function maybeMigrateLegacyData() {
  const kv = await getKV();

  if (_migrationDone) return kv;

  const migrated = await kv.get(MIGRATION_KEY);
  if (migrated) {
    _migrationDone = true;
    return kv;
  }

  const legacyProducts = (await kv.get("products", "json")) as Product[] | null;
  if (Array.isArray(legacyProducts)) {
    await Promise.all(
      legacyProducts
        .filter((product) => typeof product?.id === "string" && product.id.length > 0)
        .map((product) => kv.put(`${PRODUCT_PREFIX}${product.id}`, JSON.stringify(product)))
    );
  }

  const legacyOrders = (await kv.get("orders", "json")) as Order[] | null;
  if (Array.isArray(legacyOrders)) {
    await Promise.all(
      legacyOrders
        .filter((order) => typeof order?.id === "string" && order.id.length > 0)
        .map((order) => kv.put(`${ORDER_PREFIX}${order.id}`, JSON.stringify(order)))
    );
  }

  await kv.put(MIGRATION_KEY, new Date().toISOString());
  _migrationDone = true;
  return kv;
}

// Internal helpers that accept an already-resolved KV handle to avoid
// redundant maybeMigrateLegacyData() calls within a single request.
async function _listKeysByPrefix(kv: KVNamespace, prefix: string) {
  const keys: string[] = [];
  let cursor: string | undefined;

  do {
    const result = await kv.list({ prefix, cursor });
    keys.push(...result.keys.map((key) => key.name));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return keys;
}

async function _getJson<T>(kv: KVNamespace, key: string) {
  return (await kv.get(key, "json")) as T | null;
}

async function _listJsonByPrefix<T>(kv: KVNamespace, prefix: string) {
  const keys = await _listKeysByPrefix(kv, prefix);
  const entries = await Promise.all(keys.map((key) => _getJson<T>(kv, key)));
  return entries.filter((entry) => entry !== null) as T[];
}

// Public helpers: resolve KV + migration once, then delegate.
async function listKeysByPrefix(prefix: string) {
  const kv = await maybeMigrateLegacyData();
  return _listKeysByPrefix(kv, prefix);
}

async function getJson<T>(key: string) {
  const kv = await maybeMigrateLegacyData();
  return _getJson<T>(kv, key);
}

async function putJson(key: string, value: unknown) {
  const kv = await maybeMigrateLegacyData();
  await kv.put(key, JSON.stringify(value));
}

async function deleteKey(key: string) {
  const kv = await maybeMigrateLegacyData();
  await kv.delete(key);
}

async function listJsonByPrefix<T>(prefix: string) {
  const kv = await maybeMigrateLegacyData();
  return _listJsonByPrefix<T>(kv, prefix);
}

export async function getProducts(): Promise<Product[]> {
  const products = await listJsonByPrefix<Product>(PRODUCT_PREFIX);
  return products.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProduct(id: string) {
  return getJson<Product>(`${PRODUCT_PREFIX}${id}`);
}

export async function saveProduct(product: Product) {
  await putJson(`${PRODUCT_PREFIX}${product.id}`, product);
}

export async function deleteProduct(id: string) {
  await deleteKey(`${PRODUCT_PREFIX}${id}`);
}

export async function getOrders(): Promise<Order[]> {
  const orders = await listJsonByPrefix<Order>(ORDER_PREFIX);
  return orders.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getOrder(id: string) {
  return getJson<Order>(`${ORDER_PREFIX}${id}`);
}

export async function saveOrder(order: Order) {
  await putJson(`${ORDER_PREFIX}${order.id}`, order);
}

export async function deleteOrder(id: string) {
  await deleteKey(`${ORDER_PREFIX}${id}`);
}

export async function getItemRequests(): Promise<ItemRequest[]> {
  const requests = await listJsonByPrefix<ItemRequest>(REQUEST_PREFIX);
  return requests.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveItemRequest(request: ItemRequest) {
  await putJson(`${REQUEST_PREFIX}${request.id}`, request);
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Audit log — append-only, keyed by timestamp+random so they list in order
export async function writeAuditEntry(entry: Omit<AuditEntry, "id" | "date">): Promise<AuditEntry> {
  const full: AuditEntry = {
    ...entry,
    id: genId(),
    date: new Date().toISOString(),
  };
  // Key: audit:<orderId>:<timestamp> so per-order queries are fast
  await putJson(`${AUDIT_PREFIX}${full.orderId}:${full.date}:${full.id}`, full);
  return full;
}

export async function getAuditLog(orderId?: string): Promise<AuditEntry[]> {
  const prefix = orderId ? `${AUDIT_PREFIX}${orderId}:` : AUDIT_PREFIX;
  const entries = await listJsonByPrefix<AuditEntry>(prefix);
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}
