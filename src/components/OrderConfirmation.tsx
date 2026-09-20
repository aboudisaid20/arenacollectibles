"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Copy, Check } from "@phosphor-icons/react";
import { ButtonLink } from "./ui";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/types";

/**
 * Confirmation screen.
 *
 * Also clears the cart on mount. The inline success path already clears
 * before navigating, but a 3DS redirect leaves and returns, so this is
 * the backstop that guarantees the cart is empty once an order exists.
 */
export function OrderConfirmation({
  orderRef,
  amount,
  email,
  demo,
}: {
  orderRef: string;
  amount: number | null;
  email: string | null;
  demo?: boolean;
}) {
  const { clear, ready } = useCart();
  const [copied, setCopied] = useState(false);
  const clearedRef = useRef(false);

  // Must wait for `ready`. On mount the provider has not read localStorage
  // yet, so the cart looks empty — clearing then does nothing and
  // hydration promptly restores the items. Clear once, after hydration.
  // Skipped in preview mode: looking at the design should not wipe a cart.
  useEffect(() => {
    if (!ready || demo || clearedRef.current) return;
    clearedRef.current = true;
    clear();
  }, [ready, demo, clear]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderRef);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the number is visible and selectable anyway */
    }
  };

  return (
    <div className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <CheckCircle size={30} weight="fill" aria-hidden="true" className="text-volt" />
          <p className="kicker text-volt">Payment received</p>
        </div>

        <h1 className="mt-5 text-[clamp(2.8rem,10vw,6.5rem)] leading-[0.85] text-chalk">
          Order confirmed
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-fog">
          {email ? (
            <>
              Confirmation is on its way to{" "}
              <span className="break-token text-chalk">{email}</span>.{" "}
            </>
          ) : (
            <>Your payment went through. </>
          )}
          We pack and despatch within one business day — tracked, insured
          and signature-bound.
        </p>

        {/* Tracking number — the thing people come back for */}
        <div className="mt-10 border-2 border-volt bg-volt/5 p-6 md:p-8">
          <p className="kicker text-volt">Your tracking number</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <p className="tnum break-token font-display text-[clamp(1.8rem,6vw,3rem)] leading-none text-chalk">
              {orderRef}
            </p>
            <button
              type="button"
              onClick={copy}
              className="flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 border border-volt px-4 font-mono text-[0.7rem] uppercase tracking-wide text-volt transition-colors hover:bg-volt hover:text-void"
            >
              {copied ? (
                <Check size={14} weight="bold" aria-hidden="true" />
              ) : (
                <Copy size={14} weight="bold" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
              <span className="sr-only"> tracking number {orderRef}</span>
            </button>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-fog">
            Quote this on any message about the order. Keep it somewhere —
            it is the fastest way for us to find you.
          </p>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Tracking number copied to clipboard" : ""}
          </span>
        </div>

        {amount !== null && (
          <dl className="mt-8 border-t border-line">
            <div className="flex items-baseline justify-between border-b border-line py-4">
              <dt className="kicker text-steel">Total paid</dt>
              <dd className="tnum font-display text-2xl text-volt">
                {formatPrice(amount)}
              </dd>
            </div>
          </dl>
        )}

        {/* What happens next */}
        <section className="mt-10" aria-labelledby="next">
          <h2 id="next" className="font-display text-2xl text-chalk">
            What happens next
          </h2>
          <ol className="mt-5 space-y-4">
            {[
              { t: "We pull and re-check", d: "Every item is inspected once more against its listing before it is packed." },
              { t: "Packed and photographed", d: "Double-boxed with corner protection, and photographed at packing." },
              { t: "Tracking lands in your inbox", d: "Usually within one business day of the order." },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="tnum mt-0.5 shrink-0 font-mono text-xs text-volt">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-display text-lg uppercase text-chalk">{s.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-fog">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {demo && (
          <p className="mt-10 border border-line bg-pitch px-4 py-3 font-mono text-[0.68rem] leading-relaxed text-steel">
            Preview only — no payment was taken and no order exists. Add your
            Stripe test keys to see the real flow.
          </p>
        )}

        <div className="mt-12 flex flex-wrap gap-4">
          <ButtonLink href="/shop" size="lg" arrow>Keep shopping</ButtonLink>
          <ButtonLink href="/contact" variant="outline" size="lg">
            Question about this order
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
