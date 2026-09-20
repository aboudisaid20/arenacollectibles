"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/team", label: "Team" },
];

/**
 * Section switcher.
 *
 * Real links rather than client-side tab state, so each section has its
 * own URL — which is what lets the low-stock metric deep-link straight
 * into a filtered inventory, and lets a filtered view be bookmarked or
 * shared.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="border-b border-line">
      <ul className="container-page flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          // Exact match for the index, prefix for the rest, so /admin does
          // not light up while you are on /admin/orders.
          const active =
            t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex min-h-[48px] items-center border-b-2 px-4 font-display text-base uppercase tracking-wide transition-colors ${
                  active
                    ? "border-volt text-volt"
                    : "border-transparent text-fog hover:text-chalk"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
