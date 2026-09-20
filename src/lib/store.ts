import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, queryAll, queryOne } from "./db";
import type { Product, Category, Sport } from "./types";
import {
  ORDER_STATUSES as STATUSES,
  LOW_STOCK_THRESHOLD as LOW_THRESHOLD,
  LOW_STOCK_EXCLUDED,
  type OrderStatus,
  type InventoryRow,
  type OrderItemRow,
  type OrderRow,
  type OrderWithItems,
  type Metrics,
} from "./store-types";

/**
 * Read/write layer over the database.
 *
 * `PRODUCTS` remains the source of copy, imagery and specs; the database
 * owns the two things that change — price and stock. Everything on the
 * storefront reads through `liveProducts()` so an admin edit is reflected
 * immediately.
 */

export type {
  OrderStatus, InventoryRow, OrderItemRow, OrderRow, OrderWithItems, Metrics,
} from "./store-types";
export {
  ORDER_STATUSES,
  LOW_STOCK_THRESHOLD,
  LOW_STOCK_EXCLUDED,
  REGION_NAMES,
  regionLabel,
} from "./store-types";

/* ---------- catalogue ---------- */

/** One row of the products table, as SQLite returns it. */
interface ProductRow {
  slug: string;
  sku: string;
  category: string;
  name: string;
  subject: string;
  year: number;
  sport: string;
  price: number;
  compare_at: number | null;
  stock: number;
  tagline: string | null;
  accent: string;
  brand: string | null;
  condition: string | null;
  featured: number;
  hot: number;
  hidden: number;
  story: string;
  spec: string;
  image_url: string | null;
  created_at: string | null;
  updated_at: string;
}

const PRODUCT_COLUMNS = `
  slug, sku, category, name, subject, year, sport, price, compare_at, stock,
  tagline, accent, brand, condition, featured, hot, hidden, story, spec,
  image_url, created_at, updated_at
`;

/** Tolerant JSON parse — a hand-edited row must not take the shop down. */
function parseJson<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** Database row to the shape the storefront renders. */
function rowToProduct(r: ProductRow): Product {
  return {
    slug: r.slug,
    sku: r.sku,
    category: r.category,
    name: r.name,
    subject: r.subject,
    year: r.year,
    sport: r.sport,
    price: r.price,
    stock: r.stock,
    accent: r.accent,
    story: parseJson<string[]>(r.story, []),
    spec: parseJson<Record<string, unknown>>(r.spec, {}),
    ...(r.compare_at ? { compareAt: r.compare_at } : {}),
    ...(r.tagline ? { tagline: r.tagline } : {}),
    ...(r.brand ? { brand: r.brand } : {}),
    ...(r.condition ? { condition: r.condition } : {}),
    ...(r.featured ? { featured: true } : {}),
    ...(r.hot ? { hot: true } : {}),
    ...(r.image_url ? { image: r.image_url } : {}),
    ...(r.created_at ? { addedAt: r.created_at } : {}),
  } as Product;
}

export function inventoryMap(): Map<string, InventoryRow> {
  const rows = queryAll<InventoryRow>(
    "SELECT slug, price, stock, image_url, created_at, updated_at FROM products",
  );
  return new Map(rows.map((r) => [r.slug, r]));
}

/**
 * The catalogue, from the database.
 *
 * Products used to live in code with this table carrying only price and
 * stock; the table now owns the whole record so they can be created from
 * the admin panel. `PRODUCTS` in products.ts is the seed for a fresh
 * database and nothing more.
 *
 * Hidden rows are withheld from the storefront but still returned to the
 * admin panel via `allProducts()`.
 */
export function liveProducts(): Product[] {
  return queryAll<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products WHERE hidden = 0 ORDER BY created_at DESC, slug ASC`,
  ).map(rowToProduct);
}

/** Every product, hidden ones included. Admin only. */
export function allProducts(): (Product & { hidden: boolean })[] {
  return queryAll<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY created_at DESC, slug ASC`,
  ).map((r) => ({ ...rowToProduct(r), hidden: r.hidden === 1 }));
}

