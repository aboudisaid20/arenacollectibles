"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Check, Plus, WarningCircle, X } from "@phosphor-icons/react";
import { createProductAction } from "@/app/admin/actions";
import {
  CATEGORY_ORDER, CATEGORY_PLURAL, type Category, type Sport,
} from "@/lib/types";

const SPORTS: Sport[] = [
  "Basketball", "Baseball", "Football", "Soccer", "Boxing", "Hockey", "Golf",
];

/**
 * The spec fields that matter per category.
 *
 * A graded card and a box of sleeves genuinely describe different things,
 * so the form swaps rather than showing one union of every field. Keys
 * match the spec shapes the product page renders.
 */
const SPEC_FIELDS: Record<Category, { key: string; label: string; placeholder: string }[]> = {
  card: [
    { key: "set", label: "Set", placeholder: "2018–19 Panini Prizm Basketball" },
    { key: "cardNumber", label: "Card no.", placeholder: "280" },
    { key: "grader", label: "Grader", placeholder: "PSA" },
    { key: "grade", label: "Grade", placeholder: "GEM MT 10" },
    { key: "certNumber", label: "Cert number", placeholder: "12345678" },
  ],
  wax: [
    { key: "set", label: "Set", placeholder: "1986–87 Fleer Basketball" },
    { key: "format", label: "Format", placeholder: "Wax box" },
    { key: "packCount", label: "Packs", placeholder: "36 packs × 12 cards" },
    { key: "sealType", label: "Seal", placeholder: "Original factory wrap" },
    { key: "sealIntegrity", label: "Seal condition", placeholder: "Unbroken, no reseal marks" },
  ],
  signed: [
    { key: "item", label: "Item", placeholder: "Match-worn shirt" },
    { key: "medium", label: "Medium", placeholder: "Silver paint pen" },
    { key: "authenticator", label: "Authenticator", placeholder: "PSA/DNA" },
    { key: "certNumber", label: "Cert number", placeholder: "AG09912" },
    { key: "signingContext", label: "Signing", placeholder: "Signed in person, London, 2019" },
  ],
  supplies: [
    { key: "brand", label: "Brand", placeholder: "Ultra Pro" },
    { key: "contents", label: "Contents", placeholder: "500 sleeves" },
    { key: "fits", label: "Fits", placeholder: "Standard trading cards" },
    { key: "material", label: "Material", placeholder: "Acid-free polypropylene" },
  ],
};

const EMPTY = {
  subject: "", name: "", category: "card" as Category, sport: "Basketball" as Sport,
  year: String(new Date().getFullYear()), price: "", compareAt: "", stock: "1",
  accent: "#B5FF00", tagline: "", story: "",
};

/**
 * Create a product without touching a code file.
 *
 * Collapsed by default so the panel still opens on the inventory list,
 * which is what an admin is usually here for.
 */
