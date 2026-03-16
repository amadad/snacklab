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
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  cost?: number;
};

export type Order = {
  id: string;
  name: string;
  email: string;
  items: OrderItem[];
  fulfillment?: OrderFulfillment;
  fulfillmentFee?: number;
  status: "pending" | "complete";
  date: string;
};

export type ItemRequest = {
  id: string;
  name: string;
  email: string;
  item: string;
  note: string;
  date: string;
};

const PRODUCT_PREFIX = "product:";
const ORDER_PREFIX = "order:";
const REQUEST_PREFIX = "request:";
const MIGRATION_KEY = "data:migrated:v2";

async function getKV() {
  const { env } = await getCloudflareContext({ async: true });
  return env.STORE_KV;
}

async function maybeMigrateLegacyData() {
  const kv = await getKV();
  const migrated = await kv.get(MIGRATION_KEY);
  if (migrated) {
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
  return kv;
}

async function listKeysByPrefix(prefix: string) {
  const kv = await maybeMigrateLegacyData();
  const keys: string[] = [];
  let cursor: string | undefined;

  do {
    const result = await kv.list({ prefix, cursor });
    keys.push(...result.keys.map((key) => key.name));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return keys;
}

async function getJson<T>(key: string) {
  const kv = await maybeMigrateLegacyData();
  return (await kv.get(key, "json")) as T | null;
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
  const keys = await listKeysByPrefix(prefix);
  const entries = await Promise.all(keys.map((key) => getJson<T>(key)));
  return entries.filter((entry) => entry !== null) as T[];
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
