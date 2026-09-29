"use client";

import { useStore } from "@/lib/store";
import { snap, type Snap } from "@/lib/snap";
import { useUI } from "@/lib/ui";

export default function AddToCart({ product, qty = 1, className = "btn-primary w-full" }: { product: Snap; qty?: number; className?: string }) {
  const add = useStore((s) => s.addToCart);
  const showAdded = useUI((s) => s.showAdded);
  if (product.stock === 0) {
    return (
      <button disabled className={className}>
        Out of stock
      </button>
    );
  }
  return (
    <button
      className={className}
      onClick={(e) => {
        e.preventDefault();
        add(snap(product), qty);
        showAdded(snap(product), qty);
      }}
    >
      Add to cart
    </button>
  );
}
