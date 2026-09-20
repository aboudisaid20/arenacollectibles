"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { Field, FieldRow, ErrorSummary } from "./ui/field";
import { PromoField } from "./PromoField";
import { Button } from "./ui";
import { ProductArtwork } from "./ProductArtwork";
import { useCart } from "@/lib/cart";
import { DELIVERY_OPTIONS, deliveryById } from "@/lib/delivery";
import { formatPrice } from "@/lib/types";

/**
 * One-screen checkout: four numbered sections, one submit.
 *
 * Presentational on purpose — it owns the fields and their validation but
 * knows nothing about Stripe. Section 4's contents and the pay handler are
 * injected, so the same layout renders whether Stripe is live or not yet
 * configured. Card entry happens inside Stripe's iframe; there are no card
 * inputs in this file.
 *
 * The form wraps BOTH columns so that the Place order button can live
 * under the order summary and still be a plain submit button — no `form`
 * attribute plumbing, and Enter from any field still works.
 */

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "AE", label: "United Arab Emirates" },
];

export interface CheckoutValues {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  country: string;
  phone: string;
}

type Values = Record<string, string>;

const EMPTY: Values = {
  email: "", firstName: "", lastName: "", address1: "", address2: "",
  city: "", postcode: "", country: "US", phone: "",
};

/** Keys are field ids, so the error summary can link straight to them. */
function validate(v: Values): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.email.trim()) e["co-email"] = "Enter an email so we can send your confirmation.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim()))
    e["co-email"] = "That email is missing an @ or a domain.";
  if (!v.firstName.trim()) e["co-firstName"] = "Enter your first name.";
  if (!v.lastName.trim()) e["co-lastName"] = "Enter your last name.";
  if (!v.address1.trim()) e["co-address1"] = "Enter your street address.";
  if (!v.city.trim()) e["co-city"] = "Enter your city.";
  if (!v.postcode.trim()) e["co-postcode"] = "Enter your postal code.";
  return e;
}

