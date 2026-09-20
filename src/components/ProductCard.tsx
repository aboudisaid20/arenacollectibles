"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Check } from "@phosphor-icons/react";
import { ProductArtwork } from "./ProductArtwork";
import { Chip } from "./ui";
import { useCart } from "@/lib/cart";
import { formatPrice, isNewArrival, type Product } from "@/lib/types";

/**
 * Product tile.
 *
 * The title carries a stretched link so the whole tile is clickable, while
 * the add-to-cart button stays a real sibling button. Nesting a <button>
 * inside an <a> is invalid and breaks keyboard and screen-reader use, so
 * the pattern matters here.
 */
export function ProductCard({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const soldOut = product.stock === 0;
  const isNew = isNewArrival(product);

  /* Sealed wax shares one `subject` ("Sealed Hobby Wax") across several
     products, so for that category the unique `name` is the real product
     name. Everywhere else `subject` is the thing people shop by. */
  const title = product.category === "wax" ? product.name : product.subject;

  const onAdd = () => {
    add(product.slug, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <article
      className={`group relative flex h-full flex-col border border-line bg-deck transition-colors duration-200 hover:border-line-hot focus-within:border-volt ${className}`}
    >
      {/* Artwork well */}
      <div className="relative overflow-hidden bg-pitch">
        <div
          className="absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(60% 50% at 50% 38%, ${product.accent}24 0%, transparent 72%)`,
          }}
          aria-hidden="true"
        />
        {/* aspect-ratio reserves the box → no layout shift */}
        <div className="relative aspect-square px-7 py-6">
          <div className="h-full w-full transition-transform duration-[480ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.06]">
            <ProductArtwork product={product} className="h-full w-full" />
          </div>
        </div>

        {/* The category is already obvious from the artwork, so no label
            for it. What is left are the things a shopper cannot see. */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
          {isNew && !soldOut && <Chip tone="volt">New</Chip>}
          {product.hot && !soldOut && (
            <span className="sticker px-2 py-0.5 text-xs">Hot</span>
          )}
          {product.compareAt && !soldOut && (
            <Chip tone="solid">Sale</Chip>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-void/72">
            <span className="border-2 border-chalk px-4 py-2 font-display text-xl uppercase text-chalk">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-lg leading-[1.02] text-chalk sm:text-xl sm:leading-[0.95] lg:text-2xl">
          <Link
            href={`/product/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {title}
          </Link>
        </h3>

        {/* min-w-0 on the price column is what stops a sale price and its
            struck-through original from shoving the add button off the
            tile: without it the flex item refuses to shrink below its
            content. The two prices wrap onto separate lines instead. */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4 sm:gap-3 sm:pt-5">
          <div className="min-w-0">
            {/* No stock line on a tile. Sold-out is still unmissable — the
                artwork above carries a full-cover "Sold out" panel. */}
            {/* On sale the old price sits above the new one, stacked
                rather than inline, so the order reads the same at every
                width. `s` and the sr-only labels are what stop a screen
                reader announcing two bare numbers with no idea which is
                being charged. */}
            <p className="flex flex-col items-start gap-0.5">
              {product.compareAt && (
                <s className="tnum font-mono text-[0.68rem] text-steel sm:text-xs">
                  <span className="sr-only">Was </span>
                  {formatPrice(product.compareAt)}
                </s>
              )}
              <span className="tnum font-display text-xl leading-none text-volt sm:text-2xl">
                {product.compareAt && <span className="sr-only">Now </span>}
                {formatPrice(product.price)}
              </span>
            </p>
          </div>

          {/* Sits above the stretched link so it stays independently clickable. */}
          <button
            type="button"
            onClick={onAdd}
            disabled={soldOut}
            // 36px on phones, 44 from sm. Well clear of the 24px minimum
            // target size, so shrinking it costs nothing in reachability.
            className="relative z-[1] flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center bg-volt text-void transition-all duration-200 hover:bg-volt-dim active:scale-95 disabled:cursor-not-allowed disabled:bg-line disabled:text-steel sm:h-11 sm:w-11"
          >
            <span className="sr-only">
              {soldOut
                ? `${title} is sold out`
                : `Add ${title} to cart`}
            </span>
            {justAdded ? (
              <Check size={16} weight="bold" aria-hidden="true" />
            ) : (
              <Plus size={16} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Announced without moving focus. */}
        <span role="status" aria-live="polite" className="sr-only">
          {justAdded ? `${title} added to cart` : ""}
        </span>
      </div>
    </article>
  );
}
