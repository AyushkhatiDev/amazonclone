// Every rule that can change what the customer pays lives here, so the cart and
// checkout compute the exact same total. Nothing is added later.

export const FREE_DELIVERY_THRESHOLD = 499;
export const STANDARD_DELIVERY_FEE = 40;
export const EXPRESS_FEE = 99;
export const COD_LIMIT = 10000;

export type DeliverySpeed = "standard" | "express";

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function savingsPct(price: number, mrp: number) {
  return mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
}

export function orderTotals(lines: { price: number; mrp: number; qty: number }[], speed: DeliverySpeed = "standard") {
  const items = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const listTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const standardFee = items === 0 || items >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const delivery = speed === "express" ? EXPRESS_FEE : standardFee;
  const total = items + delivery;
  return {
    count,
    items,
    delivery,
    total,
    saved: listTotal - items,
    toFreeDelivery: Math.max(0, FREE_DELIVERY_THRESHOLD - items),
    codAvailable: total <= COD_LIMIT,
  };
}

/** Delivery date `days` from `from`, skipping nothing: we deliver on Sundays too. */
export function deliveryDate(days: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDay(d: Date) {
  const today = new Date();
  const diff = Math.round((new Date(d.toDateString()).getTime() - new Date(today.toDateString()).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function expressDays(standardDays: number) {
  return Math.max(1, Math.min(2, standardDays - 1));
}
