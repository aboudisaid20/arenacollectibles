"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutForm } from "./CheckoutForm";
import { StripeCheckout } from "./StripeCheckout";
import { Button } from "./ui";
import { useCart } from "@/lib/cart";
import { useDialog } from "@/lib/use-dialog";

/**
 * Checkout, overlaid on the main view.
 *
 * One screen, four numbered sections (contact, address, shipping,
 * payment), one submit. This shell owns the PaymentIntent and the
 * delivery choice; CheckoutForm owns the fields and the submit, and lives
 * inside <Elements> so a single button can validate the address and
 * confirm payment together.
 *
 * Stays mounted while closed so a part-filled address survives an
 * accidental dismissal — which is why there is no "discard changes?"
 * prompt: nothing is ever discarded.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const appearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#B5FF00",
    colorBackground: "#0A0A0A",
    colorText: "#FFFFFF",
    colorTextSecondary: "#A3A3A3",
    colorTextPlaceholder: "#8A8A8A",
    colorDanger: "#FF4D4D",
    borderRadius: "0px",
    spacingUnit: "4px",
    fontSizeBase: "16px",
    fontFamily: "Lora, Georgia, serif",
  },
  rules: {
    ".Input": { border: "1px solid #242427", boxShadow: "none", padding: "12px" },
    ".Input:focus": { border: "1px solid #B5FF00", boxShadow: "none", outline: "none" },
    ".Label": {
      color: "#A3A3A3",
      fontSize: "11px",
      textTransform: "uppercase",
      letterSpacing: "0.14em",
      fontFamily: "IBM Plex Mono, monospace",
    },
    ".Tab": { border: "1px solid #242427", boxShadow: "none" },
    ".Tab--selected": { border: "1px solid #B5FF00", color: "#B5FF00" },
  },
};

export function CheckoutOverlay() {
  const { count, items, checkoutOpen, closeCheckout, promo } = useCart();

  const [delivery, setDelivery] = useState("standard");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const intentRef = useRef<string | null>(null);

  const panelRef = useDialog(checkoutOpen, closeCheckout);

  // Stable key for the cart contents, so the intent is created once per
  // distinct cart rather than on every render.
  const cartKey = items.map((i) => `${i.slug}:${i.qty}`).join("|");

  const payload = useMemo(
    () => items.map((i) => ({ slug: i.slug, qty: i.qty })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cartKey],
  );

  // Create the intent when checkout opens with a cart. The amount is
  // re-derived server-side at submit for the chosen delivery, so the
  // intent does not need recreating when shipping changes.
  useEffect(() => {
    if (!checkoutOpen) return;
    if (!publishableKey) {
      setConfigured(false);
      return;
    }
    if (payload.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: payload,
            delivery: "standard",
            paymentIntentId: intentRef.current,
            promoCode: promo?.code ?? null,
          }),
        });
        if (res.status === 503) {
          if (!cancelled) setConfigured(false);
          return;
        }
        if (!res.ok) throw new Error(`Payment setup failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        intentRef.current = data.paymentIntentId;
        setIntentId(data.paymentIntentId);
        setClientSecret(data.clientSecret);
        setConfigured(true);
      } catch (e) {
        if (!cancelled) {
          setInitError(e instanceof Error ? e.message : "Payment setup failed.");
          setConfigured(true);
        }
      }
    })();

    return () => { cancelled = true; };
    // promo?.code is a dependency because the intent's amount has to
    // follow it — a wallet sheet quotes the intent, not our summary.
  }, [checkoutOpen, payload, promo?.code]);

  return (
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
        checkoutOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      inert={!checkoutOpen}
    >
      <div className="absolute inset-0 bg-void/92 backdrop-blur-md" aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        tabIndex={-1}
        className="absolute inset-0 overflow-y-auto overscroll-contain focus:outline-none"
      >
        <div className="mx-auto min-h-full w-full max-w-5xl px-4 pb-20 pt-5 md:px-8">
          {/* Bar */}
          <div className="sticky top-0 -mx-4 mb-8 flex items-center justify-between gap-4 border-b border-line bg-void/95 px-4 py-4 backdrop-blur-md md:-mx-8 md:px-8">
            <h2 id="checkout-title" className="font-display text-2xl text-chalk md:text-3xl">
              Checkout
            </h2>
            <button
              type="button"
              onClick={closeCheckout}
              className="-mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt"
            >
              <span className="sr-only">Close checkout</span>
              <X size={22} weight="bold" aria-hidden="true" />
            </button>
          </div>

          <div>
              {count === 0 ? (
                <EmptyState onClose={closeCheckout} />
              ) : clientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                  <StripeCheckout
                    delivery={delivery}
                    setDelivery={setDelivery}
                    paymentIntentId={intentId}
                  />
                </Elements>
              ) : configured === false || initError ? (
                /* Stripe unavailable: the checkout still renders in full.
                   Only section 4 degrades, so the structure is visible and
                   the address work is not thrown away. */
                <CheckoutForm
                  delivery={delivery}
                  setDelivery={setDelivery}
                  unavailableReason={
                    initError
                      ? "Payment could not be started. Your details are kept."
                      : "Add Stripe test keys to enable payment."
                  }
                  onPay={() => {}}
                  paymentSlot={
                    initError ? <InitError message={initError} /> : <SetupNotice />
                  }
                />
              ) : (
                <LoadingState />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="border border-line bg-pitch p-5">
          <div className="h-4 w-1/4 animate-pulse bg-deck" />
          <div className="mt-4 h-12 w-full animate-pulse bg-deck" />
        </div>
      ))}
      <p className="font-mono text-[0.68rem] uppercase tracking-wide text-steel">
        Loading secure checkout…
      </p>
    </div>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="border border-dashed border-line px-6 py-16 text-center">
      <h3 className="font-display text-3xl text-chalk">Nothing to check out</h3>
      <p className="mt-3 text-sm text-fog">Your cart is empty.</p>
      <Button variant="outline" className="mt-7" onClick={onClose}>
        Keep shopping
      </Button>
    </div>
  );
}

