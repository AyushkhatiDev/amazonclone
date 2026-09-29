"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  ["relevance", "Best match"],
  ["rating", "Highest rated"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["fastest", "Fastest delivery"],
  ["discount", "Biggest saving"],
] as const;

export default function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort by</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(params);
          if (e.target.value === "relevance") p.delete("sort");
          else p.set("sort", e.target.value);
          router.push(`/s?${p}`, { scroll: false });
        }}
        className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
      >
        {OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
