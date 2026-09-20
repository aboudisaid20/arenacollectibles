"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowDown } from "@phosphor-icons/react";
import { PointerTrail } from "./ui/pointer-trail";
import { ButtonLink } from "./ui";
import { trailSlides } from "@/lib/trail-assets";

const FULL = "(prefers-reduced-motion: no-preference)";
const REDUCED = "(prefers-reduced-motion: reduce)";

export function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const slides = trailSlides();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(FULL, () => {
        // set() + to(), never from(): a from() tween killed mid-flight
        // leaves the element stranded invisible.
        const groups: { sel: string; at: number; dur: number; stagger?: number }[] = [
          { sel: "[data-h-kicker]", at: 0.05, dur: 0.5 },
          { sel: "[data-h-line]", at: 0.15, dur: 0.85, stagger: 0.07 },
          { sel: "[data-h-cta] > *", at: 0.62, dur: 0.5, stagger: 0.08 },
        ];

        gsap.set("[data-h-kicker],[data-h-cta] > *", {
          opacity: 0, y: 18,
        });
        gsap.set("[data-h-line]", { opacity: 0, yPercent: 110 });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.to("[data-h-line]", {
          opacity: 1, yPercent: 0, duration: 0.85, stagger: 0.07,
        }, 0.15);
        groups
          .filter((g) => g.sel !== "[data-h-line]")
          .forEach((g) =>
            tl.to(g.sel, {
              opacity: 1, y: 0, duration: g.dur, stagger: g.stagger,
            }, g.at),
          );
      });

      mm.add(REDUCED, () => {
        gsap.set(
          "[data-h-kicker],[data-h-cta] > *,[data-h-line]",
          { opacity: 1, y: 0, yPercent: 0, clearProps: "transform" },
        );
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <PointerTrail
        slides={slides}
        className="bleed-under-header min-h-hero border-b border-line bg-void"
        cellWidth={338}
        cellHeight={338}
        spacing={59}
        maxVisible={6}
      >
        {/* Bottom-aligned at every size now, sitting close to the ticker
            below. Everything is pushed down so the trail owns the space
            above it. */}
        <div className="container-page flex min-h-hero flex-col justify-end pb-8 pt-24 md:pb-10">
          {/* Optical alignment. All three boxes already sit on the same
              x, but glyphs do not start at their box edge: measured
              against the button's hard block edge, Anton's "E" at hero
              size is 0.038em in and IBM Plex Mono's "G" is 0.047em in.
              Pulling each left by its own side bearing puts the ink on
              one line. Expressed in em so it holds at every size. */}
          <p
            data-h-kicker
            className="kicker -ml-[0.047em] text-volt"
            data-fx-hidden
          >
            Graded · Sealed · Signed
          </p>

          {/* Pre-split lines. The real string stays intact for AT and copy. */}
          <h1
            data-h-word
            /* Below md the type is large enough that "Enter the Arena."
               cannot fit, so it breaks naturally at the space into two
               lines. From md up it is locked to one line with nowrap,
               sized in vw so it fills the container — that value was
               tuned by measuring rendered width against the container
               rather than estimated. */
            className="-ml-[0.038em] mt-5 text-[17vw] leading-[0.94] text-chalk md:whitespace-nowrap md:text-[clamp(1.5rem,13.9vw,13rem)] md:leading-[0.86]"
          >
            {["Enter the Arena."].map((line) => (
              <span key={line} className="block overflow-hidden pb-[0.04em]">
                <span className="block" data-h-line data-fx-hidden>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <div data-h-cta className="mt-10 flex flex-wrap items-center gap-4">
            <span data-fx-hidden>
              <ButtonLink href="/shop" size="lg" arrow>
                Shop everything
              </ButtonLink>
            </span>
          </div>

        </div>
      </PointerTrail>
    </div>
  );
}
