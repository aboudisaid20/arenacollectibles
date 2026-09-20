import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe-server";
import { liveProduct } from "@/lib/store";
import { deliveryById } from "@/lib/delivery";
import { priceDiscount } from "@/lib/discounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingItem {
  slug: string;
  qty: number;
}

/**
 * Creates (or updates) the PaymentIntent for a cart.
 *
 * SECURITY: the client sends slugs and quantities only. The amount is
 * recomputed here from the server's own catalogue and the server's own
 * delivery table. Any price, subtotal or total sent by the browser is
 * ignored — trusting a client-supplied amount is how you get a $1 Jordan.
 *
 * Quantities are also clamped to real stock, so the intent can never be
 * created for more than exists.
 *
 * The promo code is treated the same way: the browser sends the code
 * string only, and the saving is re-derived here. A code deactivated in
 * the admin panel between adding it and paying simply stops applying.
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Stripe keys are not set." },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: {
    items?: IncomingItem[];
    delivery?: string;
    paymentIntentId?: string;
    promoCode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  // --- Price the order from the server's own data ---------------------
  let subtotal = 0;
  const priced: { slug: string; qty: number; unit: number }[] = [];

  for (const raw of items) {
    if (typeof raw?.slug !== "string") continue;
    // Live catalogue, not the seed array: this is the number the
    // customer is charged, so it has to be the number an admin set.
    const product = liveProduct(raw.slug);
    if (!product) {
      return NextResponse.json(
        { error: "unknown_item", slug: raw.slug },
        { status: 400 },
      );
    }
    const qty = Math.max(1, Math.min(Number(raw.qty) || 1, product.stock));
    if (product.stock === 0) {
      return NextResponse.json(
        { error: "out_of_stock", slug: raw.slug },
        { status: 409 },
      );
    }
    subtotal += product.price * qty;
    priced.push({ slug: product.slug, qty, unit: product.price });
  }

  if (priced.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  const delivery = deliveryById(String(body.delivery ?? "standard"));

  // Discount goods only, never shipping, and only for a code that is
  // active right now.
  const promo =
    typeof body.promoCode === "string" && body.promoCode.trim()
      ? priceDiscount(body.promoCode, subtotal)
      : null;
  const discount = promo ? promo.amount : 0;

  // Stripe rejects anything under 50 cents. A 100%-off code on a cheap
  // cart would otherwise produce an intent that can never be confirmed,
  // so the floor is enforced here rather than surfacing as a Stripe error.
  const amount = Math.max(50, subtotal - discount + delivery.cost);

  // Stripe metadata values cap at 500 characters.
  const summary = priced
    .map((p) => `${p.slug}x${p.qty}`)
    .join(",")
    .slice(0, 480);

  try {
    // Reuse the intent across step edits so we don't leak a new one per
    // keystroke; the amount is re-derived every time regardless.
    if (body.paymentIntentId) {
      const updated = await stripe.paymentIntents.update(body.paymentIntentId, {
        amount,
        metadata: {
          items: summary,
          delivery: delivery.id,
          promo_code: promo?.row.code ?? "",
          discount: String(discount),
        },
      });
      return NextResponse.json({
        clientSecret: updated.client_secret,
        paymentIntentId: updated.id,
        amount,
        subtotal,
        discount,
        promoCode: promo?.row.code ?? null,
      });
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        items: summary,
        delivery: delivery.id,
        promo_code: promo?.row.code ?? "",
        discount: String(discount),
      },
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount,
      subtotal,
      discount,
      promoCode: promo?.row.code ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not start payment.";
    // Never echo the key or the raw Stripe error object to the client.
    console.error("[payment-intent]", message);
    return NextResponse.json({ error: "stripe_error" }, { status: 502 });
  }
}
