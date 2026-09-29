import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Product } from "@/lib/catalog";
import ProductCard from "./ProductCard";
import ShelfScroller from "./ShelfScroller";

export default function Shelf({ title, href, items, note }: { title: string; href?: string; items: Product[]; note?: string }) {
  return (
    <section className="reveal mt-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {note && <p className="text-sm text-muted">{note}</p>}
        </div>
        {href && (
          <Link href={href} className="flex shrink-0 items-center text-sm font-medium text-brand hover:underline">
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <ShelfScroller>
        {items.map((p) => (
          <div key={p.id} className="w-52 shrink-0 snap-start sm:w-56">
            <ProductCard p={p} />
          </div>
        ))}
      </ShelfScroller>
    </section>
  );
}
