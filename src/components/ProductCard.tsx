import Link from "next/link";
import type { Product } from "@/lib/catalog";
import Stars from "./Stars";
import Price from "./Price";
import DeliveryLine from "./DeliveryLine";
import AddToCart from "./AddToCart";
import { snap } from "@/lib/snap";

export default function ProductCard({ p }: { p: Product }) {
  return (
    <div className="card group flex flex-col overflow-hidden transition hover:shadow-md">
      <Link href={`/p/${p.slug}`} className="block bg-page/60 p-4">
        <img src={p.thumbnail} alt={p.title} loading="lazy" className="mx-auto aspect-square w-full object-contain transition group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3">
        {p.brand && <span className="text-xs font-medium uppercase tracking-wide text-muted">{p.brand}</span>}
        <Link href={`/p/${p.slug}`} className="line-clamp-2 text-[15px] leading-snug hover:text-brand">
          {p.title}
        </Link>
        <Stars rating={p.rating} count={p.ratings.total} />
        <Price price={p.price} mrp={p.mrp} size="sm" />
        <DeliveryLine days={p.deliveryDays} price={p.price} compact />
        {p.stock > 0 && p.stock <= 5 && <span className="text-xs text-muted">{p.stock} in stock</span>}
        <div className="mt-auto pt-2">
          <AddToCart product={snap(p)} className="btn-secondary w-full" />
        </div>
      </div>
    </div>
  );
}