export function NewProductForm() {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(EMPTY);
  const [spec, setSpec] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const set = (k: keyof typeof EMPTY) => (val: string) =>
    setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    const res = await createProductAction({
      name: v.name,
      subject: v.subject,
      category: v.category,
      sport: v.sport,
      year: Number(v.year),
      price: Number(v.price),
      compareAt: v.compareAt ? Number(v.compareAt) : null,
      stock: Number(v.stock),
      accent: v.accent,
      tagline: v.tagline,
      story: v.story,
      spec,
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.error ?? "Could not create that product.");
      return;
    }
    setSaved(`${v.subject} added`);
    setV(EMPTY);
    setSpec({});
    window.setTimeout(() => setSaved(null), 3000);
    startTransition(() => router.refresh());
  };

  if (!open) {
    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[48px] cursor-pointer items-center gap-2 bg-volt px-5 font-display text-base uppercase tracking-wide text-void transition-colors hover:bg-volt-dim"
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          Add product
        </button>
        {saved && (
          <p role="status" className="mt-3 flex items-center gap-2 font-mono text-xs text-volt">
            <Check size={13} weight="bold" aria-hidden="true" />
            {saved}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 border border-volt/40 bg-pitch p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl uppercase text-chalk">New product</h3>
          <p className="mt-1 font-mono text-[0.68rem] text-steel">
            Prices in dollars. The slug, SKU and artwork are generated.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt"
        >
          <span className="sr-only">Close the new product form</span>
          <X size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-subject`} label="Title" hint="The big name on the tile">
          <input
            id={`${id}-subject`} value={v.subject} required
            onChange={(e) => set("subject")(e.target.value)}
            placeholder="Luka Dončić" className={INPUT}
          />
        </Field>

        <Field id={`${id}-name`} label="Product name" hint="The set or full item name">
          <input
            id={`${id}-name`} value={v.name} required
            onChange={(e) => set("name")(e.target.value)}
            placeholder="2018–19 Panini Prizm #280" className={INPUT}
          />
        </Field>

        <Field id={`${id}-category`} label="Category">
          <select
            id={`${id}-category`} value={v.category}
            onChange={(e) => { set("category")(e.target.value); setSpec({}); }}
            className={INPUT}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_PLURAL[c]}</option>
            ))}
          </select>
        </Field>

        <Field id={`${id}-sport`} label="Sport">
          <select
            id={`${id}-sport`} value={v.sport}
            onChange={(e) => set("sport")(e.target.value)}
            className={INPUT}
          >
            {SPORTS.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
          </select>
        </Field>

        <Field id={`${id}-year`} label="Year">
          <input
            id={`${id}-year`} type="number" inputMode="numeric" value={v.year} required
            min={1800} max={2200}
            onChange={(e) => set("year")(e.target.value)}
            className={`tnum ${INPUT}`}
          />
        </Field>

        <Field id={`${id}-stock`} label="Stock" hint="0 shows as sold out">
          <input
            id={`${id}-stock`} type="number" inputMode="numeric" value={v.stock} required
            min={0}
            onChange={(e) => set("stock")(e.target.value)}
            className={`tnum ${INPUT}`}
          />
        </Field>

        <Field id={`${id}-price`} label="Price" hint="In dollars, e.g. 12500">
          <input
            id={`${id}-price`} type="number" inputMode="decimal" value={v.price} required
            min={0} step="0.01"
            onChange={(e) => set("price")(e.target.value)}
            placeholder="12500" className={`tnum ${INPUT}`}
          />
        </Field>

        <Field id={`${id}-compare`} label="Was price" hint="Optional — shows a Sale badge">
          <input
            id={`${id}-compare`} type="number" inputMode="decimal" value={v.compareAt}
            min={0} step="0.01"
            onChange={(e) => set("compareAt")(e.target.value)}
            placeholder="—" className={`tnum ${INPUT}`}
          />
        </Field>
      </div>

      {/* Category-specific spec */}
      <fieldset className="mt-7 border-t border-line pt-6">
        <legend className="sr-only">Specification</legend>
        <p className="kicker mb-4 text-volt">
          {CATEGORY_PLURAL[v.category]} detail
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SPEC_FIELDS[v.category].map((f) => (
            <Field key={f.key} id={`${id}-${f.key}`} label={f.label}>
              <input
                id={`${id}-${f.key}`}
                value={spec[f.key] ?? ""}
                onChange={(e) => setSpec((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={INPUT}
              />
            </Field>
          ))}
        </div>
      </fieldset>

      <div className="mt-7 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        <Field id={`${id}-accent`} label="Artwork colour" hint="Until you upload a photo">
          <div className="flex gap-2">
            <input
              id={`${id}-accent`} type="color" value={v.accent}
              onChange={(e) => set("accent")(e.target.value)}
              className="h-11 w-14 shrink-0 cursor-pointer border border-line bg-void"
            />
            <input
              value={v.accent} aria-label="Artwork colour hex"
              onChange={(e) => set("accent")(e.target.value)}
              className={`tnum ${INPUT}`}
            />
          </div>
        </Field>

        <Field id={`${id}-tagline`} label="Tagline" hint="Optional — used for search engines">
          <input
            id={`${id}-tagline`} value={v.tagline}
            onChange={(e) => set("tagline")(e.target.value)}
            placeholder="One line about the piece." className={INPUT}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id={`${id}-story`} label="Description" hint="Optional — blank line between paragraphs">
            <textarea
              id={`${id}-story`} value={v.story} rows={4}
              onChange={(e) => set("story")(e.target.value)}
              placeholder="What makes this piece worth owning."
              className={`${INPUT} h-auto py-3 leading-relaxed`}
            />
          </Field>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 flex items-start gap-2 border border-flag/50 bg-flag/8 p-3 text-sm text-flag">
          <WarningCircle size={16} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-[48px] cursor-pointer items-center gap-2 bg-volt px-6 font-display text-base uppercase tracking-wide text-void transition-colors hover:bg-volt-dim disabled:cursor-not-allowed disabled:bg-deck disabled:text-steel"
        >
          {busy ? (
            <CircleNotch size={16} weight="bold" aria-hidden="true" className="animate-spin" />
          ) : (
            <Plus size={16} weight="bold" aria-hidden="true" />
          )}
          {busy ? "Saving…" : "Create product"}
        </button>
        <button
          type="button"
          onClick={() => { setV(EMPTY); setSpec({}); setError(null); }}
          className="min-h-[48px] cursor-pointer border border-line px-5 font-mono text-[0.68rem] uppercase tracking-wide text-fog transition-colors hover:border-volt hover:text-volt"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

const INPUT =
  "h-11 w-full min-w-0 border border-line bg-void px-3 text-sm text-chalk placeholder:text-steel focus:border-volt focus:outline-none";

function Field({
  id, label, hint, children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-steel"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 font-mono text-[0.6rem] text-steel">{hint}</p>}
    </div>
  );
}
