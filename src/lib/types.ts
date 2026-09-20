/**
 * ARENA — product schema.
 *
 * Three categories share `ProductBase` and diverge into category-specific
 * spec blocks. Rendering switches on `category`, so a fourth category is
 * one union variant plus one spec renderer.
 */

export type Sport =
  | "Basketball"
  | "Baseball"
  | "Football"
  | "Soccer"
  | "Boxing"
  | "Hockey"
  | "Golf";

export type Category = "wax" | "card" | "signed" | "supplies";

/** Manufacturers offered as a filter. Anything else is "Other". */
export type Brand = "Upper Deck" | "Panini" | "Topps" | "Leaf" | "Other";

export const BRAND_ORDER: Brand[] = ["Upper Deck", "Panini", "Topps", "Leaf", "Other"];

/** Slabbed and certified, or raw. Cards only. */
export type CardCondition = "graded" | "ungraded";

export const CONDITION_LABEL: Record<CardCondition, string> = {
  graded: "Graded",
  ungraded: "Ungraded",
};

/**
 * Sports offered in the shop filter.
 *
 * Deliberately narrower than the sports present in the catalogue — the
 * long tail is reachable through search and the unfiltered list, it just
 * does not earn a filter chip.
 */
export const FILTER_SPORTS: Sport[] = ["Basketball", "Football", "Soccer"];

export interface ProvenanceEvent {
  year: string;
  title: string;
  detail: string;
}

export interface ProductBase {
  slug: string;
  sku: string;
  name: string;
  subject: string;
  year: number;
  sport: Sport;
  /** Minor units (cents) — avoids float drift in cart maths. */
  price: number;
  /** Was-price for sale badges. Minor units. */
  compareAt?: number;
  stock: number;
  tagline?: string;
  story: string[];
  provenance?: ProvenanceEvent[];
  /** Drives generated artwork hue when there is no photograph. */
  accent: string;
  /** First uploaded photograph. Falls back to generated artwork when
   *  absent. Always `images[0]` when there are any. */
  image?: string;
  /** Every uploaded photograph, in gallery order. */
  images?: string[];
  featured?: boolean;
  hot?: boolean;
  /** Manufacturer. Cards and sealed wax only — drives the brand filter. */
  brand?: Brand;
  /** Cards only: slabbed and certified, or raw. */
  condition?: CardCondition;
  /** ISO date the slug first entered stock. Set by the database, not by
   *  the catalogue file, so it reflects real arrivals. */
  addedAt?: string;
}

export interface GradedCard extends ProductBase {
  category: "card";
  spec: {
    set: string;
    cardNumber: string;
    grader: "PSA" | "BGS" | "SGC";
    grade: string;
    certNumber: string;
    popAtGrade: number;
    popHigher: number;
    surface?: string;
  };
}

export interface SealedWax extends ProductBase {
  category: "wax";
  spec: {
    set: string;
    format: string;
    packCount: string;
    sealType: string;
    grader?: "BBCE" | "PSA" | "None";
    grade?: string;
    certNumber?: string;
    sealIntegrity: string;
  };
}

export interface SignedItem extends ProductBase {
  category: "signed";
  spec: {
    item: string;
    inscription?: string;
    medium: string;
    authenticator: "PSA/DNA" | "Beckett" | "JSA" | "Fanatics";
    certNumber: string;
    signingContext: string;
    dimensions?: string;
  };
}

export interface SupplyItem extends ProductBase {
  category: "supplies";
  spec: {
    brand: string;
    contents: string;
    fits: string;
    material: string;
    dimensions?: string;
  };
}

export type Product = GradedCard | SealedWax | SignedItem | SupplyItem;

/** Singular, for the chip on a product tile. */
export const CATEGORY_LABEL: Record<Category, string> = {
  wax: "Sealed Box",
  card: "Graded Card",
  signed: "Signed",
  supplies: "Supplies",
};

/** Plural, for navigation and filters. Order matters — this is the
 *  order the four departments appear in the menu and on the shop. */
export const CATEGORY_PLURAL: Record<Category, string> = {
  wax: "Sealed Boxes",
  card: "Cards",
  signed: "Signed Memorabilia",
  supplies: "Supplies",
};

export const CATEGORY_ORDER: Category[] = ["wax", "card", "signed", "supplies"];

/** Prices are stored in cents. Never format from a float. */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Window for the "New" badge on a product tile. */
export const NEW_FOR_DAYS = 7;

/** True while a product is under a week old. Safe on a missing date. */
export function isNewArrival(p: Pick<ProductBase, "addedAt">, now = Date.now()): boolean {
  if (!p.addedAt) return false;
  const t = Date.parse(p.addedAt);
  if (Number.isNaN(t)) return false;
  const age = now - t;
  // Guard against a clock-skewed future date reading as "not new".
  return age < NEW_FOR_DAYS * 86_400_000 && age > -86_400_000;
}
