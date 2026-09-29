// Simulated 90-day price history. The catalog has no real history, so each product gets a
// deterministic one that always ends at today's actual price. The UI labels it as simulated.

export type PricePoint = { daysAgo: number; price: number };

export const HISTORY_DAYS = 90;

function rng(seed: number) {
  let s = (seed * 2654435761) % 4294967296;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

const roundPrice = (v: number) => (v < 1000 ? Math.round(v / 10) * 10 - 1 : Math.round(v / 50) * 50 - 1);

/** Price changes (a step series): the price held from each point until the next one. */
export function priceHistory(id: number, price: number, mrp: number): PricePoint[] {
  const r = rng(id);
  const ceiling = Math.max(mrp, price);
  // Each product gets a "mood": some are on sale now, some are pricier than usual.
  const bias = r() * 0.16 - 0.06; // mean past price from -6% to +10% vs today
  const points: PricePoint[] = [];
  for (let day = HISTORY_DAYS; day > 6; day -= 8 + Math.floor(r() * 16)) {
    const v = price * (1 + bias + (r() - 0.5) * 0.16);
    points.push({ daysAgo: day, price: Math.max(1, Math.min(roundPrice(v), ceiling)) });
  }
  const prev = points[points.length - 1].daysAgo;
  points.push({ daysAgo: Math.max(1, Math.min(prev - 3, 1 + Math.floor(r() * 10))), price });
  return points;
}

export function priceStats(points: PricePoint[]) {
  // Time-weighted average: a price held for 20 days counts more than one held for 2.
  let weighted = 0;
  for (let i = 0; i < points.length; i++) {
    const until = i + 1 < points.length ? points[i + 1].daysAgo : 0;
    weighted += points[i].price * (points[i].daysAgo - until);
  }
  const prices = points.map((p) => p.price);
  const current = prices[prices.length - 1];
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const avg = Math.round(weighted / points[0].daysAgo);
  const lowPoint = [...points].reverse().find((p) => p.price === low)!;
  const verdict: "lowest" | "below" | "usual" | "above" =
    current <= low ? "lowest" : current < avg * 0.99 ? "below" : current > avg * 1.01 ? "above" : "usual";
  return { current, low, high, avg, lowPoint, verdict };
}
