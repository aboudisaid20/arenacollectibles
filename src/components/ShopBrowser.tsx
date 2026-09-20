"use client";

import {
  useMemo, useState, useEffect, useId, useCallback, useRef, type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X, SlidersHorizontal } from "@phosphor-icons/react";
import { ProductCard } from "./ProductCard";
import { RevealGrid } from "./motion";
import { Button } from "./ui";
import { useDialog } from "@/lib/use-dialog";
import type { Product, Category, Sport, Brand, CardCondition } from "@/lib/types";
import {
  CATEGORY_PLURAL, BRAND_ORDER, CONDITION_LABEL, FILTER_SPORTS, formatPrice,
} from "@/lib/types";

type Sort = "featured" | "price-desc" | "price-asc" | "year-asc" | "year-desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "year-desc", label: "Newest" },
  { value: "year-asc", label: "Oldest" },
];

/** Slider resolution. Positions are mapped logarithmically onto price. */
const STEPS = 1000;

export function ShopBrowser({
  products,
  categories,
  hero,
}: {
  products: Product[];
  categories: Category[];
  /** Page header, rendered inside the content column so the fixed rail
   *  never covers it. */
  hero?: ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const searchId = useId();
  const sortId = useId();

  /* Price bounds come from the catalogue, so the slider always spans real
     stock rather than a hardcoded ceiling that goes stale. */
  const { floor, ceil } = useMemo(() => {
    const prices = products.map((p) => p.price).filter((n) => n > 0);
    return {
      floor: prices.length ? Math.min(...prices) : 0,
      ceil: prices.length ? Math.max(...prices) : 0,
    };
  }, [products]);

  /* The catalogue spans $9 to $480,000. On a linear slider every item
     under $5k is crushed into the first 1% of travel, so position maps
     onto price logarithmically — equal travel is equal *ratio*, which is
     how people actually think about price bands. */
  const toPrice = useCallback(
    (pos: number) => {
      if (ceil <= floor) return floor;
      const t = pos / STEPS;
      return Math.round(floor * Math.pow(ceil / floor, t));
    },
    [floor, ceil],
  );
  const toPos = useCallback(
    (price: number) => {
      if (ceil <= floor) return 0;
      const clamped = Math.min(Math.max(price, floor), ceil);
      return Math.round((STEPS * Math.log(clamped / floor)) / Math.log(ceil / floor));
    },
    [floor, ceil],
  );

  const [category, setCategory] = useState<Category | "all">("all");
  const [sport, setSport] = useState<Sport | "all">("all");
  const [condition, setCondition] = useState<CardCondition | "all">("all");
  const [brand, setBrand] = useState<Brand | "all">("all");
  /* State is the actual price in cents, not a slider position. Keeping
     positions in state made a typed "1000" come back as $999, because it
     round-tripped through 1000 discrete log steps. Cents are exact; the
     slider derives its position from them. */
  const [range, setRange] = useState<[number, number] | null>(null);
  const [sort, setSort] = useState<Sort>("featured");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const panelRef = useDialog(filtersOpen, () => setFiltersOpen(false));

  /* The rail scrolls its own content. Once it does, filter chips slide up
     behind the floating Menu button, so a blurred band is drawn across
     the top of the rail — and only then, and only as wide as the rail. */
  const railScrollRef = useRef<HTMLDivElement>(null);
  const [railScrolled, setRailScrolled] = useState(false);

  useEffect(() => {
    const el = railScrollRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setRailScrolled(el.scrollTop > 4);
        ticking = false;
      });
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // /shop?category=wax arrives pre-filtered.
  useEffect(() => {
    const c = params.get("category");
    if (c && (categories as string[]).includes(c)) setCategory(c as Category);
  }, [params, categories]);

  /* Which conditional groups apply to the current type. */
  const showCondition = category === "card";
  const showBrand = category === "card" || category === "wax";

  /* A hidden filter must not keep filtering. Without this, picking Cards →
     Ungraded → Signed would silently exclude everything with no visible
     control explaining why. */
  useEffect(() => {
    if (!showCondition && condition !== "all") setCondition("all");
    if (!showBrand && brand !== "all") setBrand("all");
  }, [showCondition, showBrand, condition, brand]);

  const priceMin = range ? range[0] : floor;
  const priceMax = range ? range[1] : ceil;
  const priceTouched = priceMin !== floor || priceMax !== ceil;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (sport !== "all" && p.sport !== sport) return false;
      if (showCondition && condition !== "all" && p.condition !== condition) return false;
      if (showBrand && brand !== "all" && p.brand !== brand) return false;
      if (p.price < priceMin || p.price > priceMax) return false;
      if (!q) return true;
      return (
        p.subject.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.sport.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        String(p.year).includes(q)
      );
    });

    switch (sort) {
      case "price-desc": return [...filtered].sort((a, b) => b.price - a.price);
      case "price-asc": return [...filtered].sort((a, b) => a.price - b.price);
      case "year-asc": return [...filtered].sort((a, b) => a.year - b.year);
      case "year-desc": return [...filtered].sort((a, b) => b.year - a.year);
      default: return filtered;
    }
  }, [
    products, category, sport, condition, brand, priceMin, priceMax,
    sort, query, showCondition, showBrand,
  ]);

  const activeCount =
    (category !== "all" ? 1 : 0) +
    (sport !== "all" ? 1 : 0) +
    (showCondition && condition !== "all" ? 1 : 0) +
    (showBrand && brand !== "all" ? 1 : 0) +
    (priceTouched ? 1 : 0) +
    (query ? 1 : 0);

  const reset = () => {
    setCategory("all"); setSport("all"); setCondition("all"); setBrand("all");
    setRange(null); setQuery(""); setSort("featured");
    router.replace("/shop", { scroll: false });
  };

  /* Rendered twice — in the fixed rail and in the mobile slide-over — so
     every id carries a scope suffix to stay unique. */
  const controls = (scope: string) => (
    <div className="space-y-9">
      <div>
        <label htmlFor={`${searchId}-${scope}`} className="kicker block text-steel">
          Search
        </label>
        <div className="relative mt-3">
          <MagnifyingGlass
            size={16} weight="bold" aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel"
          />
          <input
            id={`${searchId}-${scope}`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Player, set, year or SKU"
            className="h-12 w-full border border-line bg-pitch pl-10 pr-10 text-base text-chalk placeholder:text-steel focus:border-volt focus:outline-none"
          />
          {query && (
            <button
              type="button" onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center text-steel hover:text-chalk"
            >
              <span className="sr-only">Clear search</span>
              <X size={15} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <FilterGroup
        name={`type-${scope}`}
        legend="Type"
        options={[{ value: "all", label: "All" },
          ...categories.map((c) => ({ value: c, label: CATEGORY_PLURAL[c] }))]}
        value={category}
        onChange={(v) => setCategory(v as Category | "all")}
      />

      {/* Conditional: cards only. */}
      {showCondition && (
        <FilterGroup
          name={`condition-${scope}`}
          legend="Condition"
          options={[{ value: "all", label: "All" },
            ...(["graded", "ungraded"] as CardCondition[]).map((c) => ({
              value: c, label: CONDITION_LABEL[c],
            }))]}
          value={condition}
          onChange={(v) => setCondition(v as CardCondition | "all")}
        />
      )}

      {/* Conditional: cards and sealed wax. */}
      {showBrand && (
        <FilterGroup
          name={`brand-${scope}`}
          legend="Brand"
          options={[{ value: "all", label: "All" },
            ...BRAND_ORDER.map((b) => ({ value: b, label: b }))]}
          value={brand}
          onChange={(v) => setBrand(v as Brand | "all")}
        />
      )}

      <FilterGroup
        name={`sport-${scope}`}
        legend="Sport"
        options={[{ value: "all", label: "All" },
          ...FILTER_SPORTS.map((s) => ({ value: s, label: s }))]}
        value={sport}
        onChange={(v) => setSport(v as Sport | "all")}
      />

      <PriceRange
        scope={scope}
        min={priceMin}
        max={priceMax}
        setRange={setRange}
        toPrice={toPrice}
        toPos={toPos}
        floor={floor}
        ceil={ceil}
      />

      <div>
        <label htmlFor={`${sortId}-${scope}`} className="kicker block text-steel">
          Sort
        </label>
        <select
          id={`${sortId}-${scope}`}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="mt-3 h-12 w-full cursor-pointer border border-line bg-pitch px-3 text-base text-chalk focus:border-volt focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {activeCount > 0 && (
        <Button variant="outline" size="sm" onClick={reset} className="w-full">
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* ---------- Fixed rail (xl and up) ----------
          Flush to the viewport edge and full height, the same surface as
          the opened menu — not a card floating inside the page grid. It
          sits below the header layer (z-30 vs z-40) so the Menu, logo and
          Cart controls stay on top of it. */}
      <aside
        aria-labelledby="shop-filters-heading"
        className="fixed left-0 top-0 z-30 hidden h-screen-d w-[32rem] border-r border-line bg-void xl:block"
      >
        {/* Scrim for the Menu button, the width of the rail and nothing
            more. Fades in only once the rail has actually scrolled, so a
            rail sitting at the top stays completely clean. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-[var(--header-h)] transition-opacity duration-300 ${
            railScrolled ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.72) 62%, rgba(0,0,0,0) 100%)",
            backdropFilter: railScrolled ? "blur(10px)" : "none",
            maskImage: "linear-gradient(to bottom, #000 66%, transparent 100%)",
          }}
        />
        <div
          ref={railScrollRef}
          className="flex h-full flex-col overflow-y-auto overscroll-contain px-8 pb-10 pt-[var(--header-h)]"
        >
          <h2
            id="shop-filters-heading"
            className="shrink-0 border-b border-line pb-5 pt-6 font-display text-2xl uppercase text-chalk"
          >
            Filter
          </h2>
          <div className="mt-7">{controls("rail")}</div>
        </div>
      </aside>

      {/* ---------- Page content, cleared of the rail ---------- */}
      <div className="xl:pl-[32rem]">
        {hero}

        <div className="container-page py-10 md:py-14">
          <h2 className="sr-only">Products</h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-sm text-fog" role="status" aria-live="polite">
              <span className="tnum text-chalk">{visible.length}</span> of{" "}
              <span className="tnum">{products.length}</span>{" "}
              {visible.length === 1 ? "item" : "items"}
            </p>

            {/* Below xl the rail is only reachable through this button. */}
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
              aria-controls="shop-filter-panel"
              className="flex h-12 cursor-pointer items-center gap-2 border border-line px-4 font-display text-base uppercase text-chalk transition-colors hover:border-volt hover:text-volt xl:hidden"
            >
              <SlidersHorizontal size={16} weight="bold" aria-hidden="true" />
              Filter
              {activeCount > 0 && (
                <span className="tnum bg-volt px-1.5 font-mono text-[0.65rem] font-bold text-void">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {visible.length > 0 ? (
            <RevealGrid
              keySeed={`${category}-${sport}-${condition}-${brand}-${priceMin}-${priceMax}-${sort}-${query}`}
              className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3"
            >
              {visible.map((p) => <ProductCard key={p.slug} product={p} />)}
            </RevealGrid>
          ) : (
            <div className="mt-8 border border-dashed border-line px-6 py-20 text-center">
              <h3 className="font-display text-3xl text-chalk">Nothing here</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-fog">
                We move a lot off-market. If you&rsquo;re after something specific,
                just ask — it&rsquo;s usually findable.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Slide-over, below xl ---------- */}
      <div
        onClick={() => setFiltersOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[100] bg-void/80 backdrop-blur-sm transition-opacity duration-300 xl:hidden ${
          filtersOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        id="shop-filter-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-filter-panel-title"
        tabIndex={-1}
        // React 19 treats inert="" as false, which would leave the closed
        // panel tabbable.
        inert={!filtersOpen}
        className={`fixed left-0 top-0 z-[110] flex h-screen-d w-full max-w-[32rem] flex-col border-r border-line bg-void transition-transform duration-[340ms] ease-[cubic-bezier(.22,1,.36,1)] focus:outline-none xl:hidden ${
          filtersOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2
            id="shop-filter-panel-title"
            className="font-display text-2xl uppercase text-chalk"
          >
            Filter
          </h2>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-volt"
          >
            <span className="sr-only">Close filters</span>
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
          {controls("panel")}
        </div>

        <div className="shrink-0 border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <Button size="lg" className="w-full" onClick={() => setFiltersOpen(false)}>
            Show {visible.length} {visible.length === 1 ? "item" : "items"}
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * Two-handle price range.
 *
 * Two real <input type="range"> elements stacked rather than a div with
 * pointer handlers: each handle is then keyboard operable, announces its
 * own value, and works with assistive tech for free. The pair is layered
 * so whichever handle the pointer is nearer receives the event, which is
 * what stops them fighting when they meet.
 *
 * The number fields accept an exact figure in dollars — the slider is for
 * exploring, the fields are for when you know the number you want.
 */
function PriceRange({
  scope, min, max, setRange, toPrice, toPos, floor, ceil,
}: {
  scope: string;
  min: number;
  max: number;
  setRange: (r: [number, number]) => void;
  toPrice: (pos: number) => number;
  toPos: (price: number) => number;
  floor: number;
  ceil: number;
}) {
  const minId = `price-min-${scope}`;
  const maxId = `price-max-${scope}`;

  // Draft strings, so a half-typed "12" is not immediately clamped to the
  // catalogue floor while the person is still typing.
  const [draftMin, setDraftMin] = useState<string | null>(null);
  const [draftMax, setDraftMax] = useState<string | null>(null);

  useEffect(() => { setDraftMin(null); setDraftMax(null); }, [min, max]);

  const commit = (which: "min" | "max", raw: string) => {
    setDraftMin(null); setDraftMax(null);
    const dollars = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(dollars) || raw.trim() === "") return;

    // Exact cents, clamped to real stock and kept the right side of the
    // other handle.
    const cents = Math.min(Math.max(Math.round(dollars * 100), floor), ceil);
    if (which === "min") setRange([Math.min(cents, max), max]);
    else setRange([min, Math.max(cents, min)]);
  };

  const loPos = toPos(min);
  const hiPos = toPos(max);
  const pct = (pos: number) => (pos / STEPS) * 100;

  return (
    <fieldset>
      <legend className="kicker mb-3 text-steel">Price</legend>

      {/* Track */}
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-line" aria-hidden="true" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-volt"
          style={{ left: `${pct(loPos)}%`, width: `${Math.max(0, pct(hiPos) - pct(loPos))}%` }}
          aria-hidden="true"
        />
        <input
          id={minId}
          type="range"
          min={0}
          max={STEPS}
          value={loPos}
          aria-label={`Minimum price, ${formatPrice(min)}`}
          onChange={(e) => {
            const v = toPrice(Number(e.target.value));
            setRange([Math.min(v, max), max]);
          }}
          className="range-thumb absolute inset-x-0 top-0 h-11 w-full cursor-pointer appearance-none bg-transparent"
          // When the handles meet at the top of the range the lower one
          // would be unreachable underneath, so it takes the upper layer.
          style={{ zIndex: loPos > STEPS - 60 ? 4 : 3 }}
        />
        <input
          id={maxId}
          type="range"
          min={0}
          max={STEPS}
          value={hiPos}
          aria-label={`Maximum price, ${formatPrice(max)}`}
          onChange={(e) => {
            const v = toPrice(Number(e.target.value));
            setRange([min, Math.max(v, min)]);
          }}
          className="range-thumb absolute inset-x-0 top-0 h-11 w-full cursor-pointer appearance-none bg-transparent"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Exact entry */}
      <div className="mt-3 flex items-center gap-2">
        <PriceField
          id={`${minId}-num`}
          label="Minimum price in dollars"
          value={draftMin !== null ? draftMin : String(Math.round(min / 100))}
          onChange={setDraftMin}
          onCommit={(v) => commit("min", v)}
        />
        <span aria-hidden="true" className="shrink-0 font-mono text-xs text-steel">to</span>
        <PriceField
          id={`${maxId}-num`}
          label="Maximum price in dollars"
          value={draftMax !== null ? draftMax : String(Math.round(max / 100))}
          onChange={setDraftMax}
          onCommit={(v) => commit("max", v)}
        />
      </div>

      <p className="mt-2 font-mono text-[0.66rem] text-steel">
        Stock runs {formatPrice(floor)} to {formatPrice(ceil)}
      </p>
    </fieldset>
  );
}

function PriceField({
  id, label, value, onChange, onCommit,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="flex h-11 items-center border border-line bg-pitch px-2.5 focus-within:border-volt">
        <span aria-hidden="true" className="font-mono text-xs text-steel">$</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommit((e.target as HTMLInputElement).value);
            }
          }}
          className="tnum w-full min-w-0 bg-transparent px-1.5 font-mono text-sm text-chalk focus:outline-none"
        />
      </div>
    </div>
  );
}

/** Radios, not click-divs: arrow keys and state announcement work. */
function FilterGroup({
  name, legend, options, value, onChange,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="kicker mb-3 text-steel">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <label
              key={o.value}
              className={`inline-flex min-h-[38px] cursor-pointer items-center border px-3.5 font-mono text-[0.72rem] uppercase tracking-wide transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-volt ${
                active
                  ? "border-volt bg-volt text-void"
                  : "border-line text-fog hover:border-line-hot hover:text-chalk"
              }`}
            >
              <input
                type="radio" name={name} value={o.value} checked={active}
                onChange={() => onChange(o.value)} className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
