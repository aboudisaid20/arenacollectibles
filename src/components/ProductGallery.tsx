"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

/**
 * Photograph gallery for a product page.
 *
 * Thumbnails are real radio inputs rather than clickable divs: arrow keys
 * move between them, the selected one is announced, and it all works
 * without JavaScript having to reinvent any of it.
 *
 * Every frame is rendered and cross-faded on opacity rather than swapping
 * `src` on one element — a swap shows a blank frame while the next file
 * decodes, which on a detail shot of a card is exactly when it is most
 * obvious. The cost is that all of them load, which is why the count is
 * capped.
 */
export function ProductGallery({
  images,
  alt,
  accent,
}: {
  images: string[];
  alt: string;
  accent: string;
}) {
  const [index, setIndex] = useState(0);
  const liveRef = useRef<HTMLSpanElement>(null);

  // A product can lose photos while the page is open (an admin editing in
  // another tab); keep the index inside the array either way.
  useEffect(() => {
    if (index > images.length - 1) setIndex(0);
  }, [images.length, index]);

  const go = (next: number) => {
    const n = (next + images.length) % images.length;
    setIndex(n);
  };

  const single = images.length <= 1;

  return (
    <div>
      <div className="relative overflow-hidden border border-line bg-pitch">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(58% 48% at 50% 36%, ${accent}2e 0%, transparent 72%)`,
          }}
          aria-hidden="true"
        />

        <div className="relative aspect-square">
          {images.map((src, i) => (
            <Image
              key={src}
              src={src}
              // The first is the meaningful one; the rest are extra views
              // of the same object, so they are not re-described.
              alt={i === 0 ? alt : ""}
              fill
              // Only the visible one should race the page in.
              priority={i === 0}
              sizes="(min-width: 1024px) 45vw, 92vw"
              className={`object-contain p-6 transition-opacity duration-300 sm:p-10 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        {!single && (
          <>
            <GalleryArrow side="left" onClick={() => go(index - 1)} label="Previous photo" />
            <GalleryArrow side="right" onClick={() => go(index + 1)} label="Next photo" />
            <p
              aria-hidden="true"
              className="tnum absolute bottom-4 right-4 border border-line bg-void/80 px-2 py-1 font-mono text-[0.62rem] text-fog backdrop-blur-sm"
            >
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {!single && (
        <fieldset className="mt-3">
          <legend className="sr-only">Choose a photo</legend>
          <div className="flex flex-wrap gap-3">
            {images.map((src, i) => (
              <label
                key={src}
                className={`relative h-16 w-16 cursor-pointer overflow-hidden border bg-pitch transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-volt ${
                  i === index ? "border-volt" : "border-line hover:border-line-hot"
                }`}
              >
                <input
                  type="radio"
                  name="product-photo"
                  checked={i === index}
                  onChange={() => setIndex(i)}
                  className="sr-only"
                />
                <span className="sr-only">Photo {i + 1} of {images.length}</span>
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Announced on change without moving focus. */}
      <span ref={liveRef} role="status" aria-live="polite" className="sr-only">
        {single ? "" : `Photo ${index + 1} of ${images.length}`}
      </span>
    </div>
  );
}

function GalleryArrow({
  side, onClick, label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  const Icon = side === "left" ? CaretLeft : CaretRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border border-line bg-void/80 text-chalk backdrop-blur-sm transition-colors hover:border-volt hover:text-volt ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <span className="sr-only">{label}</span>
      <Icon size={16} weight="bold" aria-hidden="true" />
    </button>
  );
}
