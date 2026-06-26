export const FLAT_SHIPPING = 5;
export const TAX_RATE = 0.06;

/** 6% sales tax on merchandise only — shipping is not taxed. */
export function calculateTax(subtotal: number): number {
  return subtotal * TAX_RATE;
}

export function calculateOrderTotal(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal + FLAT_SHIPPING + calculateTax(subtotal);
}
