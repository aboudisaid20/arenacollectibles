/**
 * Human-readable order reference, derived from the PaymentIntent id.
 *
 * Deterministic on purpose: refreshing the confirmation page, or coming
 * back to it later, shows the same number without needing a database.
 * The PaymentIntent is the source of truth; this is just a friendly
 * rendering of it.
 */
export function orderNumber(paymentIntentId: string): string {
  // FNV-1a — small, stable, and not security-sensitive (this is a display
  // reference, not a token; the PaymentIntent id is what is verified).
  let h = 0x811c9dc5;
  for (let i = 0; i < paymentIntentId.length; i++) {
    h ^= paymentIntentId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
  let out = "";
  let n = h;
  for (let i = 0; i < 8; i++) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + (i + 1) * 7;
  }
  return `ARN-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}
