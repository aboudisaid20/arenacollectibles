/**
 * Discount types and the pricing rule, kept free of `server-only` and of
 * any node: import so the cart drawer, the checkout summary and the admin
 * panel — all client components — can share them with the server.
 *
 * The maths lives here rather than in each caller so the price the
 * customer is shown and the amount sent to Stripe come from one function.
 */

export type DiscountType = "flat" | "percent";

export interface DiscountRow {
  code: string;
  type: DiscountType;
  /** Cents when `flat`, whole percent when `percent`. */
  value: number;
  /** SQLite has no boolean: 1 or 0. */
  active: number;
  created_at: string;
}

/** What the storefront is told about an applied code. */
export interface AppliedPromo {
  code: string;
  type: DiscountType;
  value: number;
  /** Cents off the subtotal, already clamped. */
  amount: number;
}

export const PROMO_MAX_LENGTH = 24;

/** Codes are stored and compared uppercase, so "welcome10" works. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, PROMO_MAX_LENGTH);
}

/**
 * Cents off a given subtotal.
 *
 * Clamped to the subtotal — a $25 flat code against a $10 cart takes the
 * total to zero, never negative. Percentages round down to the cent, so
 * the discount can never exceed its stated share.
 *
 * Shipping is deliberately outside this: discounts apply to goods only.
 */
export function discountAmount(
  d: Pick<DiscountRow, "type" | "value">,
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;
  const raw =
    d.type === "percent"
      ? Math.floor((subtotal * d.value) / 100)
      : d.value;
  return Math.max(0, Math.min(raw, subtotal));
}

/** "10% off" / "$25 off" — one label, used by every surface. */
export function discountLabel(d: Pick<DiscountRow, "type" | "value">): string {
  return d.type === "percent"
    ? `${d.value}% off`
    : `$${(d.value / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} off`;
}
