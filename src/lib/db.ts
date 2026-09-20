import "server-only";
import { DatabaseSync } from "node:sqlite";
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { PRODUCTS } from "./products";

/**
 * SQLite via node:sqlite — real persistence, zero dependencies.
 *
 * The file lives in .data/ (gitignored). On a read-only host such as
 * Vercel you would swap this module for Postgres/Turso; every caller goes
 * through the helpers below, so nothing else changes.
 *
 * Cached on globalThis because dev hot-reload re-evaluates modules and we
 * must not open a second handle to the same file.
 */

const DB_PATH = path.join(process.cwd(), ".data", "arena.db");

declare global {
  // eslint-disable-next-line no-var
  var __arenaDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  if (globalThis.__arenaDb) return globalThis.__arenaDb;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  // Wait for a contended write instead of throwing immediately. Two
  // processes touching the same file is normal here — a production build
  // prerenders pages while the dev server is still holding a connection.
  db.exec("PRAGMA busy_timeout = 5000");

  // Rename and widen an older catalogue table before the CREATE TABLE
  // statements run, so they find it already in the current shape.
  migrateCatalogue(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('admin','customer')),
      created_at    TEXT NOT NULL
    );

    /* The catalogue. Was named "inventory" when products lived in code and
       this table only carried price and stock; it now owns the whole
       record, so products can be created from the admin panel. Older
       databases are renamed into this shape by migrateCatalogue(). */
    CREATE TABLE IF NOT EXISTS products (
      slug       TEXT PRIMARY KEY,
      sku        TEXT NOT NULL DEFAULT '',
      category   TEXT NOT NULL DEFAULT 'supplies',
      name       TEXT NOT NULL DEFAULT '',
      subject    TEXT NOT NULL DEFAULT '',
      year       INTEGER NOT NULL DEFAULT 0,
      sport      TEXT NOT NULL DEFAULT 'Basketball',
      price      INTEGER NOT NULL,
      compare_at INTEGER,
      stock      INTEGER NOT NULL,
      tagline    TEXT,
      accent     TEXT NOT NULL DEFAULT '#B5FF00',
      brand      TEXT,
      condition  TEXT,
      featured   INTEGER NOT NULL DEFAULT 0,
      hot        INTEGER NOT NULL DEFAULT 0,
      hidden     INTEGER NOT NULL DEFAULT 0,
      story      TEXT NOT NULL DEFAULT '[]',
      spec       TEXT NOT NULL DEFAULT '{}',
      image_url  TEXT,
      created_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                TEXT PRIMARY KEY,
      order_ref         TEXT NOT NULL,
      payment_intent_id TEXT UNIQUE,
      email             TEXT NOT NULL,
      customer_name     TEXT NOT NULL,
      amount            INTEGER NOT NULL,
      status            TEXT NOT NULL CHECK (status IN ('processing','shipped','delivered')),
      delivery          TEXT NOT NULL,
      address           TEXT NOT NULL,
      promo_code        TEXT,
      discount          INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discounts (
      code       TEXT PRIMARY KEY,
      type       TEXT NOT NULL CHECK (type IN ('flat','percent')),
      value      INTEGER NOT NULL,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      slug       TEXT NOT NULL,
      qty        INTEGER NOT NULL,
      unit_price INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
  `);

  // image_url is part of the products table now, and migrateCatalogue()
  // above adds it to any database that predates it — the old standalone
  // check lived here and broke once the table was renamed.

  globalThis.__arenaDb = db;
  seed(db);
  return db;
}

export function getDb(): DatabaseSync {
  return open();
}

/**
 * Typed row helpers. node:sqlite returns Record<string, SQLOutputValue>;
 * these keep the `as unknown as T` in one place instead of every caller.
 *
 * Rows come back with a NULL PROTOTYPE, which React Server Components
 * refuse to serialise ("Only plain objects... can be passed to Client
 * Components"). Panels that happen to spread their rows dodge this;
 * anything handing a row straight to a client component hits it. Both
 * helpers therefore rebuild each row as a plain object — one line here
 * instead of a trap for every future query.
 */
const plain = <T>(row: unknown): T => ({ ...(row as object) }) as T;

export function queryAll<T>(sql: string, ...params: unknown[]): T[] {
  const rows = getDb().prepare(sql).all(...(params as never[]));
  return rows.map((r) => plain<T>(r));
}

export function queryOne<T>(sql: string, ...params: unknown[]): T | undefined {
  const row = getDb().prepare(sql).get(...(params as never[]));
  return row === undefined ? undefined : plain<T>(row);
}

/* ---------- password hashing (stdlib scrypt) ---------- */

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  // Constant-time — a plain === would leak the hash a byte at a time.
  return timingSafeEqual(candidate, expected);
}

/* ---------- seed ---------- */

/**
 * Codes the shop opens with. `value` is cents for a flat discount and
 * whole percent for a percentage one — never a float, so there is no
 * rounding drift between what the customer is shown and what Stripe is
 * asked to charge.
 */
const SEED_DISCOUNTS: {
  code: string; type: "flat" | "percent"; value: number; active: number;
}[] = [
  { code: "WELCOME10", type: "percent", value: 10, active: 1 },
  { code: "ARENA25", type: "flat", value: 2500, active: 1 },
  { code: "VAULT15", type: "percent", value: 15, active: 0 },
];

/**
 * When a catalogue slug first entered stock.
 *
 * Only affects rows on their very first insert — `INSERT OR IGNORE` means
 * an existing row keeps the date it was already given. The storefront
 * shows a "New" badge for anything under a week old, so this is what
 * drives that badge rather than a hand-maintained flag that goes stale.
 *
 * The listed slugs are backdated a few days so the badge is visible in a
 * fresh demo database; everything else is dated well outside the window.
 */
const RECENT_ARRIVALS: Record<string, number> = {
  "2018-prizm-luka-doncic-base-psa-9": 1,
  "2021-topps-chrome-ucl-hobby-box": 3,
  "signed-mini-helmet-modern-qb": 5,
};

const DAY_MS = 86_400_000;

function addedAtFor(slug: string, nowIso: string): string {
  const daysAgo = RECENT_ARRIVALS[slug];
  const base = new Date(nowIso).getTime();
  // Anything not listed is dated 90 days back: outside the window, and
  // stable across restarts.
  return new Date(base - (daysAgo ?? 90) * DAY_MS).toISOString();
}

/**
 * Brings an older database up to the catalogue schema.
 *
 * Runs before the CREATE TABLE statements so the rename happens first and
 * `CREATE TABLE IF NOT EXISTS products` then finds the table already
 * there, complete with its data. Every step is guarded, so this is a
 * no-op on a database that is already current.
 */
function migrateCatalogue(db: DatabaseSync) {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as { name: string }[];
  const names = new Set(tables.map((t) => t.name));

  // The table used to be called `inventory` and held only price and stock.
  // Renaming keeps every row — prices, stock, uploaded images and the
  // created_at dates that drive the "New" badge.
  if (names.has("inventory") && !names.has("products")) {
    db.exec("ALTER TABLE inventory RENAME TO products");
    names.add("products");
  }
  if (!names.has("products")) return;

  const have = new Set(
    (db.prepare("PRAGMA table_info(products)").all() as { name: string }[])
      .map((c) => c.name),
  );
  const add: [string, string][] = [
    ["sku", "TEXT NOT NULL DEFAULT ''"],
    ["category", "TEXT NOT NULL DEFAULT 'supplies'"],
    ["name", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["year", "INTEGER NOT NULL DEFAULT 0"],
    ["sport", "TEXT NOT NULL DEFAULT 'Basketball'"],
    ["compare_at", "INTEGER"],
    ["tagline", "TEXT"],
    ["accent", "TEXT NOT NULL DEFAULT '#B5FF00'"],
    ["brand", "TEXT"],
    ["condition", "TEXT"],
    ["featured", "INTEGER NOT NULL DEFAULT 0"],
    ["hot", "INTEGER NOT NULL DEFAULT 0"],
    ["hidden", "INTEGER NOT NULL DEFAULT 0"],
    ["story", "TEXT NOT NULL DEFAULT '[]'"],
    ["spec", "TEXT NOT NULL DEFAULT '{}'"],
    ["created_at", "TEXT"],
    ["image_url", "TEXT"],
  ];
  for (const [col, decl] of add) {
    if (!have.has(col)) db.exec(`ALTER TABLE products ADD COLUMN ${col} ${decl}`);
  }
}

/**
 * The first admin account.
 *
 * Read from the environment so a deployed site is never standing on a
 * password that is published in this repository. Locally, where there is
 * no env file, it falls back to the documented development pair — but
 * only outside production: a production boot with no ADMIN_PASSWORD set
 * is a misconfiguration worth failing loudly for, not something to paper
 * over with a known password.
 */
function adminCredentials(): { email: string; password: string } {
  const email = process.env.ADMIN_EMAIL?.trim() || "admin@arena.test";
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_PASSWORD is not set. Refusing to seed a production database " +
          "with the development password.",
      );
    }
    return { email, password: "arena-admin-2026" };
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }
  return { email, password };
}

function seed(db: DatabaseSync) {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (userCount.c === 0) {
    const insert = db.prepare(
      "INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
    );
    const now = new Date().toISOString();
    const admin = adminCredentials();
    insert.run(randomUUID(), admin.email, "Arena Admin",
      hashPassword(admin.password), "admin", now);

    // Demo shopper, for the seeded order history. Not created in
    // production, where there is no reason for a known login to exist.
    if (process.env.NODE_ENV !== "production") {
      insert.run(randomUUID(), "customer@arena.test", "Sam Reyes",
        hashPassword("arena-customer-2026"), "customer", now);
    }
  }

  // Insert any catalogue slug that is not tracked yet. Runs every boot so
  // newly added products appear without wiping existing edits — an admin's
  // price change to an existing row is never clobbered.
  const nowIso = new Date().toISOString();

  /* Seed the starter catalogue. INSERT OR IGNORE, so a product an admin
     has since edited — or deleted — is never resurrected or clobbered. */
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
      (slug,sku,category,name,subject,year,sport,price,compare_at,stock,
       tagline,accent,brand,condition,featured,hot,hidden,story,spec,
       created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?)
  `);
  for (const p of PRODUCTS) {
    insertProduct.run(
      p.slug, p.sku, p.category, p.name, p.subject, p.year, p.sport,
      p.price, p.compareAt ?? null, p.stock, p.tagline ?? null, p.accent,
      p.brand ?? null, p.condition ?? null, p.featured ? 1 : 0, p.hot ? 1 : 0,
      JSON.stringify(p.story ?? []), JSON.stringify(p.spec ?? {}),
      addedAtFor(p.slug, nowIso), nowIso,
    );
  }

  /* Rows that predate the catalogue columns carry the defaults from the
     ALTER, so their copy is filled in from the seed data once. Only empty
     columns are touched — an admin's own edits are left alone. */
  const hydrate = db.prepare(`
    UPDATE products SET
      sku = CASE WHEN sku = '' THEN ? ELSE sku END,
      category = CASE WHEN name = '' THEN ? ELSE category END,
      subject = CASE WHEN subject = '' THEN ? ELSE subject END,
      year = CASE WHEN year = 0 THEN ? ELSE year END,
      sport = CASE WHEN name = '' THEN ? ELSE sport END,
      compare_at = COALESCE(compare_at, ?),
      tagline = COALESCE(tagline, ?),
      accent = CASE WHEN name = '' THEN ? ELSE accent END,
      brand = COALESCE(brand, ?),
      condition = COALESCE(condition, ?),
      featured = CASE WHEN name = '' THEN ? ELSE featured END,
      hot = CASE WHEN name = '' THEN ? ELSE hot END,
      story = CASE WHEN story = '[]' THEN ? ELSE story END,
      spec = CASE WHEN spec = '{}' THEN ? ELSE spec END,
      name = CASE WHEN name = '' THEN ? ELSE name END
    WHERE slug = ?
  `);
  for (const p of PRODUCTS) {
    hydrate.run(
      p.sku, p.category, p.subject, p.year, p.sport, p.compareAt ?? null,
      p.tagline ?? null, p.accent, p.brand ?? null, p.condition ?? null,
      p.featured ? 1 : 0, p.hot ? 1 : 0,
      JSON.stringify(p.story ?? []), JSON.stringify(p.spec ?? {}),
      p.name, p.slug,
    );
  }
  // Orders predating the promo system get the two columns added rather
  // than the table rebuilt, so existing order history survives.
  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  if (!orderCols.some((c) => c.name === "promo_code")) {
    db.exec("ALTER TABLE orders ADD COLUMN promo_code TEXT");
  }
  if (!orderCols.some((c) => c.name === "discount")) {
    db.exec("ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0");
  }

  // Starter codes. INSERT OR IGNORE, so an owner who deactivates or edits
  // one does not get it resurrected on the next boot.
  const insertDiscount = db.prepare(
    "INSERT OR IGNORE INTO discounts (code,type,value,active,created_at) VALUES (?,?,?,?,?)",
  );
  for (const d of SEED_DISCOUNTS) {
    insertDiscount.run(d.code, d.type, d.value, d.active, new Date().toISOString());
  }

  // Backfill rows that predate the column. Per-slug, not a blanket
  // timestamp — stamping every existing row with "now" would light up the
  // "New" badge on the entire catalogue.
  const backfill = db.prepare(
    "UPDATE products SET created_at = ? WHERE slug = ? AND created_at IS NULL",
  );
  for (const p of PRODUCTS) backfill.run(addedAtFor(p.slug, nowIso), p.slug);

  const orderCount = db.prepare("SELECT COUNT(*) AS c FROM orders").get() as { c: number };
  if (orderCount.c === 0) seedOrders(db);
}

