"use client";

import { Check } from "lucide-react";
import { STAGES, orderStatus, type Order } from "@/lib/store";
import { formatDay } from "@/lib/pricing";

export function StatusBadge({ order }: { order: Order }) {
  const st = orderStatus(order);
  const color =
    st.stage === "Cancelled" ? "bg-page text-muted" : st.stage === "Delivered" ? "bg-green-50 text-save" : "bg-brand-soft text-brand-dark";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{st.stage}</span>;
}

export function deliveryHeadline(order: Order) {
  const st = orderStatus(order);
  if (st.stage === "Cancelled") return "Cancelled";
  if (st.deliveredAt) return `Delivered ${formatDay(st.deliveredAt)}`;
  return `Arriving ${formatDay(new Date(order.promisedAt))}`;
}

export function Timeline({ order }: { order: Order }) {
  const st = orderStatus(order);
  if (st.stage === "Cancelled") return null;
  return (
    <ol className="grid grid-cols-5 gap-1">
      {STAGES.map((s, i) => {
        const done = i <= st.index;
        return (
          <li key={s} className="flex flex-col items-center text-center text-xs">
            <div className="flex w-full items-center">
              <span className={`h-1 flex-1 ${i === 0 ? "invisible" : done ? "bg-save" : "bg-line"}`} />
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-save text-white" : "border-2 border-line bg-white"}`}>
                {done && <Check className="h-4 w-4" />}
              </span>
              <span className={`h-1 flex-1 ${i === STAGES.length - 1 ? "invisible" : i < st.index ? "bg-save" : "bg-line"}`} />
            </div>
            <span className={`mt-1.5 ${i === st.index ? "font-semibold" : done ? "" : "text-muted"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

export const paymentLabel = { upi: "UPI", card: "Card", cod: "Cash on delivery" } as const;
