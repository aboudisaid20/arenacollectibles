"use client";

import {
  createContext, useContext, useEffect, useMemo, useReducer, useState,
  useCallback, useRef, type ReactNode,
} from "react";
import type { Product } from "./types";
import { discountAmount, type AppliedPromo } from "./discount-types";

/**
 * Front-end cart.
 *
 * State lives in localStorage — per-viewer, non-critical, and safe to lose.
 * Every read/write is wrapped: private windows and blocked site data both
 * throw, and the cart must still render.
 *
 * The catalogue is injected from the server (see the root layout) so
 * prices and stock reflect live admin edits, rather than the static
 * seed data. The server still re-prices at payment, but the cart should
 * never show a number the customer will not be charged.
 */

const STORAGE_KEY = "arena.cart.v1";
const PROMO_KEY = "arena.promo.v1";

export interface CartItem {
  slug: string;
  qty: number;
}

export interface CartLine extends CartItem {
  product: Product;
  lineTotal: number;
}

type Action =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; slug: string; qty?: number }
  | { type: "setQty"; slug: string; qty: number }
  | { type: "remove"; slug: string }
  | { type: "clear" };

function makeReducer(catalogue: Product[]) {
  const bySlug = new Map(catalogue.map((p) => [p.slug, p]));

  const clampToStock = (slug: string, qty: number): number => {
    const p = bySlug.get(slug);
    if (!p) return 0;
    return Math.max(0, Math.min(qty, p.stock));
  };

  return function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "hydrate":
      return action.items
        .map((i) => ({ slug: i.slug, qty: clampToStock(i.slug, i.qty) }))
        .filter((i) => i.qty > 0);
    case "add": {
      const existing = state.find((i) => i.slug === action.slug);
      const next = (existing?.qty ?? 0) + (action.qty ?? 1);
      const qty = clampToStock(action.slug, next);
      if (qty === 0) return state;
      return existing
        ? state.map((i) => (i.slug === action.slug ? { ...i, qty } : i))
        : [...state, { slug: action.slug, qty }];
    }
    case "setQty": {
      const qty = clampToStock(action.slug, action.qty);
      if (qty === 0) return state.filter((i) => i.slug !== action.slug);
      return state.map((i) => (i.slug === action.slug ? { ...i, qty } : i));
    }
    case "remove":
      return state.filter((i) => i.slug !== action.slug);
    case "clear":
      return [];
      default:
        return state;
    }
  };
}

interface CartApi {
  items: CartItem[];
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** False until localStorage has been read, so SSR and first paint agree. */
  ready: boolean;

  /* --- promo code ---------------------------------------------------- */
  /** The applied code, or null. `amount` is recomputed against the live
   *  subtotal on every render, so editing the cart cannot leave a stale
   *  saving on screen. */
  promo: AppliedPromo | null;
  promoPending: boolean;
  promoError: string | null;
  applyPromo: (code: string) => Promise<boolean>;
  removePromo: () => void;
  /** Subtotal after the discount, floored at zero. Excludes shipping. */
  discountedSubtotal: number;

