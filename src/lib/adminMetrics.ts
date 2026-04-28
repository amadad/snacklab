import type { Order, Product } from "@/lib/types";

type MetricConfig = {
  isOwner: boolean;
  seller?: string;
  platformFeePct: number;
  defaultSeller?: string | null;
};

export type MoneyLesson = {
  label: string;
  value: number;
  kidExplanation: string;
};

export type ProductPerformance = {
  productId: string;
  name: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type SellerMetric = {
  seller: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  platformFee: number;
  netEarnings: number;
  orders: number;
};

export type AdminMetrics = {
  products: Product[];
  orders: Order[];
  completedOrders: Order[];
  revenue: number;
  cost: number;
  grossProfit: number;
  platformFee: number;
  netEarnings: number;
  marginPct: number;
  inventoryCostValue: number;
  inventoryRetailValue: number;
  stolenRetailValue: number;
  stolenCostValue: number;
  topProducts: ProductPerformance[];
  sellerRows: SellerMetric[];
  lessons: MoneyLesson[];
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function orderRevenue(order: Order) {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) + (order.fulfillmentFee ?? 0);
}

function itemCost(item: Order["items"][number], productCostById: Map<string, number>) {
  return item.cost ?? productCostById.get(item.productId) ?? 0;
}

function sellerForOrder(order: Order, sellerByProductId: Map<string, string>, config: MetricConfig) {
  return order.seller || sellerByProductId.get(order.items[0]?.productId ?? "") || config.defaultSeller || "Store";
}

export function calculateAdminMetrics(allProducts: Product[], allOrders: Order[], config: MetricConfig): AdminMetrics {
  const visibleProducts = config.isOwner
    ? allProducts
    : allProducts.filter((product) => product.seller === config.seller);
  const visibleProductIds = new Set(visibleProducts.map((product) => product.id));
  const visibleOrders = config.isOwner
    ? allOrders
    : allOrders.filter((order) => order.items.some((item) => visibleProductIds.has(item.productId)));
  const completedOrders = visibleOrders.filter((order) => order.status === "complete" && !order.voided);

  const productCostById = new Map(allProducts.map((product) => [product.id, product.cost || 0]));
  const sellerByProductId = new Map(allProducts.flatMap((product) => product.seller ? [[product.id, product.seller] as const] : []));

  const revenue = completedOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
  const cost = completedOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + itemCost(item, productCostById) * item.quantity, 0),
    0
  );
  const grossProfit = revenue - cost;
  const platformFee = config.isOwner ? 0 : revenue * (config.platformFeePct / 100);
  const netEarnings = grossProfit - platformFee;

  const productPerformance = new Map<string, ProductPerformance>();
  for (const order of completedOrders) {
    for (const item of order.items) {
      const current = productPerformance.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        units: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      const lineRevenue = item.price * item.quantity;
      const lineCost = itemCost(item, productCostById) * item.quantity;
      current.units += item.quantity;
      current.revenue += lineRevenue;
      current.cost += lineCost;
      current.profit += lineRevenue - lineCost;
      productPerformance.set(item.productId, current);
    }
  }

  const sellerMap = new Map<string, SellerMetric>();
  if (config.isOwner) {
    for (const order of completedOrders) {
      const seller = sellerForOrder(order, sellerByProductId, config);
      const current = sellerMap.get(seller) ?? { seller, revenue: 0, cost: 0, grossProfit: 0, platformFee: 0, netEarnings: 0, orders: 0 };
      const sellerRevenue = orderRevenue(order);
      const sellerCost = order.items.reduce((sum, item) => sum + itemCost(item, productCostById) * item.quantity, 0);
      current.revenue += sellerRevenue;
      current.cost += sellerCost;
      current.grossProfit = current.revenue - current.cost;
      current.platformFee = current.revenue * (config.platformFeePct / 100);
      current.netEarnings = current.grossProfit - current.platformFee;
      current.orders += 1;
      sellerMap.set(seller, current);
    }
  }

  const inventoryCostValue = visibleProducts.reduce((sum, product) => sum + (product.cost || 0) * product.quantity, 0);
  const inventoryRetailValue = visibleProducts.reduce((sum, product) => sum + product.price * product.quantity, 0);
  const stolenRetailValue = visibleProducts.reduce((sum, product) => sum + (product.stolenQty ?? 0) * product.price, 0);
  const stolenCostValue = visibleProducts.reduce((sum, product) => sum + (product.stolenQty ?? 0) * (product.cost || 0), 0);

  return {
    products: visibleProducts,
    orders: visibleOrders,
    completedOrders,
    revenue: money(revenue),
    cost: money(cost),
    grossProfit: money(grossProfit),
    platformFee: money(platformFee),
    netEarnings: money(netEarnings),
    marginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
    inventoryCostValue: money(inventoryCostValue),
    inventoryRetailValue: money(inventoryRetailValue),
    stolenRetailValue: money(stolenRetailValue),
    stolenCostValue: money(stolenCostValue),
    topProducts: [...productPerformance.values()].sort((a, b) => b.profit - a.profit).slice(0, 6),
    sellerRows: [...sellerMap.values()].sort((a, b) => b.revenue - a.revenue),
    lessons: [
      { label: "Revenue", value: money(revenue), kidExplanation: "All the customer money collected before paying your costs." },
      { label: "Snack cost", value: money(cost), kidExplanation: "What you spent buying the snacks you already sold." },
      { label: "Gross profit", value: money(grossProfit), kidExplanation: "Revenue minus snack cost. This is the business's score before fees." },
      { label: "Net earnings", value: money(netEarnings), kidExplanation: "What you keep after snack cost and store fees." },
    ],
  };
}
