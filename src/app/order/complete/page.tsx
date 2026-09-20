import type { Metadata } from "next";
import type Stripe from "stripe";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { OrderConfirmation } from "@/components/OrderConfirmation";
import { ButtonLink } from "@/components/ui";
import { getStripe, stripeConfigured } from "@/lib/stripe-server";
import { orderNumber } from "@/lib/order-number";
import { recordOrder } from "@/lib/store";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

// Always fresh: this reads a live PaymentIntent.
export const dynamic = "force-dynamic";

type Search = Promise<{
  payment_intent?: string;
  redirect_status?: string;
  demo?: string;
}>;

export default async function OrderCompletePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { payment_intent: pi, demo } = await searchParams;

  // Preview of the confirmation design, available only while Stripe is
  // unconfigured — it cannot appear once real keys are in place.
  if (demo === "1" && !stripeConfigured()) {
    return (
      <OrderConfirmation
        orderRef={orderNumber("pi_preview_arena_demo")}
        amount={54225}
        email="you@example.com"
        demo
      />
    );
  }

  if (!pi) return <OrderProblem reason="missing" />;

  const stripe = getStripe();
  if (!stripe) return <OrderProblem reason="unconfigured" />;

  try {
    // The URL is not trusted. The order is only confirmed if Stripe says
    // this intent actually succeeded.
    const intent = await stripe.paymentIntents.retrieve(pi, {
      // Expanded so the billing email is available as a fallback.
      expand: ["latest_charge"],
    });

    if (intent.status !== "succeeded") {
      return <OrderProblem reason={intent.status} />;
    }

    /**
     * Persist the order so it appears in the admin dashboard, and
     * decrement stock. Idempotent on payment_intent_id, so refreshing
     * this page cannot duplicate the order or double-decrement.
     *
     * A Stripe webhook on payment_intent.succeeded is the production
     * answer — a customer can close the tab before this runs. This
     * covers the common path without exposing a public endpoint.
     */
    try {
      const sh = intent.shipping;
      const addr = sh?.address;
      recordOrder({
        paymentIntentId: intent.id,
        orderRef: orderNumber(intent.id),
        email: emailFrom(intent) ?? "unknown@arena.test",
        customerName: sh?.name ?? "Guest",
        amount: intent.amount,
        delivery: String(intent.metadata?.delivery ?? "standard"),
        address: addr
          ? [addr.line1, addr.line2, addr.city, addr.postal_code, addr.country]
              .filter(Boolean).join(", ")
          : "Not supplied",
        items: parseItems(String(intent.metadata?.items ?? "")),
        // Metadata was written by our own API when the amount was priced,
        // so it is the record of what was actually discounted.
        promoCode: intent.metadata?.promo_code || null,
        discount: Number(intent.metadata?.discount ?? 0) || 0,
      });
    } catch (e) {
      // Never block the customer's confirmation on a bookkeeping failure.
      console.error("[order-record]", e instanceof Error ? e.message : e);
    }

    return (
      <OrderConfirmation
        orderRef={orderNumber(intent.id)}
        amount={intent.amount}
        email={emailFrom(intent)}
      />
    );
  } catch {
    return <OrderProblem reason="not_found" />;
  }
}

/** Metadata format written by the payment-intent route: "slug xQty,...". */
function parseItems(raw: string): { slug: string; qty: number }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const at = part.lastIndexOf("x");
      if (at < 1) return null;
      const slug = part.slice(0, at);
      const qty = Number(part.slice(at + 1));
      if (!slug || !Number.isFinite(qty) || qty < 1) return null;
      return { slug, qty };
    })
    .filter((x): x is { slug: string; qty: number } => x !== null);
}

/** receipt_email first, then the expanded charge's billing email. */
function emailFrom(intent: Stripe.PaymentIntent): string | null {
  if (intent.receipt_email) return intent.receipt_email;
  const charge = intent.latest_charge;
  if (charge && typeof charge !== "string") {
    return charge.billing_details?.email ?? null;
  }
  return null;
}

function OrderProblem({ reason }: { reason: string }) {
  const copy: Record<string, { title: string; body: string }> = {
    missing: {
      title: "No order to show",
      body: "This page needs an order reference. If you have just paid, use the link in your confirmation email.",
    },
    unconfigured: {
      title: "Payments not configured",
      body: "Stripe keys are not set on this deployment, so no order can be looked up.",
    },
    not_found: {
      title: "We cannot find that order",
      body: "The reference did not match anything. If money left your account, contact us and we will sort it immediately.",
    },
    processing: {
      title: "Payment still processing",
      body: "Your bank has not finished confirming. This usually clears in a minute — your confirmation email will arrive either way.",
    },
    requires_payment_method: {
      title: "Payment was not completed",
      body: "The payment did not go through, so nothing was charged. Your cart is untouched — try again when ready.",
    },
  };
  const c = copy[reason] ?? copy.not_found;

  return (
    <div className="container-page py-20 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <WarningCircle
          size={40}
          weight="light"
          aria-hidden="true"
          className="mx-auto text-fog"
        />
        <h1 className="mt-6 text-[clamp(2.2rem,7vw,4rem)] leading-[0.9] text-chalk">
          {c.title}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-fog">{c.body}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/shop" size="lg" arrow>Back to shop</ButtonLink>
          <ButtonLink href="/contact" variant="outline" size="lg">
            Contact us
          </ButtonLink>
        </div>
        <p className="mt-8 font-mono text-[0.68rem] uppercase tracking-wide text-steel">
          Status: <span className="text-fog">{reason}</span>
        </p>
      </div>
    </div>
  );
}