export function CheckoutForm({
  delivery,
  setDelivery,
  paymentSlot,
  onPay,
  processing = false,
  payError = null,
  /** Stripe.js loaded and the element mounted. */
  paymentReady = false,
  /** The PaymentElement reports the customer has finished entering details. */
  paymentComplete = false,
  /** Shown under the button when payment can never complete (no keys). */
  unavailableReason,
}: {
  delivery: string;
  setDelivery: (id: string) => void;
  paymentSlot: ReactNode;
  onPay: (values: CheckoutValues) => void | Promise<void>;
  processing?: boolean;
  payError?: string | null;
  paymentReady?: boolean;
  paymentComplete?: boolean;
  unavailableReason?: string;
}) {
  const { lines, subtotal, count, promo, discountedSubtotal } = useCart();

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const payErrorRef = useRef<HTMLParagraphElement>(null);

  const chosen = deliveryById(delivery);
  // Discount applies to goods only; shipping is charged in full. Floored
  // at zero by discountedSubtotal, so a large code cannot invert the total.
  const total = discountedSubtotal + chosen.cost;

  // Live validity, independent of whether fields have been touched. This
  // is what gates the button, so it must reflect the current values, not
  // the error state (which only populates on blur/submit).
  const missing = useMemo(() => validate(values), [values]);
  const detailsComplete = Object.keys(missing).length === 0;

  const canSubmit =
    detailsComplete && paymentReady && paymentComplete && !processing;

  const set = (k: string, id: string) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[id]) {
      const next = validate({ ...values, [k]: v });
      if (!next[id]) setErrors((e) => ({ ...e, [id]: "" }));
    }
  };
  const blur = (id: string) => () => {
    setTouched((t) => ({ ...t, [id]: true }));
    setErrors((e) => ({ ...e, [id]: validate(values)[id] ?? "" }));
  };
  const errFor = (id: string) => (touched[id] ? errors[id] || undefined : undefined);

  const errorList = Object.entries(errors).filter(([, v]) => v) as [string, string][];

  /** Tells the customer why the button is dimmed. */
  const hint = (): string => {
    if (processing) return "Do not close this window.";
    if (unavailableReason) return unavailableReason;
    if (!detailsComplete) {
      const n = Object.keys(missing).length;
      return `${n} more ${n === 1 ? "field" : "fields"} to fill in above.`;
    }
    if (!paymentReady) return "Loading secure payment…";
    if (!paymentComplete) return "Enter your card details to finish.";
    return `You will be charged ${formatPrice(total)} including ${chosen.label.toLowerCase()} shipping.`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (processing) return;

    // Still validated here: Enter can submit from any field, so the
    // disabled button is not the only gate.
    const found = validate(values);
    const real = Object.fromEntries(Object.entries(found).filter(([, v]) => v));
    setErrors(real);
    setTouched(Object.fromEntries(Object.keys(found).map((k) => [k, true])));

    if (Object.keys(real).length > 0) {
      requestAnimationFrame(() => {
        if (Object.keys(real).length > 1) summaryRef.current?.focus();
        else document.getElementById(Object.keys(real)[0])?.focus();
      });
      return;
    }
    if (!paymentReady || !paymentComplete) return;

    await onPay(values as unknown as CheckoutValues);
  };

  const placeOrder = (
    <>
      <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
        {processing ? (
          <>
            <CircleNotch size={17} weight="bold" aria-hidden="true" className="animate-spin" />
            Processing…
          </>
        ) : (
          `Place order · ${formatPrice(total)}`
        )}
      </Button>
      <p className="mt-2.5 text-center font-mono text-[0.66rem] leading-relaxed text-steel">
        {hint()}
      </p>
    </>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
        {/* ---------- Left: the four sections ---------- */}
        <div className="min-w-0 space-y-8">
          <ErrorSummary errors={errorList} summaryRef={summaryRef} />

          <Section n={1} title="Contact">
            <Field
              id="co-email" label="Email" type="email" inputMode="email"
              autoComplete="email" required value={values.email}
              onChange={set("email", "co-email")} onBlur={blur("co-email")}
              error={errFor("co-email")}
              hint="Confirmation, tracking and receipt all go here."
            />
          </Section>

          <Section n={2} title="Address">
            <FieldRow>
              <Field id="co-firstName" label="First name" autoComplete="given-name" required
                value={values.firstName} onChange={set("firstName", "co-firstName")}
                onBlur={blur("co-firstName")} error={errFor("co-firstName")} />
              <Field id="co-lastName" label="Last name" autoComplete="family-name" required
                value={values.lastName} onChange={set("lastName", "co-lastName")}
                onBlur={blur("co-lastName")} error={errFor("co-lastName")} />
            </FieldRow>
            <Field id="co-address1" label="Address" autoComplete="address-line1" required
              value={values.address1} onChange={set("address1", "co-address1")}
              onBlur={blur("co-address1")} error={errFor("co-address1")} />
            <Field id="co-address2" label="Apartment, suite (optional)"
              autoComplete="address-line2" value={values.address2}
              onChange={set("address2", "co-address2")} />
            <FieldRow>
              <Field id="co-city" label="City" autoComplete="address-level2" required
                value={values.city} onChange={set("city", "co-city")}
                onBlur={blur("co-city")} error={errFor("co-city")} />
              <Field id="co-postcode" label="Postal code" autoComplete="postal-code" required
                value={values.postcode} onChange={set("postcode", "co-postcode")}
                onBlur={blur("co-postcode")} error={errFor("co-postcode")} />
            </FieldRow>
            <FieldRow>
              <Field id="co-country" label="Country" autoComplete="country" options={COUNTRIES}
                value={values.country} onChange={set("country", "co-country")} />
              <Field id="co-phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel"
                value={values.phone} onChange={set("phone", "co-phone")}
                hint="For courier handover on high-value items." />
            </FieldRow>
          </Section>

          <Section n={3} title="Shipping">
            <fieldset className="space-y-3">
              <legend className="sr-only">Choose a shipping method</legend>
              {DELIVERY_OPTIONS.map((d) => {
                const active = delivery === d.id;
                return (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-center justify-between gap-4 border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-volt ${
                      active ? "border-volt bg-volt/5" : "border-line hover:border-line-hot"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input type="radio" name="delivery" value={d.id} checked={active}
                        onChange={() => setDelivery(d.id)} className="sr-only" />
                      <span aria-hidden="true"
                        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                          active ? "border-volt bg-volt" : "border-line-hot"
                        }`} />
                      <span>
                        <span className="block font-display text-lg uppercase text-chalk">{d.label}</span>
                        <span className="block text-sm text-fog">{d.detail}</span>
                      </span>
                    </span>
                    <span className="tnum shrink-0 font-mono text-sm text-chalk">
                      {formatPrice(d.cost)}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </Section>

          <Section n={4} title="Payment">{paymentSlot}</Section>

          {payError && (
            <p
              ref={payErrorRef} tabIndex={-1} role="alert"
              className="flex items-start gap-2 border border-flag/50 bg-flag/8 p-4 text-sm text-flag focus:outline-none"
            >
              <WarningCircle size={17} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
              {payError}
            </p>
          )}
        </div>

        {/* ---------- Right: summary + Place order ---------- */}
        <aside aria-labelledby="co-sum" className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-line bg-pitch p-5 md:p-6">
            <h3 id="co-sum" className="font-display text-xl text-chalk">
              Order · {count} {count === 1 ? "item" : "items"}
            </h3>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto border-b border-line pb-4">
              {lines.map((l) => (
                <li key={l.slug} className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 border border-line bg-void p-1">
                    <ProductArtwork product={l.product} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm uppercase text-chalk">
                      {l.product.subject}
                    </p>
                    <p className="tnum font-mono text-[0.66rem] text-steel">Qty {l.qty}</p>
                  </div>
                  <p className="tnum shrink-0 font-mono text-xs text-chalk">
                    {formatPrice(l.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-b border-line pb-4">
              <PromoField compact />
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-fog">Subtotal</dt>
                <dd className="tnum text-chalk">{formatPrice(subtotal)}</dd>
              </div>
              {promo && promo.amount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-volt">Discount · {promo.code}</dt>
                  <dd className="tnum text-volt">−{formatPrice(promo.amount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-fog">{chosen.label}</dt>
                <dd className="tnum text-chalk">{formatPrice(chosen.cost)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <p className="font-display text-lg text-chalk">Total</p>
              <p className="tnum font-display text-2xl text-volt">{formatPrice(total)}</p>
            </div>
            {promo && promo.amount > 0 && (
              <p className="mt-1.5 text-right font-mono text-[0.68rem] text-volt">
                You save {formatPrice(promo.amount)}
              </p>
            )}
          </div>

          {/* Desktop: rides along with the sticky summary. */}
          <div className="mt-4 hidden lg:block">{placeOrder}</div>
        </aside>
      </div>

      {/* Mobile: sticky to the bottom of the scrollport instead, so the
          button is on screen the whole way down. `sticky` rather than
          `fixed` — this lives inside a scrolling dialog, where `fixed`
          would be at the mercy of any ancestor containing block. */}
      <div className="sticky bottom-0 -mx-4 mt-8 border-t border-line bg-void/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md lg:hidden">
        {placeOrder}
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {processing ? "Processing your payment, please wait" : ""}
      </span>
    </form>
  );
}

/** Numbered section heading, one-page-checkout style. */
function Section({
  n, title, children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`sec-${n}`} className="space-y-5">
      <h3 id={`sec-${n}`} className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="tnum flex h-7 w-7 shrink-0 items-center justify-center bg-volt font-mono text-[0.8rem] font-semibold text-void"
        >
          {n}
        </span>
        <span className="font-display text-2xl uppercase text-chalk">{title}</span>
      </h3>
      {children}
    </section>
  );
}
