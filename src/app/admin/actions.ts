"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import {
  createUser, setUserRole, setUserPassword, deleteUser, changeOwnPassword,
  type Role,
} from "@/lib/users";
import {
  setOrderStatus, updateInventory, ORDER_STATUSES,
  createProduct, deleteProduct, setProductHidden, productExists,
  nextSku, toSlug,
  type OrderStatus,
} from "@/lib/store";
import { CATEGORY_ORDER, type Category, type Sport } from "@/lib/types";
import { createDiscount, setDiscountActive, deleteDiscount } from "@/lib/discounts";
import type { DiscountType } from "@/lib/discount-types";

/**
 * Every action re-checks the session against the database.
 *
 * Server actions are addressable POST endpoints — being rendered only on
 * the admin page protects nothing. Middleware does not run for them
 * either, so this guard is the real boundary.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateOrderStatusAction(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  await requireAdmin();

  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return { ok: false, error: "Unknown status." };
  }
  if (typeof orderId !== "string" || orderId.length < 8) {
    return { ok: false, error: "Bad order id." };
  }

  const changed = setOrderStatus(orderId, status as OrderStatus);
  if (!changed) return { ok: false, error: "That order no longer exists." };

  revalidatePath("/admin");
  return { ok: true };
}

export async function updateInventoryAction(
  slug: string,
  patch: { price?: number; stock?: number },
): Promise<ActionResult> {
  await requireAdmin();

  if (typeof slug !== "string" || !slug) {
    return { ok: false, error: "Bad product." };
  }

  const clean: { price?: number; stock?: number } = {};
  if (patch.price !== undefined) {
    if (!Number.isFinite(patch.price) || patch.price < 0) {
      return { ok: false, error: "Price must be zero or more." };
    }
    clean.price = Math.round(patch.price);
  }
  if (patch.stock !== undefined) {
    if (!Number.isFinite(patch.stock) || patch.stock < 0) {
      return { ok: false, error: "Stock must be zero or more." };
    }
    clean.stock = Math.round(patch.stock);
  }
  if (clean.price === undefined && clean.stock === undefined) {
    return { ok: false, error: "Nothing to change." };
  }

  const row = updateInventory(slug, clean);
  if (!row) return { ok: false, error: "That product is not in inventory." };

  // Storefront reads live stock, so it has to be refreshed too.
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/");
  return { ok: true };
}

/* ---------- promo codes ---------- */

