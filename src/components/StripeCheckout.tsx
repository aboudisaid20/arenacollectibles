"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { LockSimple } from "@phosphor-icons/react";
import { CheckoutForm, type CheckoutValues } from "./CheckoutForm";
import { useCart } from "@/lib/cart";

/**
 * The live payment path. Sits inside <Elements> and supplies CheckoutForm
 * with the Stripe element for section 4 and the confirm handler.
 */
export function StripeCheckout({
  delivery,
  setDelivery,
  paymentIntentId,
}: {
  delivery: string;
  setDelivery: (id: string) => void;
  paymentIntentId: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { items, clear, closeCheckout, promo } = useCart();

  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // PaymentElement tells us when the customer has actually finished
  // entering details — that is what gates the button, not just "mounted".
  const [complete, setComplete] = useState(false);
  const submittingRef = useRef(false);

  const pay = async (values: CheckoutValues) => {
    if (!stripe || !elements || submittingRef.current) return;
    submittingRef.current = true;
    setProcessing(true);
    setPayError(null);

    try {
      // Re-price server-side for the delivery actually chosen, then let
      // the element pick up the new amount. One round trip, at submit,
      // rather than on every radio click.
      if (paymentIntentId) {
        const res = await fetch("/api/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
            delivery,
            paymentIntentId,
            // Re-validated server-side; a code deactivated since it was
            // applied simply stops discounting.
            promoCode: promo?.code ?? null,
          }),
        });
        if (!res.ok) throw new Error("Could not update the order total.");
        await elements.fetchUpdates();
      }

      // Address and email ride along so they are attached to the payment
      // rather than thrown away with this component's state.
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/complete`,
          receipt_email: values.email.trim(),
          shipping: {
            name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
            phone: values.phone.trim() || undefined,
            address: {
              line1: values.address1.trim(),
              line2: values.address2.trim() || undefined,
              city: values.city.trim(),
              postal_code: values.postcode.trim(),
              country: values.country,
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        setPayError(error.message ?? "That payment could not be completed.");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        clear();
        closeCheckout();
        router.push(`/order/complete?payment_intent=${paymentIntent.id}`);
        return;
      }

      setPayError("Payment is still processing. Check your email for confirmation.");
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      submittingRef.current = false;
      setProcessing(false);
    }
  };

  return (
    <CheckoutForm
      delivery={delivery}
      setDelivery={setDelivery}
      processing={processing}
      payError={payError}
      paymentReady={Boolean(stripe) && ready}
      paymentComplete={complete}
      onPay={pay}
      paymentSlot={
        <div className="border border-line bg-pitch p-5">
          <p className="mb-4 flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-volt">
            <LockSimple size={13} weight="fill" aria-hidden="true" />
            Encrypted by Stripe
          </p>
          <PaymentElement
            onReady={() => setReady(true)}
            onChange={(e) => setComplete(e.complete)}
            options={{ layout: "tabs" }}
          />
        </div>
      }
    />
  );
}
