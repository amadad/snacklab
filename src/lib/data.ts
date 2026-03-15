import { getCloudflareContext } from "@opennextjs/cloudflare";

export type Product = {
  id: string;
  name: string;
  cost: number;
  price: number;
  image: string;
  quantity: number;
  description: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  name: string;
  email: string;
  items: OrderItem[];
  status: "pending" | "complete";
  date: string;
};

async function getKV() {
  const { env } = await getCloudflareContext({ async: true });
  return env.STORE_KV;
}

export async function getProducts(): Promise<Product[]> {
  const kv = await getKV();
  return (await kv.get("products", "json")) ?? [];
}

export async function saveProducts(products: Product[]) {
  const kv = await getKV();
  await kv.put("products", JSON.stringify(products));
}

export async function getOrders(): Promise<Order[]> {
  const kv = await getKV();
  return (await kv.get("orders", "json")) ?? [];
}

export async function saveOrders(orders: Order[]) {
  const kv = await getKV();
  await kv.put("orders", JSON.stringify(orders));
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
