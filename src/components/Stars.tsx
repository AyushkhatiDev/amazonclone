import { Star } from "lucide-react";

export default function Stars({ rating, size = 14, count }: { rating: number; size?: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, rating - i + 1));
          return (
            <span key={i} className="relative" style={{ width: size, height: size }}>
              <Star className="absolute inset-0 text-amber-400" style={{ width: size, height: size }} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: fill * size }}>
                <Star className="fill-amber-400 text-amber-400" style={{ width: size, height: size }} />
              </span>
            </span>
          );
        })}
      </span>
      {count != null && <span className="text-xs text-muted">({count.toLocaleString("en-IN")})</span>}
    </span>
  );
}
