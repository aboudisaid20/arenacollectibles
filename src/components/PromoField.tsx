"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { CircleNotch, Tag, X } from "@phosphor-icons/react";
import { useCart } from "@/lib/cart";
import { discountLabel } from "@/lib/discount-types";
import { formatPrice } from "@/lib/types";

/**
 * Promo code entry, shared by the cart drawer and the checkout summary.
 *
 * Deliberately not a <form>: the checkout is itself one form, and nesting
 * forms is invalid HTML — the inner one is dropped by the parser and its
 * submit silently becomes the outer one's, which here would mean typing a
 * code and pressing Enter placed the order. Enter is handled on the input
 * instead, which keeps the keyboard behaviour without the nesting.
 */
export function PromoField({ compact = false }: { compact?: boolean }) {
  const {
    promo, promoPending, promoError, applyPromo, removePromo, count,
  } = useCart();
  const inputId = useId();
  const [value, setValue] = useState("");

  // Clear the field once a code lands, so the applied chip is the only
  // thing on screen claiming to be active.
  useEffect(() => { if (promo) setValue(""); }, [promo]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (promoPending) return;
    await applyPromo(value);
  };

  if (promo) {
    return (
      <div className={compact ? "" : "mt-1"}>
        <div className="flex items-center justify-between gap-3 border border-volt/45 bg-volt/8 px-3 py-2.5">
          <p className="flex min-w-0 items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-volt">
            <Tag size={14} weight="fill" aria-hidden="true" className="shrink-0" />
            <span className="truncate">{promo.code}</span>
            <span className="shrink-0 text-volt/75">· {discountLabel(promo)}</span>
          </p>
          <button
            type="button"
            onClick={removePromo}
            className="-mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-volt transition-colors hover:text-chalk"
          >
            <span className="sr-only">Remove promo code {promo.code}</span>
            <X size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>
        {/* Announced without stealing focus. */}
        <span role="status" aria-live="polite" className="sr-only">
          Promo code {promo.code} applied, {formatPrice(promo.amount)} off.
        </span>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "mt-1"}>
      <label htmlFor={inputId} className="kicker block text-steel">
        Promo code
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Stop the surrounding checkout form from submitting.
              e.preventDefault();
              void submit();
            }
          }}
          disabled={count === 0}
          placeholder="WELCOME10"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={promoError ? `${inputId}-err` : undefined}
          aria-invalid={promoError ? true : undefined}
          className={`h-11 min-w-0 flex-1 border bg-void px-3 font-mono text-sm uppercase tracking-[0.1em] text-chalk placeholder:normal-case placeholder:tracking-normal placeholder:text-steel focus:outline-none disabled:cursor-not-allowed disabled:text-steel ${
            promoError ? "border-flag" : "border-line focus:border-volt"
          }`}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={promoPending || count === 0 || !value.trim()}
          className="flex h-11 shrink-0 cursor-pointer items-center gap-2 border border-line-hot px-4 font-display text-sm uppercase tracking-wide text-chalk transition-colors hover:border-volt hover:text-volt disabled:cursor-not-allowed disabled:border-line disabled:text-steel disabled:hover:border-line disabled:hover:text-steel"
        >
          {promoPending ? (
            <>
              <CircleNotch size={14} weight="bold" aria-hidden="true" className="animate-spin" />
              <span className="sr-only">Checking code</span>
              Checking
            </>
          ) : (
            "Apply"
          )}
        </button>
      </div>
      {promoError && (
        <p
          id={`${inputId}-err`}
          role="alert"
          className="mt-2 font-mono text-[0.68rem] text-flag"
        >
          {promoError}
        </p>
      )}
    </div>
  );
}
