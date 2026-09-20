import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

/* ---------- Buttons ------------------------------------------------ */

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 font-display uppercase tracking-wide transition-all duration-[240ms] ease-[cubic-bezier(.22,1,.36,1)] disabled:cursor-not-allowed";

const SIZES = {
  lg: "min-h-[56px] px-8 text-lg",
  md: "min-h-[48px] px-6 text-base",
  sm: "min-h-[44px] px-4 text-sm",
} as const;

/**
 * Note on `volt`: black text on brand green is 17.27:1.
 * White text on brand green is 1.22:1 — there is deliberately no
 * variant that produces that pairing.
 *
 * Disabled states are explicit per variant rather than a blanket opacity.
 * Fading volt to 40% over black leaves black text on dark olive — legally
 * exempt from contrast rules, but genuinely hard to read.
 */
const VARIANTS = {
  volt:
    "bg-volt text-void hover:bg-volt-dim active:scale-[0.98] disabled:bg-deck disabled:text-steel disabled:hover:bg-deck",
  chalk:
    "bg-chalk text-void hover:bg-volt active:scale-[0.98] disabled:bg-deck disabled:text-steel disabled:hover:bg-deck",
  outline:
    "border-2 border-line-hot text-chalk hover:border-volt hover:text-volt active:scale-[0.98] disabled:border-line disabled:text-steel disabled:hover:border-line disabled:hover:text-steel",
  ghost: "text-chalk hover:text-volt disabled:text-steel",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

export function ButtonLink({
  href,
  children,
  variant = "volt",
  size = "md",
  className = "",
  arrow = false,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  arrow?: boolean;
} & Omit<ComponentProps<typeof Link>, "href" | "children" | "className">) {
  return (
    <Link
      href={href}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
      {arrow && <ArrowUpRight size={17} weight="bold" aria-hidden="true" />}
    </Link>
  );
}

export function Button({
  children,
  variant = "volt",
  size = "md",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
} & ComponentProps<"button">) {
  return (
    <button
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Section heading ---------------------------------------- */

export function SectionHeading({
  kicker,
  title,
  lead,
  align = "left",
  className = "",
  id,
}: {
  kicker?: string;
  title: ReactNode;
  lead?: string;
  align?: "left" | "center";
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={`${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} ${className}`}
    >
      {kicker && <p className="kicker text-volt">{kicker}</p>}
      <h2
        id={id}
        className="mt-3 text-[clamp(2.2rem,6vw,4.5rem)] text-chalk"
      >
        {title}
      </h2>
      {lead && (
        <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-fog">
          {lead}
        </p>
      )}
    </div>
  );
}

/* ---------- Chips & badges ----------------------------------------- */

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "volt" | "solid";
  className?: string;
}) {
  const tones = {
    neutral: "border-line-hot text-fog",
    volt: "border-volt/50 text-volt",
    solid: "border-volt bg-volt text-void",
  };
  return (
    <span
      className={`inline-block border px-2.5 py-1 font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Status always carries a text label — never colour alone.
 *
 * `showCount` is off by default: a shopper only needs to know when
 * something is the last one or gone, and publishing "8 in stock" on every
 * tile is inventory data, not a selling point. The admin panel passes
 * true where the real number is the whole point.
 */
export function StockBadge({
  stock,
  className = "",
  showCount = false,
}: {
  stock: number;
  className?: string;
  showCount?: boolean;
}) {
  if (stock === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-steel ${className}`}
      >
        <span className="h-1.5 w-1.5 bg-steel" aria-hidden="true" />
        Sold out
      </span>
    );
  }
  if (stock === 1) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-volt ${className}`}
      >
        <span className="h-1.5 w-1.5 bg-volt" aria-hidden="true" />
        Last one
      </span>
    );
  }
  // Anything in healthy stock says nothing at all.
  if (!showCount) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-fog ${className}`}
    >
      <span className="h-1.5 w-1.5 bg-volt" aria-hidden="true" />
      {stock} in stock
    </span>
  );
}

/* ---------- Spec row ------------------------------------------------ */

export function SpecRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="kicker shrink-0 text-steel">{label}</dt>
      <dd className="min-w-0 break-token text-sm text-chalk sm:text-right">
        {value}
      </dd>
    </div>
  );
}