function InitError({ message }: { message: string }) {
  return (
    <div role="alert" className="border border-flag/50 bg-flag/8 p-5">
      <p className="font-display text-xl uppercase text-flag">
        Payment unavailable
      </p>
      <p className="mt-2 text-sm text-fog">{message}</p>
      <p className="mt-2 text-sm text-fog">
        Nothing has been charged. Your details above are kept — try again
        in a moment, or contact us and we will take the order directly.
      </p>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="border-2 border-dashed border-line-hot bg-pitch p-6 md:p-8">
      <p className="font-display text-2xl uppercase text-chalk">
        Add your Stripe test keys
      </p>
      <p className="mt-3 text-sm leading-relaxed text-fog">
        Checkout is wired and ready — it just needs keys. Create{" "}
        <code className="break-token bg-void px-1.5 py-0.5 font-mono text-[0.8rem] text-volt">
          .env.local
        </code>{" "}
        in the project root with your{" "}
        <strong className="text-chalk">test</strong> keys:
      </p>
      <pre className="mt-4 overflow-x-auto border border-line bg-void p-4 font-mono text-[0.72rem] leading-relaxed text-fog">
{`STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`}
      </pre>
      <p className="mt-4 text-sm leading-relaxed text-fog">
        Restart the dev server and the four sections appear, with Stripe
        handling section 4. Test card{" "}
        <span className="tnum font-mono text-chalk">4242 4242 4242 4242</span>,
        any future expiry, any CVC.
      </p>
      <p className="mt-4 font-mono text-[0.68rem] leading-relaxed text-steel">
        Meanwhile you can still{" "}
        <a href="/order/complete?demo=1" className="text-volt underline underline-offset-4">
          preview the order confirmation screen
        </a>
        .
      </p>
    </div>
  );
}
