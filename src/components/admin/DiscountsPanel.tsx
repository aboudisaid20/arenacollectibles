"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, WarningCircle, Plus, Trash, CircleNotch } from "@phosphor-icons/react";
import {
  createDiscountAction,
  setDiscountActiveAction,
  deleteDiscountAction,
} from "@/app/admin/actions";
import { discountLabel, type DiscountRow, type DiscountType } from "@/lib/discount-types";

/**
 * Promo code management.
 *
 * Create a code, switch one off, or delete it. Deactivating is the safe
 * default and what the toggle does — a deleted code loses the record that
 * past orders were discounted with it, while a deactivated one stops
 * working immediately and stays auditable.
 */
export function DiscountsPanel({ discounts }: { discounts: DiscountRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("percent");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSaved(msg);
    window.setTimeout(() => setSaved((s) => (s === msg ? null : s)), 2200);
  };

  const create = async () => {
    const n = Number(value);
    if (!code.trim()) return setError("Enter a code.");
    if (!Number.isFinite(n) || n <= 0) return setError("Value must be more than zero.");

    setError(null);
    setBusy("__new__");
    const res = await createDiscountAction({ code, type, value: n });
    setBusy(null);

    if (!res.ok) return setError(res.error ?? "Could not create that code.");
    setCode("");
    setValue("");
    flash("Code created");
    startTransition(() => router.refresh());
  };

  const toggle = async (row: DiscountRow) => {
    setError(null);
    setBusy(row.code);
    const res = await setDiscountActiveAction(row.code, row.active !== 1);
    setBusy(null);
    if (!res.ok) return setError(res.error ?? "Could not update that code.");
    flash(row.active === 1 ? `${row.code} turned off` : `${row.code} turned on`);
    startTransition(() => router.refresh());
  };

  const remove = async (row: DiscountRow) => {
    setError(null);
    setBusy(row.code);
    const res = await deleteDiscountAction(row.code);
    setBusy(null);
    if (!res.ok) return setError(res.error ?? "Could not delete that code.");
    flash(`${row.code} deleted`);
    startTransition(() => router.refresh());
  };

  return (
    <section aria-labelledby="admin-discounts">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-volt">Promotions</p>
          <h2 id="admin-discounts" className="mt-2 font-display text-3xl text-chalk">
            Promo codes
          </h2>
        </div>
        <p className="font-mono text-xs text-steel">
          <span className="tnum text-chalk">
            {discounts.filter((d) => d.active === 1).length}
          </span>{" "}
          active of <span className="tnum">{discounts.length}</span>
        </p>
      </div>

      {/* ---------- Create ---------- */}
      <div className="mt-6 border border-line bg-pitch p-5">
        <h3 className="font-display text-lg uppercase text-chalk">New code</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="d-code" className="kicker block text-steel">Code</label>
            <input
              id="d-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SUMMER20"
              autoComplete="off"
              spellCheck={false}
              className="mt-2 h-11 w-full border border-line bg-void px-3 font-mono text-sm uppercase tracking-[0.1em] text-chalk placeholder:normal-case placeholder:tracking-normal placeholder:text-steel focus:border-volt focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="d-type" className="kicker block text-steel">Type</label>
            <select
              id="d-type"
              value={type}
              onChange={(e) => setType(e.target.value as DiscountType)}
              className="mt-2 h-11 w-full cursor-pointer border border-line bg-void px-3 text-sm text-chalk focus:border-volt focus:outline-none"
            >
              <option value="percent">Percentage</option>
              <option value="flat">Flat amount</option>
            </select>
          </div>
          <div>
            <label htmlFor="d-value" className="kicker block text-steel">
              {type === "percent" ? "Percent" : "Dollars"}
            </label>
            <input
              id="d-value"
              type="number"
              inputMode="decimal"
              min="0"
              step={type === "percent" ? "1" : "0.01"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "percent" ? "10" : "25.00"}
              className="tnum mt-2 h-11 w-full border border-line bg-void px-3 font-mono text-sm text-chalk placeholder:text-steel focus:border-volt focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void create()}
              disabled={busy === "__new__"}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 bg-volt px-4 font-display text-sm uppercase tracking-wide text-void transition-colors hover:bg-volt-dim disabled:cursor-not-allowed disabled:bg-deck disabled:text-steel sm:w-auto"
            >
              {busy === "__new__" ? (
                <CircleNotch size={15} weight="bold" aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus size={15} weight="bold" aria-hidden="true" />
              )}
              Create
            </button>
          </div>
        </div>
      </div>

      {/* Status messages, announced without moving focus. */}
      <div role="status" aria-live="polite" className="mt-3 min-h-[1.25rem]">
        {saved && (
          <p className="flex items-center gap-2 font-mono text-xs text-volt">
            <Check size={13} weight="bold" aria-hidden="true" />
            {saved}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 flex items-center gap-2 font-mono text-xs text-flag">
          <WarningCircle size={13} weight="fill" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* ---------- List ---------- */}
      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <caption className="sr-only">
            Promo codes, with their discount and whether they are active
          </caption>
          <thead>
            <tr className="border-b border-line bg-pitch">
              {["Code", "Discount", "Status", ""].map((h, i) => (
                <th
                  key={h || i}
                  scope="col"
                  className="px-4 py-3 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-steel"
                >
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {discounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-fog">
                  No promo codes yet.
                </td>
              </tr>
            ) : (
              discounts.map((d) => {
                const on = d.active === 1;
                const working = busy === d.code;
                return (
                  <tr key={d.code} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3 font-mono text-sm uppercase tracking-[0.1em] text-chalk">
                      {d.code}
                    </td>
                    <td className="tnum px-4 py-3 font-mono text-sm text-fog">
                      {discountLabel(d)}
                    </td>
                    <td className="px-4 py-3">
                      {/* Real checkbox: state is announced, and it is
                          reachable and toggleable from the keyboard. */}
                      <label className="inline-flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={working}
                          onChange={() => void toggle(d)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-9 shrink-0 items-center border p-[2px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-volt ${
                            on ? "border-volt bg-volt/25" : "border-line bg-void"
                          }`}
                        >
                          <span
                            className={`h-3.5 w-3.5 transition-transform ${
                              on ? "translate-x-4 bg-volt" : "translate-x-0 bg-steel"
                            }`}
                          />
                        </span>
                        <span
                          className={`font-mono text-[0.66rem] uppercase tracking-[0.14em] ${
                            on ? "text-volt" : "text-steel"
                          }`}
                        >
                          {on ? "Active" : "Off"}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void remove(d)}
                        disabled={working}
                        className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 px-2 font-mono text-[0.66rem] uppercase tracking-wide text-steel transition-colors hover:text-flag disabled:cursor-not-allowed"
                      >
                        <Trash size={13} weight="bold" aria-hidden="true" />
                        Delete
                        <span className="sr-only"> promo code {d.code}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