const MOCK_CUSTOMERS: [string, string, string][] = [
  ["Sam Reyes", "customer@arena.test", "84 Dean Street, London, W1D 3SG, GB"],
  ["Marcus Webb", "m.webb@example.com", "1200 Lakeshore Dr, Chicago, IL 60611, US"],
  ["Elena Fischer", "e.fischer@example.com", "Kurfürstendamm 21, Berlin, 10719, DE"],
  ["Tom Okafor", "t.okafor@example.com", "55 King Street W, Toronto, M5X 1A9, CA"],
  ["Priya Nair", "p.nair@example.com", "Jumeirah Beach Rd, Dubai, 00000, AE"],
  ["Jordan Blake", "j.blake@example.com", "700 Bourke St, Melbourne, VIC 3008, AU"],
  ["Chloe Dubois", "c.dubois@example.com", "12 Rue Saint-Honoré, Paris, 75001, FR"],
  ["Ryan Patel", "r.patel@example.com", "88 Wall Street, New York, NY 10005, US"],
];

const STATUSES = ["processing", "shipped", "delivered"] as const;
const DELIVERIES = ["standard", "express", "vault"] as const;
const DELIVERY_COST: Record<string, number> = { standard: 2500, express: 5500, vault: 18000 };

/** Deterministic PRNG so the demo dataset is identical on every machine. */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOrders(db: DatabaseSync) {
  const rand = mulberry32(20260919);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

  const insertOrder = db.prepare(`
    INSERT INTO orders (id,order_ref,payment_intent_id,email,customer_name,amount,status,delivery,address,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id,slug,qty,unit_price) VALUES (?,?,?,?)",
  );

  // Weight toward the affordable end so the dataset looks like a real shop
  // rather than 28 consecutive seven-figure sales.
  const cheap = PRODUCTS.filter((p) => p.price <= 500000);
  const dear = PRODUCTS.filter((p) => p.price > 500000);

  for (let i = 0; i < 28; i++) {
    const [name, email, address] = pick(MOCK_CUSTOMERS);
    const delivery = pick(DELIVERIES);
    const daysAgo = Math.floor(rand() * 90);
    const created = new Date(Date.now() - daysAgo * 864e5 - Math.floor(rand() * 864e5));

    // Older orders have progressed further.
    const status =
      daysAgo > 45 ? "delivered" : daysAgo > 14 ? pick(["shipped", "delivered"] as const) : pick(STATUSES);

    const lineCount = 1 + Math.floor(rand() * 2);
    const chosen: typeof PRODUCTS = [];
    for (let j = 0; j < lineCount; j++) {
      const pool = rand() < 0.82 ? cheap : dear;
      const candidate = pick(pool);
      if (!chosen.find((c) => c.slug === candidate.slug)) chosen.push(candidate);
    }

    let amount = DELIVERY_COST[delivery];
    const lines = chosen.map((p) => {
      const qty = p.price < 100000 ? 1 + Math.floor(rand() * 3) : 1;
      amount += p.price * qty;
      return { slug: p.slug, qty, unit: p.price };
    });

    const id = randomUUID();
    insertOrder.run(
      id,
      `ARN-${String(1000 + i)}-${String(Math.floor(rand() * 9000) + 1000)}`,
      null,
      email, name, amount, status, delivery, address,
      created.toISOString(),
    );
    for (const l of lines) insertItem.run(id, l.slug, l.qty, l.unit);
  }
}
