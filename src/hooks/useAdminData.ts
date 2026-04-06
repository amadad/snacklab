import { useEffect, useState } from "react";
import type { Product, Order, ItemRequest, ClientSession } from "@/lib/types";

type AdminData = {
  session: ClientSession | null;
  products: Product[];
  orders: Order[];
  requests: ItemRequest[];
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
};

type FetchConfig = {
  products?: boolean;
  orders?: boolean;
  requests?: boolean;
};

type FetchResult = {
  session: ClientSession;
  products: Product[];
  orders: Order[];
  requests: ItemRequest[];
};

async function fetchAdminData(config: FetchConfig): Promise<FetchResult> {
  const fetches: Promise<Response>[] = [fetch("/api/session")];
  if (config.products) fetches.push(fetch("/api/products"));
  if (config.orders) fetches.push(fetch("/api/orders"));
  if (config.requests) fetches.push(fetch("/api/requests"));

  const responses = await Promise.all(fetches);
  if (responses.some((r) => !r.ok)) {
    throw new Error("Could not load admin data.");
  }

  const data = await Promise.all(responses.map((r) => r.json()));
  let i = 0;
  const session = data[i++] as ClientSession;
  const products = config.products ? (data[i++] as Product[]) : [];
  const orders = config.orders ? (data[i++] as Order[]) : [];
  const requests = config.requests ? (data[i++] as ItemRequest[]) : [];

  return { session, products, orders, requests };
}

export function useAdminData(config: FetchConfig = { products: true }): AdminData {
  const [data, setData] = useState<FetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setError(null);
    try {
      const result = await fetchAdminData(config);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin data.");
    }
  }

  useEffect(() => {
    let active = true;
    fetchAdminData(config)
      .then((result) => { if (active) setData(result); })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load admin data.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    session: data?.session ?? null,
    products: data?.products ?? [],
    orders: data?.orders ?? [],
    requests: data?.requests ?? [],
    error,
    loading,
    reload,
  };
}