  /* --- overlay UI state -------------------------------------------- */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  checkoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  /** Bumps on every add, so the header badge can react. */
  addPulse: number;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({
  products,
  children,
}: {
  /** Live catalogue from the server — price and stock included. */
  products: Product[];
  children: ReactNode;
}) {
  const reducer = useMemo(() => makeReducer(products), [products]);
  const [items, dispatch] = useReducer(reducer, []);
  // Read by applyPromo, which must stay referentially stable but always
  // send the current cart.
  const itemsRef = useRef<CartItem[]>(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const [ready, setReady] = useReducer(() => true, false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [addPulse, setAddPulse] = useState(0);
  const [promoRule, setPromoRule] = useState<Omit<AppliedPromo, "amount"> | null>(null);
  const [promoPending, setPromoPending] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Hydrate after mount: server and first client render must match.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) dispatch({ type: "hydrate", items: parsed });
      }
    } catch {
      /* private window / blocked storage — start empty */
    }
    try {
      const rawPromo = window.localStorage.getItem(PROMO_KEY);
      if (rawPromo) {
        const p = JSON.parse(rawPromo);
        // Only the rule is restored, never a stored amount: the saving is
        // always recomputed from the current cart, and revalidated by the
        // server before anything is charged.
        if (p && typeof p.code === "string" && (p.type === "flat" || p.type === "percent")) {
          setPromoRule({ code: p.code, type: p.type, value: Number(p.value) || 0 });
        }
      }
    } catch {
      /* no stored promo — fine */
    }
    setReady();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota or blocked — cart still works for this session */
    }
  }, [items, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (promoRule) {
        window.localStorage.setItem(PROMO_KEY, JSON.stringify(promoRule));
      } else {
        window.localStorage.removeItem(PROMO_KEY);
      }
    } catch {
      /* blocked storage — the code still holds for this session */
    }
  }, [promoRule, ready]);

  // An emptied cart drops the code: a saving against nothing is noise,
  // and it would otherwise reappear on the next item added.
  useEffect(() => {
    if (ready && items.length === 0 && promoRule) setPromoRule(null);
  }, [items.length, ready, promoRule]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openCheckout = useCallback(() => {
    // Only one layer at a time: the drawer closes as checkout takes over.
    setDrawerOpen(false);
    setCheckoutOpen(true);
  }, []);
  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);

  const removePromo = useCallback(() => {
    setPromoRule(null);
    setPromoError(null);
  }, []);

  /**
   * Validates a code against the server and stores the rule on success.
   *
   * The server is the authority here, not the browser: it recomputes the
   * subtotal from live catalogue prices and checks the code is still
   * active. What comes back is only used to render the saving — the same
   * check runs again when the PaymentIntent is priced.
   */
  const applyPromo = useCallback(
    async (raw: string): Promise<boolean> => {
      const code = raw.trim();
      if (!code) {
        setPromoError("Enter a code.");
        return false;
      }
      if (itemsRef.current.length === 0) {
        setPromoError("Add something to your cart first.");
        return false;
      }

      setPromoPending(true);
      setPromoError(null);
      try {
        const res = await fetch("/api/promo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            items: itemsRef.current.map((i) => ({ slug: i.slug, qty: i.qty })),
          }),
        });
        if (!res.ok) {
          setPromoError(
            res.status === 404 || res.status === 400
              ? "That code is not valid."
              : "Could not check that code. Try again.",
          );
          return false;
        }
        const data = await res.json();
        setPromoRule({ code: data.code, type: data.type, value: data.value });
        return true;
      } catch {
        setPromoError("Could not check that code. Try again.");
        return false;
      } finally {
        setPromoPending(false);
      }
    },
    [],
  );

  const value = useMemo<CartApi>(() => {
    const lines: CartLine[] = items.flatMap((i) => {
      const product = products.find((p) => p.slug === i.slug);
      if (!product) return [];
      return [{ ...i, product, lineTotal: product.price * i.qty }];
    });
    const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);

    // Recomputed every render from the live subtotal, so changing a
    // quantity updates the saving immediately and a stored rule can never
    // show a stale number.
    const promo: AppliedPromo | null = promoRule
      ? { ...promoRule, amount: discountAmount(promoRule, subtotal) }
      : null;

    return {
      items,
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
      promo,
      promoPending,
      promoError,
      applyPromo,
      removePromo,
      discountedSubtotal: Math.max(0, subtotal - (promo?.amount ?? 0)),
      add: (slug, qty) => {
        dispatch({ type: "add", slug, qty });
        setAddPulse((n) => n + 1);
        setDrawerOpen(true);
      },
      setQty: (slug, qty) => dispatch({ type: "setQty", slug, qty }),
      remove: (slug) => dispatch({ type: "remove", slug }),
      clear: () => {
        dispatch({ type: "clear" });
        setPromoRule(null);
      },
      ready,
      drawerOpen, openDrawer, closeDrawer,
      checkoutOpen, openCheckout, closeCheckout,
      addPulse,
    };
  }, [
    items, products, ready, drawerOpen, checkoutOpen, addPulse,
    openDrawer, closeDrawer, openCheckout, closeCheckout,
    promoRule, promoPending, promoError, applyPromo, removePromo,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
