"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X, ArrowUpRight } from "@phosphor-icons/react";
import { useCart } from "@/lib/cart";
import { useDialog } from "@/lib/use-dialog";
import { CATEGORY_PLURAL, CATEGORY_ORDER } from "@/lib/types";

const PAGES = [
  { href: "/about", label: "About the Arena" },
  { href: "/contact", label: "Contact" },
];

/**
 * Header controls sit directly on the page — no plate, no bar.
 *
 * Legibility over scrolling content is handled where the problem
 * actually is: the shop renders its own blurred band across the filter
 * rail once that rail is scrolled. A drop shadow is all that is left
 * here, which lifts the type off busy artwork without boxing it in.
 */
const CONTROL =
  "flex min-h-[44px] cursor-pointer items-center gap-2 px-1 font-display " +
  "text-lg uppercase tracking-wide text-chalk " +
  "drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] transition-colors duration-200 " +
  "hover:text-volt md:text-xl";

/**
 * Three-column header: Menu · logo · Cart.
 *
 * The logo is optically centred by giving the flanking columns equal
 * width, rather than relying on them happening to balance — "Menu" and
 * "Cart (2)" are different lengths, and a flex justify-between would
 * drift the mark off centre as the count changes.
 *
 * `isAdmin` comes from the server-verified session in the root layout.
 * Hiding the Admin link is presentation only — /admin is protected by
 * middleware and a database role check, so forging this changes nothing.
 */
export function SiteHeader({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { count, ready, openDrawer, addPulse } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);

  const [scrolled, setScrolled] = useState(false);

  // The home page carries its own imagery under the header and reads
  // better with nothing over it, so the scroll scrim is suppressed there.
  const isHome = pathname === "/";

  const panelRef = useDialog(menuOpen, () => setMenuOpen(false));

  useEffect(() => setMenuOpen(false), [pathname]);

  // No bar, so legibility over scrolling content comes from a soft scrim
  // that fades in once you leave the top. rAF-throttled — no layout reads.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 16);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (addPulse === 0) return;
    setPulsing(true);
    const t = window.setTimeout(() => setPulsing(false), 420);
    return () => window.clearTimeout(t);
  }, [addPulse]);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
        {/* Scrim only — never a solid bar. Fades in on scroll so
            white-on-content stays readable. Not rendered at all on the
            home page, which is left completely clear. */}
        {!isHome && (
          <div
            aria-hidden="true"
            className={`absolute inset-0 -z-10 transition-opacity duration-300 ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 100%)",
              backdropFilter: scrolled ? "blur(10px)" : "none",
              maskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)",
            }}
          />
        )}
        <div className="container-page pointer-events-auto grid h-[var(--header-h)] grid-cols-[1fr_auto_1fr] items-center">
          {/* Left — menu */}
          <div className="flex justify-start">
            <button
              ref={menuTrigger}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              className={`-ml-1 ${CONTROL}`}
            >
              Menu
            </button>
          </div>

          {/* Centre — logo */}
          <Link
            href="/"
            // Same plate as the controls: scrolled up behind the mark, a
            // product photograph left it just as hard to read as the words.
            className="flex justify-center drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] transition-opacity duration-200 hover:opacity-80"
            aria-label="ARENA Collectibles — home"
          >
            <Image
              src="/brand/arena-logo.png"
              alt="ARENA Collectibles"
              width={755}
              height={427}
              priority
              sizes="(min-width: 768px) 200px, 160px"
              className="h-9 w-auto md:h-11"
            />
          </Link>

          {/* Right — cart */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openDrawer}
              className={`-mr-1 ${CONTROL}`}
            >
              {/* Count is part of the accessible name, so it is announced
                  on change without a separate live region. */}
              <span className="sr-only">
                Open cart{ready && count > 0
                  ? `, ${count} item${count === 1 ? "" : "s"}`
                  : ", empty"}
              </span>
              {/* Always visible now: with the bag icon gone, hiding the
                  word on small screens would leave an unlabelled button. */}
              <span aria-hidden="true">Cart</span>
              {ready && count > 0 && (
                <span
                  aria-hidden="true"
                  className={`tnum bg-volt px-1.5 font-mono text-[0.68rem] font-semibold leading-[20px] text-void ${
                    pulsing ? "animate-cart-kick" : ""
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Full-screen menu ---------- */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[120] bg-void/80 backdrop-blur-sm transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-menu-title"
        tabIndex={-1}
        inert={!menuOpen}
        className={`fixed left-0 top-0 z-[130] flex h-dvh w-full max-w-[32rem] flex-col border-r border-line bg-void transition-transform duration-[340ms] ease-[cubic-bezier(.22,1,.36,1)] focus:outline-none ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2 id="site-menu-title" className="font-display text-2xl uppercase text-chalk">
            Menu
          </h2>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt"
          >
            <span className="sr-only">Close menu</span>
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Primary"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6"
        >
          <p className="kicker text-volt">Shop</p>
          <ul className="mt-4">
            {CATEGORY_ORDER.map((cat, i) => (
              <li key={cat}>
                <Link
                  href={`/shop?category=${cat}`}
                  className="group flex items-center justify-between gap-4 border-b border-line py-4 transition-colors"
                >
                  <span className="flex items-baseline gap-4">
                    <span className="tnum font-mono text-xs text-steel">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[clamp(1.8rem,7vw,2.6rem)] uppercase leading-none text-chalk transition-colors group-hover:text-volt">
                      {CATEGORY_PLURAL[cat]}
                    </span>
                  </span>
                  <ArrowUpRight
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                    className="shrink-0 text-steel transition-all duration-200 group-hover:translate-x-1 group-hover:text-volt"
                  />
                </Link>
              </li>
            ))}
          </ul>

          <p className="kicker mt-10 text-volt">More</p>
          <ul className="mt-4">
            {PAGES.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block border-b border-line py-3.5 font-display text-xl uppercase transition-colors hover:text-volt ${
                      active ? "text-volt" : "text-chalk"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {isAdmin && (
              <li>
                <Link
                  href="/admin"
                  aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                  className="block border-b border-line py-3.5 font-display text-xl uppercase text-volt"
                >
                  Admin
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <p className="font-mono text-[0.66rem] leading-relaxed text-steel">
            Every item authenticated · Insured worldwide shipping
          </p>
        </div>
      </div>
    </>
  );
}
