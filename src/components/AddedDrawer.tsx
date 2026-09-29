"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { useUI } from "@/lib/ui";
import { useStore } from "@/lib/store";
import { formatINR, orderTotals, FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";

/** Replaces Amazon's full-page "Added to cart" interstitial: confirm, show the total, let people keep browsing. */
export default function AddedDrawer() {
  const added = useUI((s) => s.added);
  const close = useUI((s) => s.closeAdded);
  const cart = useStore((s) => s.cart);
  const pathname = usePathname();
  const t = orderTotals(cart.map((l) => ({ ...l.item, qty: l.qty })));

  useEffect(() => close(), [pathname, close]);
  useEffect(() => {
    if (!added) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [added, close]);

  if (!added) return null;
  const progress = Math.min(100, (t.items / FREE_DELIVERY_THRESHOLD) * 100);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Added to cart">
      <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={close} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl animate-[slide_.2s_ease-out]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="flex items-center gap-2 font-semibold text-save">
            <CheckCircle2 className="h-5 w-5" /> Added to cart
          </span>
          <button onClick={close} aria-label="Close" className="rounded-full p-1 hover:bg-page">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-3 px-5 py-4">
          <img src={added.item.thumbnail} alt="" className="h-20 w-20 rounded-lg bg-page object-contain" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm">{added.item.title}</p>
            <p className="mt-1 text-sm font-semibold">
              {formatINR(added.item.price)} <span className="font-normal text-muted">× {added.qty}</span>
            </p>
          </div>
        </div>
        <div className="mx-5 rounded-xl bg-page p-4 text-sm">
          <div className="flex justify-between">
            <span>Cart ({t.count} items)</span>
            <span className="font-semibold">{formatINR(t.items)}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-save" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {t.toFreeDelivery > 0 ? (
              <>Add {formatINR(t.toFreeDelivery)} more for free delivery.</>
            ) : (
              <span className="text-save">Your order gets free delivery.</span>
            )}
          </p>
        </div>
        <div className="mt-auto flex flex-col gap-2 border-t border-line p-5">
          <Link href="/checkout" className="btn-primary">
            Checkout · {formatINR(t.total)}
          </Link>
          <Link href="/cart" className="btn-secondary">
            View cart
          </Link>
          <button onClick={close} className="btn-ghost">
            Keep shopping
          </button>
        </div>
      </aside>
    </div>
  );
}

export function Toast() {
  const toast = useUI((s) => s.toast);
  if (!toast) return null;
  return (
    <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg">
      {toast}
    </div>
  );
}
