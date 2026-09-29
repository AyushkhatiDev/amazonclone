"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { snap, type Snap } from "@/lib/snap";
import { useUI } from "@/lib/ui";
import { flyToCart } from "@/lib/flyToCart";

export default function AddToCart({ product, qty = 1, className = "btn-primary w-full", drawer = true }: { product: Snap; qty?: number; className?: string; drawer?: boolean }) {
  const add = useStore((s) => s.addToCart);
  const showAdded = useUI((s) => s.showAdded);
  const [added, setAdded] = useState(false);
  if (product.stock === 0) {
    return (
      <button disabled className={className}>
        Out of stock
      </button>
    );
  }
  return (
    <button
      className={`${className} ${added ? "!border-save !bg-save !text-white" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        add(snap(product), qty);
        flyToCart(e.currentTarget);
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
        // Let the image land before the drawer slides over it.
        if (drawer) setTimeout(() => showAdded(snap(product), qty), 450);
      }}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" /> Added
        </>
      ) : (
        "Add to cart"
      )}
    </button>
  );
}
