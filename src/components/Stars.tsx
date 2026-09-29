/** Two layers of ★ glyphs with the top one clipped to the rating: one element instead of ten SVGs per card. */
export default function Stars({ rating, size = 14, count }: { rating: number; size?: number; count?: number }) {
  const pct = (Math.max(0, Math.min(5, rating)) / 5) * 100;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${rating} out of 5 stars`}>
      <span className="relative inline-block leading-none tracking-[1px]" style={{ fontSize: size }} aria-hidden>
        <span className="text-amber-400/30">★★★★★</span>
        <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-amber-400" style={{ width: `${pct}%` }}>
          ★★★★★
        </span>
      </span>
      {count != null && <span className="text-xs text-muted">({count.toLocaleString("en-IN")})</span>}
    </span>
  );
}
