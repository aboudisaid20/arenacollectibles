"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { CaretDown, WarningCircle } from "@phosphor-icons/react";
import { updateOrderStatusAction } from "@/app/admin/actions";
import {
  ORDER_STATUSES, regionLabel,
  type OrderStatus, type OrderWithItems,
} from "@/lib/store-types";
import { formatPrice, CATEGORY_PLURAL, type Category } from "@/lib/types";

/** Status carries a text label everywhere — never colour alone. */
const STATUS_STYLE: Record<OrderStatus, string> = {
  processing: "border-volt/50 bg-volt/10 text-volt",
  shipped: "border-chalk/40 bg-chalk/10 text-chalk",
  delivered: "border-line-hot bg-deck text-fog",
};

export function OrdersTable({ orders }: { orders: OrderWithItems[] }) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [days, setDays] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [category, setCategory] = useState<Category | "all">("all");

  /* Option lists come from the orders actually present, so a region with
     no sales never appears and the list cannot go stale. */
  const regions = useMemo(
    () => [...new Set(orders.map((o) => o.region))].filter((r) => r !== "??").sort(),
    [orders],
  );
  const categories = useMemo(
    () => [...new Set(orders.flatMap((o) => o.categories))].sort(),
    [orders],
  );

  // Optimistic so the dropdown feels instant; the server action is the
  // source of truth and a failure rolls the row back.
  const [optimistic, applyOptimistic] = useOptimistic(
    orders,
    (state, patch: { id: string; status: OrderStatus }) =>
      state.map((o) => (o.id === patch.id ? { ...o, status: patch.status } : o)),
  );

  const cutoff =
    days === "all" ? null : Date.now() - Number(days) * 86_400_000;

  const visible = optimistic.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (region !== "all" && o.region !== region) return false;
    if (category !== "all" && !o.categories.includes(category)) return false;
    if (cutoff !== null) {
      const t = Date.parse(o.created_at);
      if (Number.isNaN(t) || t < cutoff) return false;
    }
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      o.order_ref.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q)
    );
  });

  // Revenue follows the filters: the point of narrowing to a region or a
  // month is seeing what that slice is worth.
  const shownRevenue = visible.reduce((n, o) => n + o.amount, 0);
  const activeFilters =
    (filter !== "all" ? 1 : 0) + (region !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) + (days !== "all" ? 1 : 0) + (query ? 1 : 0);

  const clearAll = () => {
    setFilter("all"); setRegion("all"); setCategory("all");
    setDays("all"); setQuery("");
  };

  const change = (id: string, status: OrderStatus) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ id, status });
      const res = await updateOrderStatusAction(id, status);
      if (!res.ok) setError(res.error ?? "Could not update that order.");
    });
  };

  return (
    <section aria-labelledby="orders-h" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="orders-h" className="font-display text-3xl uppercase text-chalk">
            Orders
          </h2>
          <p className="mt-1 font-mono text-[0.7rem] text-steel">
            <span className="tnum text-chalk">{visible.length}</span> of{" "}
            <span className="tnum">{orders.length}</span> orders ·{" "}
            <span className="tnum text-volt">{formatPrice(shownRevenue)}</span>
          </p>
        </div>
        <div>
          <label className="sr-only" htmlFor="order-search">Search orders</label>
          <input
            id="order-search" type="search" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ref, name or email"
            className="h-11 w-full min-w-0 border border-line bg-pitch px-3 text-sm text-chalk placeholder:text-steel focus:border-volt focus:outline-none sm:w-64"
          />
        </div>
      </div>

      {/* Filter bar. Native selects rather than custom menus — they are
          keyboard and screen-reader complete for free, and on a phone they
          open the platform picker. */}
      <div className="mt-5 flex flex-wrap items-end gap-3 border border-line bg-pitch p-4">
        <Field id="order-status" label="Status">
          <select
            id="order-status" value={filter}
            onChange={(e) => setFilter(e.target.value as OrderStatus | "all")}
            className={SELECT}
          >
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </Field>

        <Field id="order-days" label="Placed">
          <select
            id="order-days" value={days}
            onChange={(e) => setDays(e.target.value)}
            className={SELECT}
          >
            <option value="all">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
          </select>
        </Field>

        <Field id="order-region" label="Region">
          <select
            id="order-region" value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={SELECT}
          >
            <option value="all">Everywhere</option>
            {regions.map((r) => (
              <option key={r} value={r}>{regionLabel(r)}</option>
            ))}
          </select>
        </Field>

        <Field id="order-category" label="Category">
          <select
            id="order-category" value={category}
            onChange={(e) => setCategory(e.target.value as Category | "all")}
            className={SELECT}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_PLURAL[c]}</option>
            ))}
          </select>
        </Field>

        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto min-h-[44px] cursor-pointer border border-line-hot px-4 font-mono text-[0.68rem] uppercase tracking-wide text-fog transition-colors hover:border-volt hover:text-volt"
          >
            Clear {activeFilters}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 border border-flag/50 bg-flag/8 p-3 text-sm text-flag">
          <WarningCircle size={16} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {/* Horizontal scroll is expected for a data table; it is keyboard
          focusable and labelled so it can be reached without a mouse. */}
      <div
        tabIndex={0}
        role="region"
        aria-labelledby="orders-h"
        className="mt-5 overflow-x-auto border border-line focus-visible:outline-2 focus-visible:outline-volt"
      >
        <table className="w-full min-w-[54rem] border-collapse text-left">
          <caption className="sr-only">
            Every order, with a status selector for each row
          </caption>
          <thead>
            <tr className="border-b border-line bg-pitch">
              {["Order", "Customer", "Items", "Placed", "Total", "Status"].map((h) => (
                <th
                  key={h} scope="col"
                  className="whitespace-nowrap px-4 py-3 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-steel"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-b-0 hover:bg-pitch/60">
                <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-normal">
                  <span className="tnum font-mono text-[0.78rem] text-chalk">
                    {o.order_ref}
                  </span>
                  {o.payment_intent_id && (
                    <span className="mt-0.5 block font-mono text-[0.6rem] text-steel">
                      Stripe
                    </span>
                  )}
                </th>
                <td className="px-4 py-3">
                  <span className="block text-sm text-chalk">{o.customer_name}</span>
                  <span className="block break-token font-mono text-[0.66rem] text-steel">
                    {o.email}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ul className="space-y-0.5">
                    {o.items.map((it) => (
                      <li key={it.slug} className="text-[0.78rem] text-fog">
                        <span className="tnum text-steel">{it.qty}×</span> {it.subject}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-4 py-3 tnum font-mono text-[0.72rem] text-fog">
                  {new Date(o.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tnum font-mono text-sm text-volt">
                  {formatPrice(o.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <label className="sr-only" htmlFor={`status-${o.id}`}>
                      Status for order {o.order_ref}
                    </label>
                    <select
                      id={`status-${o.id}`}
                      value={o.status}
                      onChange={(e) => change(o.id, e.target.value as OrderStatus)}
                      className={`h-10 cursor-pointer appearance-none border py-0 pl-3 pr-8 font-mono text-[0.7rem] uppercase tracking-wide transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt ${STATUS_STYLE[o.status]}`}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-void text-chalk">
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <CaretDown
                      size={11} weight="bold" aria-hidden="true"
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-fog">
            No orders match that.
          </p>
        )}
      </div>
    </section>
  );
}

const SELECT =
  "h-11 w-full cursor-pointer border border-line bg-void px-3 text-sm text-chalk focus:border-volt focus:outline-none";

/** Label above a control, so the filter bar is readable without guessing. */
function Field({
  id, label, children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-[9rem] flex-1 sm:flex-none">
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-steel"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
