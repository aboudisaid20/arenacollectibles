/**
 * Types and constants shared by server queries and client components.
 *
 * Deliberately free of `server-only` and of any node: import, because
 * the admin table and inventory panel are client components. Keeping
 * these here is what stops `store.ts` (and therefore SQLite) being
 * pulled into the browser bundle.
 */

import type { Category } from "./types";

export type OrderStatus = "processing" | "shipped" | "delivered";

export const ORDER_STATUSES: OrderStatus[] = ["processing", "shipped", "delivered"];

export const LOW_STOCK_THRESHOLD = 3;

/**
 * Categories left out of the low-stock alert.
 *
 * Graded cards are single copies — a stock of 1 is the normal, healthy
 * state for one, not a warning. Counting them made the alert fire on
 * almost the whole card catalogue and buried the supplies that genuinely
 * need reordering.
 */
export const LOW_STOCK_EXCLUDED: Category[] = ["card"];

/** Country codes seen on orders, mapped for display. Falls back to the code. */
export const REGION_NAMES: Record<string, string> = {
  GB: "United Kingdom",
  US: "United States",
  DE: "Germany",
  CA: "Canada",
  AE: "United Arab Emirates",
  AU: "Australia",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  JP: "Japan",
  CH: "Switzerland",
  IE: "Ireland",
  SE: "Sweden",
};

export function regionLabel(code: string): string {
  return REGION_NAMES[code] ?? code;
}

export interface InventoryRow {
  slug: string;
  price: number;
  stock: number;
  image_url: string | null;
  created_at: string | null;
  updated_at: string;
}

export interface OrderItemRow {
  slug: string;
  qty: number;
  unit_price: number;
}

export interface OrderRow {
  id: string;
  order_ref: string;
  payment_intent_id: string | null;
  email: string;
  customer_name: string;
  amount: number;
  status: OrderStatus;
  delivery: string;
  address: string;
  promo_code: string | null;
  discount: number;
  created_at: string;
}

export interface OrderWithItems extends OrderRow {
  items: (OrderItemRow & { name: string; subject: string; category: Category })[];
  /** ISO-3166 code parsed off the end of the stored address, or "??". */
  region: string;
  /** Distinct categories present in the order, for filtering. */
  categories: Category[];
}

export interface Metrics {
  grossRevenue: number;
  orderCount: number;
  lowStock: { slug: string; subject: string; name: string; stock: number }[];
  outOfStockCount: number;
}
