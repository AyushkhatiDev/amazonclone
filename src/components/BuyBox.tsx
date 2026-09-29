"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import type { Snap } from "@/lib/snap";
import { useStore, useHydrated } from "@/lib/store";
import { useUI } from "@/lib/ui";
import AddToCart from "./AddToCart";

export default function BuyBox({ product }: { product: Snap }) {
  const [qty, setQty] = useState(1);
  const router = useRouter();
  const hydrated = useHydrated();
  const inList = useStore((s) => s.wishlist.some((x) => x.id === product.id));
  const toggle = useStore((s) => s.toggleWishlist);
  const toast = useUI((s) => s.showToast);
  const max = Math.min(10, product.stock);

  return (
    <div className="mt-4 space-y-2">
      {product.stock > 0 && (
        <label className="flex items-center gap-2 text-sm">
          Quantity
          <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="rounded-lg border border-line bg-page px-2 py-1.5">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      <AddToCart product={product} qty={qty} />
      {product.stock > 0 && (
        // Buy now skips the cart: whatever is already in it stays untouched.
        <button onClick={() => router.push(`/checkout?buy=${product.id}&qty=${qty}`)} className="btn w-full bg-ink text-white hover:bg-ink-2">
          Buy now
        </button>
      )}
      <button
        onClick={() => {
          toggle(product);
          toast(inList ? "Removed from your wishlist" : "Saved to your wishlist");
        }}
        className="btn-ghost w-full"
      >
        <Heart className={`h-4 w-4 ${hydrated && inList ? "fill-brand" : ""}`} />
        {hydrated && inList ? "In your wishlist" : "Add to wishlist"}
      </button>
    </div>
  );
}
