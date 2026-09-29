"use client";

import { useState } from "react";
import type { Product, Review } from "@/lib/catalog";
import Stars from "./Stars";

export default function Reviews(product: { rating: number; ratings: Product["ratings"]; reviews: Review[] }) {
  const [filter, setFilter] = useState<number | null>(null);
  const { total, counts } = product.ratings;
  const shown = product.reviews.filter((r) => filter == null || r.rating === filter);

  return (
    <section id="reviews" className="mt-12 grid scroll-mt-32 gap-8 md:grid-cols-[300px_1fr]">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Customer reviews</h2>
        <div className="mt-2 flex items-center gap-2">
          <Stars rating={product.rating} size={18} />
          <span className="font-medium">{product.rating.toFixed(1)} out of 5</span>
        </div>
        <p className="text-sm text-muted">{total.toLocaleString("en-IN")} ratings</p>
        <div className="mt-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct = total ? Math.round((counts[star - 1] / total) * 100) : 0;
            const has = product.reviews.some((r) => r.rating === star);
            return (
              <button
                key={star}
                onClick={() => has && setFilter(filter === star ? null : star)}
                disabled={!has}
                className={`flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-sm ${has ? "hover:bg-white" : "cursor-default"} ${filter === star ? "bg-white font-semibold" : ""}`}
                title={has ? `Show ${star}-star reviews` : `No written ${star}-star reviews`}
              >
                <span className="w-12 text-left">{star} star</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-9 text-right text-muted">{pct}%</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{filter ? `${filter}-star reviews` : "Most recent reviews"}</h3>
          {filter && (
            <button onClick={() => setFilter(null)} className="text-sm text-brand hover:underline">
              Show all
            </button>
          )}
        </div>
        <ul className="mt-3 space-y-3">
          {[...shown]
            .sort((a, b) => +new Date(b.date) - +new Date(a.date))
            .map((r, i) => (
              <li key={i} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark">
                    {r.name[0]}
                  </span>
                  <span className="text-sm font-medium">{r.name}</span>
                  <span className="ml-auto text-xs text-muted">
                    {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="rounded bg-page px-1.5 py-0.5 text-xs text-muted">Verified purchase</span>
                </div>
                <p className="mt-2 text-sm">{r.comment}</p>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
