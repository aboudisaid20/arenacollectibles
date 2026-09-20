import "server-only";
import Stripe from "stripe";

/**
 * Server-side Stripe client.
 *
 * STRIPE_SECRET_KEY is read here and nowhere else. It has no NEXT_PUBLIC_
 * prefix, so Next will never inline it into a client bundle, and this
 * module imports "server-only" so an accidental client import fails the
 * build rather than leaking the key.
 *
 * Returns null when unconfigured so the app still runs before keys exist —
 * the UI shows a setup notice instead of crashing.
 */
let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  // apiVersion deliberately omitted: the SDK pins the version it was
  // built against, which is what we want.
  cached = new Stripe(key, { typescript: true });
  return cached;
}

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

/** True when the configured keys are test-mode keys. */
export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}
