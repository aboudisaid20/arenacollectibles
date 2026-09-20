"use client";

import Link from "next/link";
import { X, Minus, Plus, Handbag } from "@phosphor-icons/react";
import { ProductArtwork } from "./ProductArtwork";
import { Button } from "./ui";
import { PromoField } from "./PromoField";
import { useCart } from "@/lib/cart";
import { useDialog } from "@/lib/use-dialog";
import { formatPrice } from "@/lib/types";

const FREE_SHIPPING_FROM = 25000; // cents

/**
 * Slide-out cart. This is a modal dialog, not just a panel that moves:
 * focus moves in, is trapped, Escape closes, focus returns to whatever
 * opened it. All of that lives in useDialog().
 *
 * The slide itself is a CSS transform (never width/left), so it composites
 * on the GPU and cannot cause layout shift. Under reduced motion the
 * transition collapses to ~0 via the global backstop in globals.css.
 */
export function CartDrawer() {
  const {
    lines, subtotal, count, setQty, remove,
    drawerOpen, closeDrawer, openCheckout, promo, discountedSubtotal,
  } = useCart();

  const panelRef = useDialog(drawerOpen, closeDrawer);

  // Free-shipping threshold is judged on what is actually paid for goods,
  // so a discount can push an order back below it rather than granting
  // free shipping the order no longer qualifies for.
  const shipping = discountedSubtotal >= FREE_SHIPPING_FROM ? 0 : 2500;
  const toFree = Math.max(0, FREE_SHIPPING_FROM - discountedSubtotal);

  return (
    <>
      {/* Scrim. Click-to-dismiss, and hidden from AT since Escape and the
          close button are the real affordances. */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={`fixed inset-0 z-[100] bg-void/80 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
        // `hidden` would break the slide transition, so the panel stays
        // mounted and is taken out of the tab order while closed.
        // React 19 supports `inert` as a real boolean — passing "" makes
        // React treat it as false, which silently leaves the panel tabbable.
        inert={!drawerOpen}
        className={`fixed right-0 top-0 z-[110] flex h-screen-d w-full max-w-[26rem] flex-col border-l border-line bg-void shadow-2xl transition-transform duration-[340ms] ease-[cubic-bezier(.22,1,.36,1)] focus:outline-none ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id="cart-drawer-title" className="font-display text-2xl text-chalk">
            Your cart
            {count > 0 && (
              <span className="tnum ml-2 text-volt">({count})</span>
            )}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="-mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt"
          >
            <span className="sr-only">Close cart</span>
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <Handbag size={40} weight="light" aria-hidden="true" className="text-steel" />
            <p className="mt-5 font-display text-3xl text-chalk">Nothing in here</p>
            <p className="mt-2 text-sm text-fog">
              The shelf moves fast. The good stuff doesn&rsquo;t sit long.
            </p>
            <Button variant="outline" className="mt-7" onClick={closeDrawer}>
              Keep shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Lines */}
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
              {lines.map((line) => (
                <li key={line.slug} className="flex gap-4 border-b border-line py-5">
                  <Link
                    href={`/product/${line.product.slug}`}
                    onClick={closeDrawer}
                    className="h-20 w-20 shrink-0 border border-line bg-pitch p-1.5"
                  >
                    <span className="sr-only">View {line.product.subject}</span>
                    <ProductArtwork product={line.product} className="h-full w-full" />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-lg leading-tight text-chalk">
                          {line.product.subject}
                        </p>
                        <p className="truncate text-xs text-fog">{line.product.name}</p>
                      </div>
                      <p className="tnum shrink-0 font-display text-lg text-volt">
                        {formatPrice(line.lineTotal)}
                      </p>
                    </div>

                    <div className="mt-auto flex items-center gap-3 pt-3">
                      <div className="flex items-center border border-line">
                        <button
                          type="button"
                          onClick={() => setQty(line.slug, line.qty - 1)}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt"
                        >
                          <span className="sr-only">
                            Decrease quantity of {line.product.subject}
                          </span>
                          <Minus size={13} weight="bold" aria-hidden="true" />
                        </button>
                        <span
                          className="tnum w-8 text-center font-mono text-sm text-chalk"
                          aria-label={`Quantity ${line.qty}`}
                        >
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.slug, line.qty + 1)}
                          disabled={line.qty >= line.product.stock}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt disabled:cursor-not-allowed disabled:text-steel"
                        >
                          <span className="sr-only">
                            Increase quantity of {line.product.subject}
                          </span>
                          <Plus size={13} weight="bold" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Text button, as briefed — not an icon-only control. */}
                      <button
                        type="button"
                        onClick={() => remove(line.slug)}
                        className="min-h-[36px] cursor-pointer font-mono text-[0.68rem] uppercase tracking-wide text-steel underline underline-offset-4 transition-colors hover:text-flag"
                      >
                        Remove
                        <span className="sr-only"> {line.product.subject}</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="shrink-0 border-t border-line bg-pitch px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              {toFree > 0 && (
                <p className="mb-4 border border-volt/40 bg-volt/8 px-3 py-2 text-center font-mono text-[0.68rem] text-volt">
                  {formatPrice(toFree)} more for free shipping
                </p>
              )}

              <div className="mb-4">
                <PromoField />
              </div>

              <dl className="space-y-1.5 text-sm">
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
                  <dt className="text-fog">Shipping</dt>
                  <dd className="tnum text-chalk">
                    {shipping === 0 ? "Free" : formatPrice(shipping)}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                <p className="font-display text-lg text-chalk">Total</p>
                <p className="tnum font-display text-2xl text-volt">
                  {formatPrice(discountedSubtotal + shipping)}
                </p>
              </div>

              {promo && promo.amount > 0 && (
                <p className="mt-1.5 text-right font-mono text-[0.68rem] text-volt">
                  You save {formatPrice(promo.amount)}
                </p>
              )}

              <Button size="lg" className="mt-4 w-full" onClick={openCheckout}>
                Proceed to checkout
              </Button>
              <button
                type="button"
                onClick={closeDrawer}
                className="mt-3 min-h-[40px] w-full cursor-pointer font-mono text-[0.7rem] uppercase tracking-wide text-fog transition-colors hover:text-chalk"
              >
                Keep shopping
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