export function liveProduct(slug: string): Product | undefined {
  const row = queryOne<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products WHERE slug = ? AND hidden = 0`,
    slug,
  );
  return row ? rowToProduct(row) : undefined;
}

/** Slugs the storefront should prerender. */
export function liveSlugs(): string[] {
  return queryAll<{ slug: string }>(
    "SELECT slug FROM products WHERE hidden = 0",
  ).map((r) => r.slug);
}

export function setProductImage(slug: string, url: string | null): boolean {
  const res = getDb()
    .prepare("UPDATE products SET image_url = ?, updated_at = ? WHERE slug = ?")
    .run(url, new Date().toISOString(), slug);
  return Number(res.changes) > 0;
}

export function updateInventory(
  slug: string,
  patch: { price?: number; stock?: number },
): InventoryRow | null {
  const db = getDb();
  const existing = queryOne<InventoryRow>(
    "SELECT slug, price, stock, image_url, created_at, updated_at FROM products WHERE slug = ?",
    slug,
  );
  if (!existing) return null;

  // Clamp server-side: the client is never trusted with bounds.
  const price =
    patch.price === undefined
      ? existing.price
      : Math.max(0, Math.min(Math.round(patch.price), 1_000_000_00));
  const stock =
    patch.stock === undefined
      ? existing.stock
      : Math.max(0, Math.min(Math.round(patch.stock), 100_000));

  db.prepare("UPDATE products SET price = ?, stock = ?, updated_at = ? WHERE slug = ?")
    .run(price, stock, new Date().toISOString(), slug);

  return {
    slug, price, stock,
    image_url: existing.image_url,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };
}

/* ---------- catalogue writes (admin) ---------- */

export interface ProductInput {
  slug: string;
  sku: string;
  category: Category;
  name: string;
  subject: string;
  year: number;
  sport: Sport;
  price: number;
  compareAt?: number | null;
  stock: number;
  tagline?: string;
  accent?: string;
  brand?: string | null;
  condition?: string | null;
  featured?: boolean;
  hot?: boolean;
  story?: string[];
  spec?: Record<string, unknown>;
}

/** Trim to a slug: lowercase, alphanumerics and single hyphens. */
export function toSlug(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function productExists(slug: string): boolean {
  return Boolean(
    queryOne<{ slug: string }>("SELECT slug FROM products WHERE slug = ?", slug),
  );
}

/** Next free SKU in the ARN-<letter>-#### series, per category. */
export function nextSku(category: Category): string {
  const letter = { card: "C", wax: "W", signed: "S", supplies: "A" }[category];
  const rows = queryAll<{ sku: string }>(
    "SELECT sku FROM products WHERE sku LIKE ?",
    `ARN-${letter}-%`,
  );
  const highest = rows.reduce((max, r) => {
    const n = Number(r.sku.split("-")[2]);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `ARN-${letter}-${String(highest + 1).padStart(4, "0")}`;
}

export function createProduct(input: ProductInput): void {
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO products
      (slug,sku,category,name,subject,year,sport,price,compare_at,stock,
       tagline,accent,brand,condition,featured,hot,hidden,story,spec,
       created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?)
  `).run(
    input.slug, input.sku, input.category, input.name, input.subject,
    input.year, input.sport, input.price, input.compareAt ?? null, input.stock,
    input.tagline ?? null, input.accent ?? "#B5FF00",
    input.brand ?? null, input.condition ?? null,
    input.featured ? 1 : 0, input.hot ? 1 : 0,
    JSON.stringify(input.story ?? []), JSON.stringify(input.spec ?? {}),
    now, now,
  );
}

export function setProductHidden(slug: string, hidden: boolean): boolean {
  const res = getDb()
    .prepare("UPDATE products SET hidden = ?, updated_at = ? WHERE slug = ?")
    .run(hidden ? 1 : 0, new Date().toISOString(), slug);
  return Number(res.changes) > 0;
}

/**
 * Removes a product outright.
 *
 * Refused when the slug appears on an order: order_items keeps the slug so
 * a past order can still be read back, and deleting the product would turn
 * that history into an unresolvable reference. Hiding is the right move
 * for anything that has ever sold.
 */
export function deleteProduct(slug: string): { ok: true } | { ok: false; error: string } {
  const sold = queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM order_items WHERE slug = ?",
    slug,
  );
  if (sold && sold.n > 0) {
    return {
      ok: false,
      error: `${slug} appears on ${sold.n} order${sold.n === 1 ? "" : "s"}. Hide it instead.`,
    };
  }
  const res = getDb().prepare("DELETE FROM products WHERE slug = ?").run(slug);
  return Number(res.changes) > 0
    ? { ok: true }
    : { ok: false, error: "That product no longer exists." };
}

/* ---------- orders ---------- */

/** Slug lookup for order rows. Read per call so a product created or
 *  renamed in the admin panel is reflected immediately. */
function productIndex(): Map<string, Product> {
  return new Map(liveProductsAll().map((p) => [p.slug, p]));
}

/** Every product regardless of hidden state, for resolving order items. */
function liveProductsAll(): Product[] {
  return queryAll<ProductRow>(`SELECT ${PRODUCT_COLUMNS} FROM products`).map(rowToProduct);
}

/**
 * Country code off the end of a stored address.
 *
 * Addresses are written as a single joined string — ours and Stripe's
 * both end with the ISO country code — so the last comma-separated
 * segment is the region. Anything that is not a plain two-letter code
 * (including the "Not supplied" placeholder) reports as unknown rather
 * than inventing a country.
 */
