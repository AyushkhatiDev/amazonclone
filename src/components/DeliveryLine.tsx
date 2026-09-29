"use client";

import { Truck, Zap } from "lucide-react";
import { deliveryDate, formatDay, FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";
import { useHydrated, useStore } from "@/lib/store";

/**
 * Pages are prerendered at build time, so the date must be computed in the browser,
 * or every product would promise a delivery date frozen at the last deploy.
 */
export default function DeliveryLine({ days, price, compact = false }: { days: number; price: number; compact?: boolean }) {
  const hydrated = useHydrated();
  const pincode = useStore((s) => s.pincode);
  if (!hydrated) return <div className="h-5" />;
  const date = formatDay(deliveryDate(days));
  const fast = days <= 2;
  const free = price >= FREE_DELIVERY_THRESHOLD;
  return (
    <div className={`flex items-center gap-1.5 text-sm ${compact ? "" : "leading-snug"}`}>
      {fast ? <Zap className="h-4 w-4 shrink-0 text-save" /> : <Truck className="h-4 w-4 shrink-0 text-muted" />}
      <span>
        {free ? "Free delivery " : "Delivery "}
        <span className={`font-semibold ${fast ? "text-save" : ""}`}>{date}</span>
        {!compact && pincode && <span className="text-muted"> to {pincode}</span>}
        {!compact && !free && <span className="block text-xs text-muted">₹40 delivery fee, free on orders over ₹{FREE_DELIVERY_THRESHOLD}</span>}
      </span>
    </div>
  );
}
