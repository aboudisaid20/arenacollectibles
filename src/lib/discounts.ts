import "server-only";
import { getDb, queryAll, queryOne } from "./db";
import {
  normalizeCode,
  discountAmount,
  type DiscountRow,
  type DiscountType,
} from "./discount-types";

/**
 * Server-side discount store.
 *
 * Nothing here trusts a code that arrived from the browser: every lookup
 * re-reads the row and re-checks `active`, so deactivating a code in the
 * admin panel takes effect on the next request even for a customer who
 * already has it applied in their cart.
 */

export function listDiscounts(): DiscountRow[] {
  return queryAll<DiscountRow>(
    "SELECT code, type, value, active, created_at FROM discounts ORDER BY active DESC, created_at DESC",
  );
}

/** An active code, or null. Case-insensitive by normalisation. */
export function findActiveDiscount(rawCode: string): DiscountRow | null {
  const code = normalizeCode(String(rawCode ?? ""));
  if (!code) return null;
  return (
    queryOne<DiscountRow>(
      "SELECT code, type, value, active, created_at FROM discounts WHERE code = ? AND active = 1",
      code,
    ) ?? null
  );
}

/**
 * Prices a code against a subtotal the *server* computed.
 *
 * Returns null for an unknown or deactivated code, so callers cannot
 * accidentally treat "no discount" as "discount of zero" and still show
 * the customer an applied code.
 */
export function priceDiscount(
  rawCode: string,
  subtotal: number,
): { row: DiscountRow; amount: number } | null {
  const row = findActiveDiscount(rawCode);
  if (!row) return null;
  return { row, amount: discountAmount(row, subtotal) };
}

export function createDiscount(input: {
  code: string;
  type: DiscountType;
  value: number;
}): { ok: true; code: string } | { ok: false; error: string } {
  const code = normalizeCode(input.code);
  if (code.length < 3) {
    return { ok: false, error: "Code must be at least 3 characters." };
  }
  if (!/^[A-Z0-9-]+$/.test(code)) {
    return { ok: false, error: "Use letters, numbers and hyphens only." };
  }
  if (input.type !== "flat" && input.type !== "percent") {
    return { ok: false, error: "Unknown discount type." };
  }

  const value = Math.round(Number(input.value));
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: "Value must be more than zero." };
  }
  // A percentage over 100 would price goods below zero; a flat code over
  // $100k is a fat-finger, not an offer.
  if (input.type === "percent" && value > 100) {
    return { ok: false, error: "A percentage cannot exceed 100." };
  }
  if (input.type === "flat" && value > 10_000_00) {
    return { ok: false, error: "That flat discount is too large." };
  }

  const existing = queryOne<{ code: string }>(
    "SELECT code FROM discounts WHERE code = ?",
    code,
  );
  if (existing) return { ok: false, error: `${code} already exists.` };

  getDb()
    .prepare(
      "INSERT INTO discounts (code,type,value,active,created_at) VALUES (?,?,?,1,?)",
    )
    .run(code, input.type, value, new Date().toISOString());

  return { ok: true, code };
}

export function setDiscountActive(rawCode: string, active: boolean): boolean {
  const code = normalizeCode(String(rawCode ?? ""));
  if (!code) return false;
  const res = getDb()
    .prepare("UPDATE discounts SET active = ? WHERE code = ?")
    .run(active ? 1 : 0, code);
  return Number(res.changes) > 0;
}

export function deleteDiscount(rawCode: string): boolean {
  const code = normalizeCode(String(rawCode ?? ""));
  if (!code) return false;
  const res = getDb().prepare("DELETE FROM discounts WHERE code = ?").run(code);
  return Number(res.changes) > 0;
}
