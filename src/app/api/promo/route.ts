import { NextResponse } from "next/server";
import { liveProduct } from "@/lib/store";
import { priceDiscount } from "@/lib/discounts";
import { PROMO_MAX_LENGTH } from "@/lib/discount-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Validates a promo code against a cart and returns the saving.
 *
 * SECURITY: like /api/payment-intent, this reads only slugs and
 * quantities from the browser. The subtotal it discounts is recomputed
 * here from live catalogue prices, so a client claiming a $9,000,000
 * subtotal cannot manufacture a $900,000 saving. The number returned is
 * for display; the amount actually charged is recomputed again at
 * payment, from this same function.
 */
export async function POST(request: Request) {
  let body: { code?: string; items?: { slug?: string; qty?: number }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const raw = typeof body.code === "string" ? body.code.trim() : "";
  if (!raw || raw.length > PROMO_MAX_LENGTH) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  let subtotal = 0;
  for (const it of items) {
    if (typeof it?.slug !== "string") continue;
    // Live price, so a code priced against an admin's edited price is
    // priced against the one the customer is actually charged.
    const product = liveProduct(it.slug);
    if (!product) continue;
    const qty = Math.max(1, Math.min(Number(it.qty) || 1, product.stock));
    subtotal += product.price * qty;
  }

  if (subtotal <= 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  const priced = priceDiscount(raw, subtotal);
  if (!priced) {
    // Deliberately one message for "no such code" and "deactivated":
    // enumerating which codes exist is not something to hand out.
    return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  }

  return NextResponse.json({
    code: priced.row.code,
    type: priced.row.type,
    value: priced.row.value,
    amount: priced.amount,
    subtotal,
  });
}
