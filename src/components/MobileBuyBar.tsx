"use client";

import { useEffect, useState } from "react";
import type { Snap } from "@/lib/snap";
import { formatINR } from "@/lib/pricing";
import AddToCart from "./AddToCart";

/** On phones the buy box sits several screens down; keep price and Add to cart one thumb away. */
export default function MobileBuyBar({ product }: { product: Snap }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const box = document.getElementById("buy-box");
    if (!box) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(box);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur transition-transform lg:hidden ${show ? "translate-y-0" : "translate-y-full"}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{product.title}</p>
          <p className="text-lg font-semibold">{formatINR(product.price)}</p>
        </div>
        <AddToCart product={product} className="btn-primary px-6" />
      </div>
    </div>
  );
}
