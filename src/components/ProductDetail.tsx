"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Check, Minus, Plus, ShieldCheck, Truck, ArrowsCounterClockwise,
} from "@phosphor-icons/react";
import { ProductArtwork } from "./ProductArtwork";
import { ProductGallery } from "./ProductGallery";
import { Reveal } from "./motion";
import { Chip, StockBadge, SpecRow, Button } from "./ui";
import { useCart } from "@/lib/cart";
import { CATEGORY_LABEL, formatPrice, type Product } from "@/lib/types";

export function ProductDetail({ product }: { product: Product }) {
  const photos = product.images ?? (product.image ? [product.image] : []);
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = product.stock === 0;

  const onAdd = () => {
    add(product.slug, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <article className="pt-8 md:pt-12">
      <div className="container-page">
        <Link
          href="/shop"
          className="link-sweep tap-pad inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-steel transition-colors hover:text-chalk"
        >
          <ArrowLeft size={13} weight="bold" aria-hidden="true" />
          Back to shop
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Artwork */}
          <div className="lg:sticky lg:top-[108px] lg:self-start">
            {/* Photographs when there are any, generated artwork when
                there are not. The badges sit above either. */}
            <div className="relative">
              {photos.length > 0 ? (
                <ProductGallery
                  images={photos}
                  alt={`${product.subject} — ${product.name}`}
                  accent={product.accent}
                />
              ) : (
                <div className="relative overflow-hidden border border-line bg-pitch">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(58% 48% at 50% 36%, ${product.accent}2e 0%, transparent 72%)`,
                    }}
                    aria-hidden="true"
                  />
                  <div className="relative aspect-square px-10 py-8 sm:px-16 sm:py-12">
                    <ProductArtwork product={product} className="h-full w-full" />
                  </div>
                </div>
              )}
              <div className="pointer-events-none absolute left-4 top-4 z-[2] flex gap-2">
                <Chip tone="neutral">{CATEGORY_LABEL[product.category]}</Chip>
                {product.hot && <span className="sticker px-2 py-0.5 text-xs">Hot</span>}
              </div>
            </div>
          </div>

          {/* Buy column */}
          <div className="min-w-0">
            <p className="kicker text-steel">
              {product.sport} · <span className="tnum">{product.year}</span> ·{" "}
              <span className="tnum">{product.sku}</span>
            </p>

            <h1 className="mt-3 text-[clamp(2.6rem,7vw,4.5rem)] leading-[0.88] text-chalk">
              {product.subject}
            </h1>
            <p className="mt-2 text-lg text-fog">{product.name}</p>

            {/* Price + buy */}
            <div className="mt-8 border-y border-line py-7">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="tnum font-display text-[3.2rem] leading-none text-volt">
                  {formatPrice(product.price)}
                </p>
                {product.compareAt && (
                  <p className="tnum font-mono text-base text-steel line-through">
                    {formatPrice(product.compareAt)}
                  </p>
                )}
              </div>
              <StockBadge stock={product.stock} className="mt-3" />

              {!soldOut && (
                <div className="mt-6 flex flex-wrap items-stretch gap-3">
                  {/* Quantity — only shown when more than one exists. */}
                  {product.stock > 1 && (
                    <div className="flex items-center border border-line">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                        className="flex h-14 w-12 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt disabled:cursor-not-allowed disabled:text-steel"
                      >
                        <span className="sr-only">Decrease quantity</span>
                        <Minus size={15} weight="bold" aria-hidden="true" />
                      </button>
                      <span
                        className="tnum w-10 text-center font-mono text-base text-chalk"
                        aria-live="polite"
                        aria-label={`Quantity ${qty}`}
                      >
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                        disabled={qty >= product.stock}
                        className="flex h-14 w-12 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt disabled:cursor-not-allowed disabled:text-steel"
                      >
                        <span className="sr-only">Increase quantity</span>
                        <Plus size={15} weight="bold" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  <Button
                    size="lg"
                    onClick={onAdd}
                    className="min-w-[220px] flex-1 sm:flex-none"
                  >
                    {added ? (
                      <>
                        <Check size={18} weight="bold" aria-hidden="true" />
                        Added
                      </>
                    ) : (
                      "Add to cart"
                    )}
                  </Button>
                </div>
              )}

              {soldOut && (
                <div className="mt-6">
                  <p className="border border-line px-5 py-4 font-display text-xl uppercase text-steel">
                    Sold out
                  </p>
                  <Link
                    href="/contact"
                    className="link-sweep tap-pad mt-3 inline-block font-mono text-sm text-volt"
                  >
                    Ask us to find another
                  </Link>
                </div>
              )}

              <span role="status" aria-live="polite" className="sr-only">
                {added ? `${qty} × ${product.subject} added to cart` : ""}
              </span>
            </div>

            {/* Reassurance */}
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { Icon: ShieldCheck, t: "Authenticated" },
                { Icon: Truck, t: "Insured shipping" },
                { Icon: ArrowsCounterClockwise, t: "14-day returns" },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex items-center gap-2 text-sm text-fog">
                  <Icon size={17} weight="bold" aria-hidden="true" className="shrink-0 text-volt" />
                  {t}
                </li>
              ))}
            </ul>

            {/* Story */}
            <div className="mt-10 space-y-4">
              {product.story.map((para, i) => (
                <p
                  key={i}
                  className={`leading-relaxed ${i === 0 ? "text-[1.0625rem] text-chalk" : "text-[0.95rem] text-fog"}`}
                >
                  {para}
                </p>
              ))}
            </div>

            {/* Spec */}
            <section className="mt-10" aria-labelledby="spec">
              <h2 id="spec" className="kicker text-volt">Specification</h2>
              <dl className="mt-4 border-t border-line">
                <SpecSheet product={product} />
              </dl>
            </section>

          </div>
        </div>
      </div>
    </article>
  );
}

function SpecSheet({ product }: { product: Product }) {
  if (product.category === "card") {
    const s = product.spec;
    return (
      <>
        <SpecRow label="Set" value={s.set} />
        <SpecRow label="Card no." value={<span className="tnum">#{s.cardNumber}</span>} />
        <SpecRow label="Grade" value={<span className="font-semibold text-volt">{s.grader} {s.grade}</span>} />
        <SpecRow label="Cert" value={<span className="tnum font-mono text-[0.82rem]">{s.certNumber}</span>} />
        {s.popAtGrade > 0 && (
          <SpecRow
            label="Population"
            value={
              <span className="tnum">
                {s.popAtGrade.toLocaleString("en-US")} at grade ·{" "}
                {s.popHigher === 0 ? "none" : s.popHigher.toLocaleString("en-US")} higher
              </span>
            }
          />
        )}
        {s.surface && <SpecRow label="Surface" value={s.surface} />}
      </>
    );
  }
  if (product.category === "wax") {
    const s = product.spec;
    return (
      <>
        <SpecRow label="Set" value={s.set} />
        <SpecRow label="Format" value={s.format} />
        <SpecRow label="Contents" value={s.packCount} />
        <SpecRow label="Seal" value={s.sealType} />
        {s.grader && s.grader !== "None" && (
          <SpecRow label="Authentication" value={<span className="font-semibold text-volt">{s.grader}{s.grade ? ` — ${s.grade}` : ""}</span>} />
        )}
        {s.certNumber && <SpecRow label="Cert" value={<span className="tnum font-mono text-[0.82rem]">{s.certNumber}</span>} />}
        <SpecRow label="Seal integrity" value={s.sealIntegrity} />
      </>
    );
  }
  if (product.category === "supplies") {
    const s = product.spec;
    return (
      <>
        <SpecRow label="Brand" value={s.brand} />
        <SpecRow label="Contents" value={<span className="font-semibold text-volt">{s.contents}</span>} />
        <SpecRow label="Fits" value={s.fits} />
        <SpecRow label="Material" value={s.material} />
        {s.dimensions && <SpecRow label="Dimensions" value={s.dimensions} />}
      </>
    );
  }

  const s = product.spec;
  return (
    <>
      <SpecRow label="Item" value={s.item} />
      {s.inscription && <SpecRow label="Inscription" value={s.inscription} />}
      <SpecRow label="Medium" value={s.medium} />
      <SpecRow label="Authenticator" value={<span className="font-semibold text-volt">{s.authenticator}</span>} />
      <SpecRow label="Cert" value={<span className="tnum font-mono text-[0.82rem]">{s.certNumber}</span>} />
      <SpecRow label="Signing" value={s.signingContext} />
      {s.dimensions && <SpecRow label="Dimensions" value={s.dimensions} />}
    </>
  );
}
