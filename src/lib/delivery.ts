/** Shared between the checkout UI and the server that prices the order. */
export const DELIVERY_OPTIONS = [
  { id: "standard", label: "Standard insured", detail: "5–8 business days", cost: 2500 },
  { id: "express", label: "Express insured", detail: "2–3 business days", cost: 5500 },
  { id: "vault", label: "Vault-to-vault courier", detail: "Booked with you directly", cost: 18000 },
] as const;

export type DeliveryId = (typeof DELIVERY_OPTIONS)[number]["id"];

export function deliveryById(id: string) {
  return DELIVERY_OPTIONS.find((d) => d.id === id) ?? DELIVERY_OPTIONS[0];
}
