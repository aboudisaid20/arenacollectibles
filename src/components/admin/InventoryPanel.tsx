"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Check, WarningCircle, FloppyDisk, UploadSimple, Trash, CircleNotch,
  CaretLeft, CaretRight,
} from "@phosphor-icons/react";
import {
  updateInventoryAction, setProductHiddenAction, deleteProductAction,
} from "@/app/admin/actions";
import { NewProductForm } from "./NewProductForm";
import {
  formatPrice, CATEGORY_PLURAL, CATEGORY_ORDER,
  type Product, type Category,
} from "@/lib/types";
import { LOW_STOCK_THRESHOLD, LOW_STOCK_EXCLUDED } from "@/lib/store-types";

interface Draft {
  price: string;
  stock: string;
}

export function InventoryPanel({
  products,
}: {
  products: (Product & { hidden?: boolean })[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [stockView, setStockView] = useState<"all" | "low" | "out" | "in">("all");
  const [sort, setSort] = useState<"name" | "stock" | "price-desc" | "price-asc">("name");

  const params = useSearchParams();

  /* The low-stock metric links here as /admin/inventory?stock=low, so the
     alert lands on exactly the rows it counted rather than the full list. */
  useEffect(() => {
    const s = params.get("stock");
    if (s === "low" || s === "out" || s === "in") setStockView(s);
  }, [params]);

  const draftFor = (p: Product): Draft =>
    drafts[p.slug] ?? {
      // Price shown in whole dollars; stored in cents.
      price: String(p.price / 100),
      stock: String(p.stock),
    };

  const setDraft = (slug: string, patch: Partial<Draft>) => {
    setDrafts((d) => ({
      ...d,
      [slug]: { ...(d[slug] ?? { price: "", stock: "" }), ...patch } as Draft,
    }));
  };

  const dirty = (p: Product) => {
    const d = drafts[p.slug];
    if (!d) return false;
    return (
      Math.round(Number(d.price) * 100) !== p.price ||
      Number(d.stock) !== p.stock
    );
  };

  const save = (p: Product) => {
    const d = draftFor(p);
    const price = Math.round(Number(d.price) * 100);
    const stock = Number(d.stock);

    if (!Number.isFinite(price) || price < 0) return setError("Price must be a number, zero or more.");
    if (!Number.isFinite(stock) || stock < 0) return setError("Stock must be a whole number, zero or more.");

    setError(null);
    setSavingSlug(p.slug);
    startTransition(async () => {
      const res = await updateInventoryAction(p.slug, { price, stock });
      setSavingSlug(null);
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        return;
      }
      setDrafts((d) => {
        const next = { ...d };
        delete next[p.slug];
        return next;
      });
      setSaved(p.slug);
      window.setTimeout(() => setSaved(null), 2200);
    });
  };

  /** Reorders one photo. Moving to the front makes it the main image. */
  const moveImage = async (slug: string, url: string, dir: -1 | 1) => {
    setError(null);
    setUploading(slug);
    try {
      const res = await fetch(
        `/api/admin/upload?slug=${encodeURIComponent(slug)}&url=${encodeURIComponent(url)}&dir=${dir}`,
        { method: "PATCH" },
      );
      if (!res.ok) throw new Error("Could not reorder that photo.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reorder that photo.");
    } finally {
      setUploading(null);
    }
  };

  const upload = async (slug: string, file: File) => {
    setError(null);
    setUploading(slug);
    try {
      const body = new FormData();
      body.append("slug", slug);
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Upload failed.");
      setSaved(slug);
      window.setTimeout(() => setSaved(null), 2200);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const removeImage = async (slug: string, url?: string) => {
    setError(null);
    setUploading(slug);
    try {
      const qs = new URLSearchParams({ slug });
      if (url) qs.set("url", url);
      const res = await fetch(`/api/admin/upload?${qs}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove that image.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that image.");
    } finally {
      setUploading(null);
    }
  };

  /**
   * Exactly the rule behind the "Low stock alerts" metric, so the number
   * on the overview and the rows here always agree — it counts sold-out
   * items too, which is why this is `<=` and not `> 0 &&`. Single-copy
   * categories are excluded from both.
   */
  const inLowAlert = (p: Product) =>
    p.stock <= LOW_STOCK_THRESHOLD && !LOW_STOCK_EXCLUDED.includes(p.category);

  /** The row badge is narrower: running low, but not yet gone. */
  const isLow = (p: Product) => p.stock > 0 && inLowAlert(p);

  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const toggleHidden = (slug: string, currentlyHidden: boolean) => {
    setError(null);
    setRowBusy(slug);
    startTransition(async () => {
      const res = await setProductHiddenAction(slug, !currentlyHidden);
      setRowBusy(null);
      if (!res.ok) setError(res.error ?? "Could not update that product.");
      else router.refresh();
    });
  };

  const remove = (slug: string, label: string) => {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setError(null);
    setRowBusy(slug);
    startTransition(async () => {
      const res = await deleteProductAction(slug);
      setRowBusy(null);
      if (!res.ok) setError(res.error ?? "Could not delete that product.");
      else router.refresh();
    });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (stockView === "low" && !inLowAlert(p)) return false;
      if (stockView === "out" && p.stock !== 0) return false;
      if (stockView === "in" && p.stock === 0) return false;
      if (!q) return true;
      return (
        p.subject.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    });

    switch (sort) {
      case "stock": return [...filtered].sort((a, b) => a.stock - b.stock);
      case "price-desc": return [...filtered].sort((a, b) => b.price - a.price);
      case "price-asc": return [...filtered].sort((a, b) => a.price - b.price);
      default:
        return [...filtered].sort((a, b) => a.subject.localeCompare(b.subject));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, query, category, stockView, sort]);

  const stockValue = visible.reduce((n, p) => n + p.price * p.stock, 0);
  const activeFilters =
    (category !== "all" ? 1 : 0) + (stockView !== "all" ? 1 : 0) + (query ? 1 : 0);

  const clearAll = () => {
    setCategory("all"); setStockView("all"); setQuery("");
    router.replace("/admin/inventory", { scroll: false });
  };

  return (
    <section aria-labelledby="inv-h" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="inv-h" className="font-display text-3xl uppercase text-chalk">
            Inventory
          </h2>
          <p className="mt-1 font-mono text-[0.7rem] text-steel">
            <span className="tnum text-chalk">{visible.length}</span> of{" "}
            <span className="tnum">{products.length}</span> items ·{" "}
            <span className="tnum text-volt">{formatPrice(stockValue)}</span> at
            retail. Edit price or stock, then save.
          </p>
        </div>
        <div>
          <label className="sr-only" htmlFor="inv-search">Search inventory</label>
          <input
            id="inv-search" type="search" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Player or SKU"
            className="h-11 w-full min-w-0 border border-line bg-pitch px-3 text-sm text-chalk placeholder:text-steel focus:border-volt focus:outline-none sm:w-64"
          />
        </div>
      </div>

      <NewProductForm />

      <div className="mt-5 flex flex-wrap items-end gap-3 border border-line bg-pitch p-4">
        <InvField id="inv-category" label="Category">
          <select
            id="inv-category" value={category}
            onChange={(e) => setCategory(e.target.value as Category | "all")}
            className={INV_SELECT}
          >
            <option value="all">All categories</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_PLURAL[c]}</option>
            ))}
          </select>
        </InvField>

        <InvField id="inv-stock" label="Stock">
          <select
            id="inv-stock" value={stockView}
            onChange={(e) =>
              setStockView(e.target.value as "all" | "low" | "out" | "in")
            }
            className={INV_SELECT}
          >
            <option value="all">Any level</option>
            <option value="low">Low stock</option>
            <option value="out">Sold out</option>
            <option value="in">In stock</option>
          </select>
        </InvField>

        <InvField id="inv-sort" label="Sort">
          <select
            id="inv-sort" value={sort}
            onChange={(e) =>
              setSort(e.target.value as "name" | "stock" | "price-desc" | "price-asc")
            }
            className={INV_SELECT}
          >
            <option value="name">Name</option>
            <option value="stock">Stock, lowest first</option>
            <option value="price-desc">Price, high to low</option>
            <option value="price-asc">Price, low to high</option>
          </select>
        </InvField>

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

      {stockView === "low" && (
        <p className="mt-3 font-mono text-[0.68rem] text-steel">
          {CATEGORY_PLURAL[LOW_STOCK_EXCLUDED[0]]} are excluded — single-copy
          items, where a stock of one is normal rather than a warning.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 border border-flag/50 bg-flag/8 p-3 text-sm text-flag">
          <WarningCircle size={16} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {visible.length === 0 && (
        <p className="mt-5 border border-dashed border-line px-6 py-12 text-center text-sm text-fog">
          Nothing matches those filters.
        </p>
      )}

      <ul className="mt-5 divide-y divide-line border border-line">
        {visible.map((p) => {
          const d = draftFor(p);
          const isDirty = dirty(p);
          const out = p.stock === 0;
          const low = isLow(p);

          return (
            <li key={p.slug} className="bg-void p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Thumbnail doubles as the upload target. */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-line bg-pitch">
                  {p.image ? (
                    <>
                      <Image src={p.image} alt="" fill sizes="56px" className="object-cover" />
                      {(p.images?.length ?? 0) > 1 && (
                        <span className="tnum absolute bottom-0 right-0 bg-void/85 px-1 font-mono text-[0.55rem] text-volt">
                          {p.images!.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-mono text-[0.55rem] uppercase text-steel">
                      Vector
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg uppercase leading-tight text-chalk">
                    {p.subject}
                  </p>
                  <p className="truncate text-xs text-fog">{p.name}</p>
                  <p className="tnum mt-0.5 font-mono text-[0.62rem] text-steel">{p.sku}</p>
                </div>
                {out && (
                  <span className="shrink-0 border border-flag/50 bg-flag/10 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-flag">
                    Sold out
                  </span>
                )}
                {low && (
                  <span className="shrink-0 border border-volt/50 bg-volt/10 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-volt">
                    Low · {p.stock}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-0">
                  <label
                    htmlFor={`price-${p.slug}`}
                    className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-steel"
                  >
                    Price ($)
                  </label>
                  <input
                    id={`price-${p.slug}`} type="number" min={0} step="1"
                    inputMode="numeric" value={d.price}
                    onChange={(e) => setDraft(p.slug, { price: e.target.value })}
                    className="tnum h-11 w-32 border border-line bg-pitch px-3 font-mono text-sm text-chalk focus:border-volt focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label
                    htmlFor={`stock-${p.slug}`}
                    className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-steel"
                  >
                    Stock
                  </label>
                  <input
                    id={`stock-${p.slug}`} type="number" min={0} step="1"
                    inputMode="numeric" value={d.stock}
                    onChange={(e) => setDraft(p.slug, { stock: e.target.value })}
                    className="tnum h-11 w-24 border border-line bg-pitch px-3 font-mono text-sm text-chalk focus:border-volt focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => save(p)}
                  disabled={!isDirty || savingSlug === p.slug}
                  className="flex h-11 min-w-[6rem] cursor-pointer items-center justify-center gap-2 border-2 px-4 font-display text-sm uppercase transition-colors disabled:cursor-not-allowed disabled:border-line disabled:text-steel enabled:border-volt enabled:bg-volt enabled:text-void enabled:hover:bg-volt-dim"
                >
                  {saved === p.slug ? (
                    <>
                      <Check size={14} weight="bold" aria-hidden="true" />
                      Saved
                    </>
                  ) : (
                    <>
                      <FloppyDisk size={14} weight="bold" aria-hidden="true" />
                      {savingSlug === p.slug ? "Saving" : "Save"}
                    </>
                  )}
                  <span className="sr-only"> changes to {p.subject}</span>
                </button>

                {/* Image controls. Hidden input, button as the affordance —
                    a bare file input cannot be styled and reads badly. */}
                <div className="flex items-end gap-2">
                  <input
                    ref={(el) => { fileInputs.current[p.slug] = el; }}
                    id={`img-${p.slug}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="sr-only"
                    onChange={async (e) => {
                      // Sequential, not parallel: each upload reads the
                      // current list and appends, so firing them together
                      // would have them overwrite each other.
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      for (const f of files) await upload(p.slug, f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputs.current[p.slug]?.click()}
                    disabled={uploading === p.slug}
                    className="flex h-11 cursor-pointer items-center gap-2 border border-line px-3 font-mono text-[0.66rem] uppercase tracking-wide text-fog transition-colors hover:border-volt hover:text-volt disabled:cursor-not-allowed disabled:text-steel"
                  >
                    {uploading === p.slug ? (
                      <CircleNotch size={13} weight="bold" aria-hidden="true" className="animate-spin" />
                    ) : (
                      <UploadSimple size={13} weight="bold" aria-hidden="true" />
                    )}
                    {(p.images?.length ?? 0) > 0 ? "Add photo" : "Photo"}
                    <span className="sr-only"> for {p.subject}</span>
                  </button>
                  {p.image && (
                    <button
                      type="button"
                      onClick={() => removeImage(p.slug)}
                      disabled={uploading === p.slug}
                      title="Remove all photos"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center border border-line text-steel transition-colors hover:border-flag hover:text-flag disabled:cursor-not-allowed"
                    >
                      <Trash size={13} weight="bold" aria-hidden="true" />
                      <span className="sr-only">Remove photo for {p.subject}</span>
                    </button>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-4 self-center">
                  <p className="font-mono text-[0.66rem] text-steel">
                    Live: <span className="tnum text-fog">{formatPrice(p.price)}</span> ·{" "}
                    <span className="tnum text-fog">{p.stock}</span> in stock
                  </p>

                  {/* Hiding is the safe default and what the toggle does.
                      Delete is offered too, but the server refuses it for
                      anything that appears on an order — order history
                      keeps the slug and would be left dangling. */}
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.hidden !== true}
                      disabled={rowBusy === p.slug}
                      onChange={() => toggleHidden(p.slug, p.hidden === true)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-9 shrink-0 items-center border p-[2px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-volt ${
                        p.hidden ? "border-line bg-void" : "border-volt bg-volt/25"
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 transition-transform ${
                          p.hidden ? "translate-x-0 bg-steel" : "translate-x-4 bg-volt"
                        }`}
                      />
                    </span>
                    <span
                      className={`font-mono text-[0.62rem] uppercase tracking-[0.14em] ${
                        p.hidden ? "text-steel" : "text-volt"
                      }`}
                    >
                      {p.hidden ? "Hidden" : "Live"}
                    </span>
                    <span className="sr-only">
                      {p.hidden ? `Show ${p.subject} on the shop` : `Hide ${p.subject} from the shop`}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => remove(p.slug, p.subject)}
                    disabled={rowBusy === p.slug}
                    className="min-h-[36px] cursor-pointer px-1 font-mono text-[0.62rem] uppercase tracking-wide text-steel transition-colors hover:text-flag disabled:cursor-not-allowed"
                  >
                    Delete
                    <span className="sr-only"> {p.subject}</span>
                  </button>
                </div>
              </div>

              {/* The full set, in gallery order. The first is what shop
                  tiles and cart lines use, so the arrows are how you
                  choose the main photo. */}
              {(p.images?.length ?? 0) > 1 && (
                <ul className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {p.images!.map((src, i) => (
                    <li key={src} className="relative">
                      <div className="relative h-16 w-16 overflow-hidden border border-line bg-pitch">
                        <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                        {i === 0 && (
                          <span className="absolute inset-x-0 bottom-0 bg-volt/90 text-center font-mono text-[0.5rem] uppercase tracking-wide text-void">
                            Main
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveImage(p.slug, src, -1)}
                          disabled={i === 0 || uploading === p.slug}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center border border-line text-steel transition-colors hover:border-volt hover:text-volt disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="sr-only">Move photo {i + 1} earlier</span>
                          <CaretLeft size={11} weight="bold" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(p.slug, src, 1)}
                          disabled={i === p.images!.length - 1 || uploading === p.slug}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center border border-line text-steel transition-colors hover:border-volt hover:text-volt disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="sr-only">Move photo {i + 1} later</span>
                          <CaretRight size={11} weight="bold" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(p.slug, src)}
                          disabled={uploading === p.slug}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center border border-line text-steel transition-colors hover:border-flag hover:text-flag disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Remove photo {i + 1}</span>
                          <Trash size={11} weight="bold" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <span role="status" aria-live="polite" className="sr-only">
        {saved ? "Inventory saved" : ""}
      </span>
    </section>
  );
}

const INV_SELECT =
  "h-11 w-full cursor-pointer border border-line bg-void px-3 text-sm text-chalk focus:border-volt focus:outline-none";

function InvField({
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
