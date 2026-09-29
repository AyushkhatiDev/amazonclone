"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { formatINR, savingsPct } from "@/lib/pricing";
import AddToCart from "@/components/AddToCart";

export default function ListsPage() {
  const hydrated = useHydrated();
  const wishlist = useStore((s) => s.wishlist);
  const toggle = useStore((s) => s.toggleWishlist);
  if (!hydrated) return <div className="h-96" />;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Your wishlist</h1>
      <p className="text-sm text-muted">Saved on this device. We show the current price, so you can see when something gets cheaper.</p>
      {wishlist.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center p-12 text-center">
          <Heart className="h-10 w-10 text-muted" />
          <p className="mt-3 font-semibold">Nothing saved yet.</p>
          <p className="text-sm text-muted">Tap “Add to wishlist” on any product to keep it here.</p>
          <Link href="/" className="btn-primary mt-4">Discover products</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {wishlist.map((p) => (
            <div key={p.id} data-product className="card lift flex flex-col p-4">
              <Link href={`/p/${p.slug}`} className="block rounded-lg bg-page p-2">
                <img src={p.thumbnail} alt={p.title} className="aspect-square w-full object-contain" />
              </Link>
              <Link href={`/p/${p.slug}`} className="mt-3 line-clamp-2 text-sm hover:text-brand">{p.title}</Link>
              <p className="mt-1 font-semibold">
                {formatINR(p.price)} {savingsPct(p.price, p.mrp) > 0 && <span className="text-xs font-normal text-save">{savingsPct(p.price, p.mrp)}% off</span>}
              </p>
              <div className="mt-auto space-y-1 pt-3">
                <AddToCart product={p} className="btn-secondary w-full px-3 py-1.5 text-xs" />
                <button onClick={() => toggle(p)} className="w-full text-xs text-muted hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
