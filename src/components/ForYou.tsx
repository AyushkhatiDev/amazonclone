"use client";

import Link from "next/link";
import { RotateCcw, History } from "lucide-react";
import { useStore, useAccount, useHydrated, orderStatus, type Snap } from "@/lib/store";
import { formatINR } from "@/lib/pricing";
import AddToCart from "./AddToCart";

/** Amazon's most useful rows ("Buy it again", recent history) sit below six banners. Here they come first. */
export default function ForYou() {
  const hydrated = useHydrated();
  const recent = useStore((s) => s.recent);
  const account = useAccount();
  if (!hydrated) return null;

  const bought = new Map<number, Snap>();
  for (const o of account?.orders ?? []) {
    if (orderStatus(o).stage !== "Delivered") continue;
    for (const l of o.lines) bought.set(l.item.id, l.item);
  }
  const buyAgain = [...bought.values()].slice(0, 6);
  if (!recent.length && !buyAgain.length) return null;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {recent.length > 0 && (
        <MiniRow icon={<History className="h-4 w-4" />} title="Pick up where you left off" items={recent.slice(0, 6)} />
      )}
      {buyAgain.length > 0 && (
        <MiniRow icon={<RotateCcw className="h-4 w-4" />} title="Buy again" items={buyAgain} withAdd />
      )}
    </div>
  );
}

function MiniRow({ icon, title, items, withAdd }: { icon: React.ReactNode; title: string; items: Snap[]; withAdd?: boolean }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        {icon} {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((p) => (
          <div key={p.id} className="w-28 shrink-0">
            <Link href={`/p/${p.slug}`} className="block rounded-lg bg-page p-2">
              <img src={p.thumbnail} alt={p.title} className="aspect-square w-full object-contain" />
            </Link>
            <p className="mt-1 truncate text-xs">{p.title}</p>
            <p className="text-sm font-semibold">{formatINR(p.price)}</p>
            {withAdd && <AddToCart product={p} className="btn-secondary mt-1 w-full px-2 py-1 text-xs" />}
          </div>
        ))}
      </div>
    </section>
  );
}