function regionOf(address: string): string {
  const last = String(address ?? "").split(",").pop()?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(last) ? last : "??";
}

export function listOrders(): OrderWithItems[] {
  const index = productIndex();
  const db = getDb();
  const orders = queryAll<OrderRow>("SELECT * FROM orders ORDER BY created_at DESC");
  const items = queryAll<OrderItemRow & { order_id: string }>(
    "SELECT order_id, slug, qty, unit_price FROM order_items",
  );

  const byOrder = new Map<string, OrderWithItems["items"]>();
  for (const it of items) {
    const p = index.get(it.slug);
    const list = byOrder.get(it.order_id) ?? [];
    list.push({
      slug: it.slug,
      qty: it.qty,
      unit_price: it.unit_price,
      name: p?.name ?? it.slug,
      subject: p?.subject ?? it.slug,
      category: p?.category ?? "supplies",
    });
    byOrder.set(it.order_id, list);
  }

  return orders.map((o) => {
    const items = byOrder.get(o.id) ?? [];
    return {
      ...o,
      items,
      region: regionOf(o.address),
      categories: [...new Set(items.map((i) => i.category))],
    };
  });
}

export function setOrderStatus(id: string, status: OrderStatus): boolean {
  if (!STATUSES.includes(status)) return false;
  const res = getDb()
    .prepare("UPDATE orders SET status = ? WHERE id = ?")
    .run(status, id);
  return Number(res.changes) > 0;
}

/**
 * Records a completed Stripe order. Idempotent on payment_intent_id, so
 * a refresh of the confirmation page cannot create a duplicate.
 * Also decrements stock for what was bought.
 */
export function recordOrder(input: {
  paymentIntentId: string;
  orderRef: string;
  email: string;
  customerName: string;
  amount: number;
  delivery: string;
  address: string;
  items: { slug: string; qty: number }[];
  /** Code applied at payment, if any. Read back from Stripe metadata. */
  promoCode?: string | null;
  /** Cents taken off the goods subtotal. */
  discount?: number;
}): void {
  const db = getDb();
  const existing = queryOne<{ id: string }>(
    "SELECT id FROM orders WHERE payment_intent_id = ?",
    input.paymentIntentId,
  );
  if (existing) return;

  const index = productIndex();
  const id = randomUUID();
  db.exec("BEGIN");
  try {
    db.prepare(`
      INSERT INTO orders (id,order_ref,payment_intent_id,email,customer_name,amount,status,delivery,address,promo_code,discount,created_at)
      VALUES (?,?,?,?,?,?,'processing',?,?,?,?,?)
    `).run(
      id, input.orderRef, input.paymentIntentId, input.email,
      input.customerName || "Guest", input.amount, input.delivery,
      input.address, input.promoCode || null,
      Math.max(0, Math.round(input.discount ?? 0)),
      new Date().toISOString(),
    );

    const addItem = db.prepare(
      "INSERT INTO order_items (order_id,slug,qty,unit_price) VALUES (?,?,?,?)",
    );
    const dec = db.prepare(
      "UPDATE products SET stock = MAX(0, stock - ?), updated_at = ? WHERE slug = ?",
    );
    const now = new Date().toISOString();
    for (const it of input.items) {
      const p = index.get(it.slug);
      addItem.run(id, it.slug, it.qty, p?.price ?? 0);
      dec.run(it.qty, now, it.slug);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/* ---------- dashboard metrics ---------- */


export function metrics(): Metrics {
  const index = productIndex();
  const agg = queryOne<{ gross: number; n: number }>(
    "SELECT COALESCE(SUM(amount),0) AS gross, COUNT(*) AS n FROM orders",
  ) ?? { gross: 0, n: 0 };

  const lowRaw = queryAll<{ slug: string; stock: number }>(
    "SELECT slug, stock FROM products WHERE hidden = 0 AND stock <= ? ORDER BY stock ASC, slug ASC",
    LOW_THRESHOLD,
  );

  // Category lives in the catalogue, not the inventory table, so the
  // exclusion is applied here rather than in SQL.
  const low = lowRaw.filter((r) => {
    const p = index.get(r.slug);
    return p ? !LOW_STOCK_EXCLUDED.includes(p.category) : true;
  });

  return {
    grossRevenue: agg.gross,
    orderCount: agg.n,
    lowStock: low.map((r) => {
      const p = index.get(r.slug);
      return {
        slug: r.slug,
        subject: p?.subject ?? r.slug,
        name: p?.name ?? "",
        stock: r.stock,
      };
    }),
    outOfStockCount: low.filter((r) => r.stock === 0).length,
  };
}
