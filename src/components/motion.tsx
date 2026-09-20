"use client";

import {
  useRef,
  type ReactNode,
  type ElementType,
  type ComponentPropsWithoutRef,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Tells the head script's failsafe that motion is alive, so it leaves the
// pre-reveal hidden state in place.
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-motion-ready", "1");
}

/**
 * Motion system.
 *
 * Every animation here is:
 *   - transform/opacity only (never width/height/top/left → no reflow, no CLS)
 *   - wrapped in gsap.matchMedia() with an explicit reduced-motion branch
 *     that renders the final state immediately
 *   - scoped to its container so ScrollTrigger never rescans the page
 *
 * Elements are hidden pre-reveal by the `.js-reveal` CSS class, which only
 * applies once the inline head script confirms JS + no reduced-motion
 * preference. No-JS users and crawlers always see fully visible content.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";
const FULL = "(prefers-reduced-motion: no-preference)";

/** Staggered entrance for a group of children. Standard tier. */
export function Reveal({
  children,
  className = "",
  as: Tag = "div",
  stagger = 0.08,
  y = 24,
  start = "top 85%",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  stagger?: number;
  y?: number;
  start?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const targets = Array.from(el.children);
      if (!targets.length) return;

      const mm = gsap.matchMedia();

      mm.add(FULL, () => {
        gsap.set(targets, { opacity: 0, y });
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 0.52,
          delay,
          stagger,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start, once: true },
        });
      });

      // Reduced motion: no transition, just the final readable state.
      mm.add(REDUCED, () => {
        gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={`js-reveal ${className}`}>
      {children}
    </Tag>
  );
}

/** Grid entrance with a wave stagger inferred from the CSS grid. */
export function RevealGrid({
  children,
  className = "",
  keySeed,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  /** Change this to re-run the entrance (e.g. after filtering). */
  keySeed?: string;
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const targets = Array.from(el.children);
      if (!targets.length) return;

      const mm = gsap.matchMedia();

      mm.add(FULL, () => {
        gsap.set(targets, { opacity: 0, scale: 0.94, y: 18 });
        gsap.to(targets, {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.46,
          ease: "back.out(1.4)",
          stagger: { each: 0.055, from: "start", grid: "auto" },
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      mm.add(REDUCED, () => {
        gsap.set(targets, { opacity: 1, scale: 1, y: 0, clearProps: "transform" });
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [keySeed], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={`js-reveal ${className}`} {...rest}>
      {children}
    </div>
  );
}

/**
 * Line-by-line mask reveal for display headings.
 * Pass pre-split lines — we never split live text, so screen readers
 * and copy/paste get the real string.
 */
export function RevealLines({
  lines,
  className = "",
  as: Tag = "h1",
  delay = 0,
}: {
  lines: string[];
  className?: string;
  as?: ElementType;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const inner = el.querySelectorAll<HTMLElement>("[data-line-inner]");
      if (!inner.length) return;

      const mm = gsap.matchMedia();

      mm.add(FULL, () => {
        gsap.set(inner, { yPercent: 108, opacity: 0 });
        gsap.to(inner, {
          yPercent: 0,
          opacity: 1,
          duration: 0.92,
          delay,
          stagger: 0.09,
          ease: "power3.out",
        });
      });

      mm.add(REDUCED, () => {
        gsap.set(inner, { yPercent: 0, opacity: 1, clearProps: "transform" });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <span data-line-inner className="block">
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Scrub parallax for decorative layers only — never text, never controls.
 * Small delta (5–15%) so foreground and background never desync.
 */
export function Parallax({
  children,
  className = "",
  amount = 10,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      // Parallax on pointer-capable large screens only. On phones it costs
      // scroll performance and buys almost nothing visually.
      mm.add(`${FULL} and (min-width: 768px)`, () => {
        gsap.to(el, {
          yPercent: amount,
          ease: "none",
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}

/** Count-up for statistics. Respects reduced motion by showing the value. */
export function CountUp({
  value,
  suffix = "",
  prefix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      const fmt = (n: number) => `${prefix}${Math.round(n).toLocaleString("en-US")}${suffix}`;

      mm.add(FULL, () => {
        const obj = { n: 0 };
        gsap.to(obj, {
          n: value,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onUpdate: () => {
            el.textContent = fmt(obj.n);
          },
          onComplete: () => {
            el.textContent = fmt(value);
          },
        });
      });

      mm.add(REDUCED, () => {
        el.textContent = fmt(value);
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  // Server-rendered with the real value → correct without JS.
  return (
    <span ref={ref} className={`tnum ${className}`}>
      {`${prefix}${value.toLocaleString("en-US")}${suffix}`}
    </span>
  );
}
