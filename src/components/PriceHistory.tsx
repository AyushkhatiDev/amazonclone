"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingDown, CircleCheck, Clock } from "lucide-react";
import { priceHistory, priceStats, HISTORY_DAYS, type PricePoint } from "@/lib/priceHistory";
import { formatINR } from "@/lib/pricing";
import { useHydrated } from "@/lib/store";

const H = 170;
const PAD = { top: 22, right: 16, bottom: 24, left: 56 };

const dateFor = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
};
const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Price in effect `daysAgo` days ago: the most recent change at or before that day. */
const priceOn = (points: PricePoint[], daysAgo: number) => {
  let p = points[0].price;
  for (const pt of points) if (pt.daysAgo >= daysAgo) p = pt.price;
  return p;
};

function niceTicks(min: number, max: number, count = 3) {
  const span = max - min || max || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

/**
 * Amazon.in shows a "Price history" pill that links elsewhere. Here the answer to
 * "should I buy now?" is on the page: a verdict first, the chart as evidence.
 */
/** Compact verdict next to the price; links down to the chart. */
export function PriceVerdictChip({ id, price, mrp }: { id: number; price: number; mrp: number }) {
  const stats = useMemo(() => priceStats(priceHistory(id, price, mrp)), [id, price, mrp]);
  const label = { lowest: "Lowest in 90 days", below: "Below 90-day average", usual: "Usual price", above: "Higher than usual" }[stats.verdict];
  const good = stats.verdict === "lowest" || stats.verdict === "below";
  return (
    <a href="#price-history" className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium hover:border-ink/30">
      {good ? <TrendingDown className="h-3.5 w-3.5 text-save" /> : stats.verdict === "above" ? <Clock className="h-3.5 w-3.5 text-amber-600" /> : <CircleCheck className="h-3.5 w-3.5 text-muted" />}
      {label} · see price history
    </a>
  );
}

export default function PriceHistory({ id, price, mrp }: { id: number; price: number; mrp: number }) {
  const hydrated = useHydrated();
  const points = useMemo(() => priceHistory(id, price, mrp), [id, price, mrp]);
  const stats = useMemo(() => priceStats(points), [points]);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const [hover, setHover] = useState<number | null>(null);

  // The chart only mounts after hydration, so (re)attach the observer once it exists.
  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [hydrated]);

  // Dates depend on "today", so everything date-bound renders after hydration.
  if (!hydrated) return <section className="card mt-12 h-72" aria-label="Price history" />;

  const { lo, hi, ticks } = niceTicks(stats.low * 0.97, stats.high * 1.02);
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (daysAgo: number) => PAD.left + ((HISTORY_DAYS - daysAgo) / HISTORY_DAYS) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;

  // Step line: hold each price flat until the next change, then jump.
  let d = `M${x(points[0].daysAgo)},${y(points[0].price)}`;
  for (let i = 1; i < points.length; i++) d += ` H${x(points[i].daysAgo)} V${y(points[i].price)}`;
  d += ` H${x(0)}`;
  const area = `${d} V${PAD.top + innerH} H${x(points[0].daysAgo)} Z`;

  const low = stats.lowPoint;
  const hoverPrice = hover != null ? priceOn(points, hover) : null;
  const saving = stats.avg - stats.current;

  const verdict =
    stats.verdict === "lowest"
      ? { icon: <CircleCheck className="h-5 w-5 text-save" />, title: "Lowest price in 90 days", body: `That's ${formatINR(stats.high - stats.current)} below this product's 90-day high. A good time to buy.` }
      : stats.verdict === "below"
        ? { icon: <TrendingDown className="h-5 w-5 text-save" />, title: `${formatINR(saving)} below its 90-day average`, body: `It was as low as ${formatINR(stats.low)} on ${fmtDate(dateFor(low.daysAgo))}.` }
        : stats.verdict === "usual"
          ? { icon: <CircleCheck className="h-5 w-5 text-muted" />, title: "About its usual price", body: `It has averaged ${formatINR(stats.avg)} over 90 days, with a low of ${formatINR(stats.low)} on ${fmtDate(dateFor(low.daysAgo))}.` }
          : { icon: <Clock className="h-5 w-5 text-amber-600" />, title: "Higher than usual right now", body: `It averaged ${formatINR(stats.avg)} over 90 days and dropped to ${formatINR(stats.low)} on ${fmtDate(dateFor(low.daysAgo))}. If you're not in a hurry, it may be worth waiting.` };

  return (
    <section id="price-history" className="card mt-12 scroll-mt-32 p-5 sm:p-6" aria-labelledby="ph-title">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="ph-title" className="text-xl font-bold tracking-tight">Price history</h2>
          <p className="text-xs text-muted">Last 90 days. Simulated for this demo, because the catalog has no real price history.</p>
        </div>
        <dl className="flex gap-5 text-sm">
          {[
            ["Now", stats.current],
            ["90-day low", stats.low],
            ["Average", stats.avg],
            ["High", stats.high],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-semibold tabular-nums">{formatINR(v as number)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 flex gap-3 rounded-xl bg-page p-3.5">
        <span className="mt-0.5 shrink-0">{verdict.icon}</span>
        <p className="text-sm">
          <span className="font-semibold">{verdict.title}.</span> <span className="text-ink/80">{verdict.body}</span>
        </p>
      </div>

      <div ref={wrap} className="relative mt-4">
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Price over the last 90 days, from ${formatINR(stats.low)} to ${formatINR(stats.high)}. Now ${formatINR(stats.current)}.`}
          className="block touch-none select-none"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = Math.min(Math.max(e.clientX - r.left, PAD.left), PAD.left + innerW);
            setHover(Math.round(HISTORY_DAYS - ((px - PAD.left) / innerW) * HISTORY_DAYS));
          }}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="#eef0f2" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {formatINR(t)}
              </text>
            </g>
          ))}
          {[90, 60, 30, 0].map((dd) => (
            <text key={dd} x={x(dd)} y={H - 6} textAnchor={dd === 90 ? "start" : dd === 0 ? "end" : "middle"} className="fill-muted text-[11px]">
              {dd === 0 ? "Today" : fmtDate(dateFor(dd))}
            </text>
          ))}

          <path d={area} fill="var(--color-chart)" fillOpacity={0.1} />
          <path d={d} fill="none" stroke="var(--color-chart)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Direct labels only for the story: the lowest price and today's. */}
          {stats.verdict !== "lowest" && (
            <g>
              <circle cx={x(low.daysAgo)} cy={y(low.price)} r={4} fill="var(--color-chart)" stroke="white" strokeWidth={2} />
              <text x={x(low.daysAgo)} y={y(low.price) + 18} textAnchor="middle" className="fill-ink text-[11px] font-medium">
                Low {formatINR(low.price)}
              </text>
            </g>
          )}
          <circle cx={x(0)} cy={y(stats.current)} r={4} fill="var(--color-chart)" stroke="white" strokeWidth={2} />
          <text x={x(0) - 8} y={y(stats.current) - 10} textAnchor="end" className="fill-ink text-[11px] font-semibold">
            Now {formatINR(stats.current)}
          </text>

          {hover != null && hoverPrice != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#9ca3af" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(hoverPrice)} r={4} fill="var(--color-chart)" stroke="white" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hover != null && hoverPrice != null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{ left: Math.min(Math.max(x(hover) - 50, 0), width - 110) }}
          >
            <p className="text-white/70">{hover === 0 ? "Today" : fmtDate(dateFor(hover))}</p>
            <p className="font-semibold tabular-nums">{formatINR(hoverPrice)}</p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-brand hover:underline">View price changes as a table</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 font-normal">From</th>
              <th className="py-1 text-right font-normal">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...points].reverse().map((p) => (
              <tr key={p.daysAgo}>
                <td className="py-1">{fmtDate(dateFor(p.daysAgo))}</td>
                <td className="py-1 text-right tabular-nums">{formatINR(p.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