export async function createDiscountAction(input: {
  code: string;
  type: string;
  /** Whole percent, or dollars for a flat code — converted to cents here. */
  value: number;
}): Promise<ActionResult> {
  await requireAdmin();

  if (input.type !== "flat" && input.type !== "percent") {
    return { ok: false, error: "Pick a discount type." };
  }
  if (!Number.isFinite(input.value)) {
    return { ok: false, error: "Value must be a number." };
  }

  // Flat codes are entered in dollars and stored in cents, matching how
  // prices are handled in the inventory panel.
  const value =
    input.type === "flat"
      ? Math.round(input.value * 100)
      : Math.round(input.value);

  const res = createDiscount({
    code: String(input.code ?? ""),
    type: input.type as DiscountType,
    value,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin");
  return { ok: true };
}

export async function setDiscountActiveAction(
  code: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  if (typeof code !== "string" || !code.trim()) {
    return { ok: false, error: "Bad code." };
  }
  const changed = setDiscountActive(code, Boolean(active));
  if (!changed) return { ok: false, error: "That code no longer exists." };

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteDiscountAction(code: string): Promise<ActionResult> {
  await requireAdmin();

  if (typeof code !== "string" || !code.trim()) {
    return { ok: false, error: "Bad code." };
  }
  const changed = deleteDiscount(code);
  if (!changed) return { ok: false, error: "That code no longer exists." };

  revalidatePath("/admin");
  return { ok: true };
}

/* ---------- catalogue ---------- */

const SPORTS: Sport[] = [
  "Basketball", "Baseball", "Football", "Soccer", "Boxing", "Hockey", "Golf",
];

/**
 * Creates a product.
 *
 * Everything is re-derived here rather than trusted: the slug is rebuilt
 * from the name, the SKU is issued by the server, and price/stock are
 * clamped. The form is a convenience — this is the boundary.
 */
export async function createProductAction(input: {
  name: string;
  subject: string;
  category: string;
  sport: string;
  year: number;
  /** Dollars from the form; stored as cents. */
  price: number;
  compareAt?: number | null;
  stock: number;
  accent?: string;
  tagline?: string;
  story?: string;
  spec?: Record<string, string>;
  featured?: boolean;
  hot?: boolean;
}): Promise<ActionResult & { slug?: string }> {
  await requireAdmin();

  const name = String(input.name ?? "").trim();
  const subject = String(input.subject ?? "").trim();
  if (!name) return { ok: false, error: "Enter a product name." };
  if (!subject) return { ok: false, error: "Enter a title for the tile." };

  if (!CATEGORY_ORDER.includes(input.category as Category)) {
    return { ok: false, error: "Pick a category." };
  }
  const category = input.category as Category;

  if (!SPORTS.includes(input.sport as Sport)) {
    return { ok: false, error: "Pick a sport." };
  }

  const year = Math.round(Number(input.year));
  if (!Number.isFinite(year) || year < 1800 || year > 2200) {
    return { ok: false, error: "Enter a four-digit year." };
  }

  const priceCents = Math.round(Number(input.price) * 100);
  if (!Number.isFinite(priceCents) || priceCents < 0 || priceCents > 100_000_000_00) {
    return { ok: false, error: "Enter a price of zero or more." };
  }

  const compareCents =
    input.compareAt === undefined || input.compareAt === null || input.compareAt === 0
      ? null
      : Math.round(Number(input.compareAt) * 100);
  if (compareCents !== null && (!Number.isFinite(compareCents) || compareCents <= priceCents)) {
    return { ok: false, error: "The was-price has to be higher than the price." };
  }

  const stock = Math.round(Number(input.stock));
  if (!Number.isFinite(stock) || stock < 0 || stock > 100_000) {
    return { ok: false, error: "Enter a stock count of zero or more." };
  }

  // Slug comes from the subject and name so the URL reads properly; a
  // collision gets a numeric suffix rather than silently overwriting.
  const base = toSlug(`${subject} ${name}`) || toSlug(name);
  let slug = base;
  for (let n = 2; productExists(slug) && n < 100; n++) slug = `${base}-${n}`;
  if (productExists(slug)) return { ok: false, error: "Could not allocate a slug." };

  const accent = /^#[0-9a-f]{6}$/i.test(String(input.accent ?? ""))
    ? String(input.accent)
    : "#B5FF00";

  const story = String(input.story ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Only keep spec keys that carry a value, so a half-filled form does not
  // litter the record with empty strings.
  const spec: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.spec ?? {})) {
    const val = String(v ?? "").trim();
    if (val) spec[k] = val;
  }

  createProduct({
    slug,
    sku: nextSku(category),
    category,
    name,
    subject,
    year,
    sport: input.sport as Sport,
    price: priceCents,
    compareAt: compareCents,
    stock,
    tagline: String(input.tagline ?? "").trim() || undefined,
    accent,
    condition: category === "card" ? "graded" : null,
    featured: Boolean(input.featured),
    hot: Boolean(input.hot),
    story,
    spec,
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/shop");
  revalidatePath("/");
  return { ok: true, slug };
}

export async function setProductHiddenAction(
  slug: string,
  hidden: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  if (typeof slug !== "string" || !slug) return { ok: false, error: "Bad product." };

  const changed = setProductHidden(slug, Boolean(hidden));
  if (!changed) return { ok: false, error: "That product no longer exists." };

  revalidatePath("/admin/inventory");
  revalidatePath("/shop");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProductAction(slug: string): Promise<ActionResult> {
  await requireAdmin();
  if (typeof slug !== "string" || !slug) return { ok: false, error: "Bad product." };

  const res = deleteProduct(slug);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin/inventory");
  revalidatePath("/shop");
  revalidatePath("/");
  return { ok: true };
}

/* ---------- team ---------- */

export async function createUserAction(input: {
  email: string;
  name: string;
  role: string;
  password: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const res = createUser({
    email: input.email,
    name: input.name,
    role: input.role as Role,
    password: input.password,
  });
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function setUserRoleAction(
  id: string,
  role: string,
): Promise<ActionResult> {
  // The acting user is read from the session, never from the form — that
  // is what makes "you cannot demote yourself" hold.
  const me = await requireAdmin();

  const res = setUserRole(id, role as Role, me.id);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function setUserPasswordAction(
  id: string,
  password: string,
): Promise<ActionResult> {
  await requireAdmin();

  const res = setUserPassword(id, password);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();

  const res = deleteUser(id, me.id);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin/team");
  return { ok: true };
}

/**
 * Changing your own password.
 *
 * Deliberately not admin-gated: every signed-in account can do this for
 * itself, and the id comes from the session so one account can never
 * target another.
 */
export async function changeOwnPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Sign in first." };

  const res = changeOwnPassword(me.id, input.currentPassword, input.newPassword);
  if (!res.ok) return { ok: false, error: res.error };

  return { ok: true };
}
