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
            {/* Each step fills in after the one before it, so progress reads as movement. */}
            <div className="flex w-full items-center">
              <Segment hidden={i === 0} filled={done} delay={i * 2 - 1} />
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${done ? "bg-save text-white" : "border-2 border-line bg-white"} ${i === st.index ? "ring-4 ring-save/20" : ""}`}
                style={done ? { animation: `pop .4s ${i * 0.24}s var(--ease-out-soft) both` } : undefined}
              >
                {done && <Check className="h-4 w-4" />}
              </span>
              <Segment hidden={i === STAGES.length - 1} filled={i < st.index} delay={i * 2} />
            </div>
            <span className={`mt-1.5 ${i === st.index ? "font-semibold" : done ? "" : "text-muted"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Segment({ hidden, filled, delay }: { hidden: boolean; filled: boolean; delay: number }) {
  return (
    <span className={`relative h-1 flex-1 overflow-hidden rounded-full bg-line ${hidden ? "invisible" : ""}`}>
      {filled && <span className="absolute inset-0 origin-left bg-save" style={{ animation: `grow-x .24s ${Math.max(0, delay) * 0.12}s ease-out both` }} />}
    </span>
  );
}

export const paymentLabel = { upi: "UPI", card: "Card", cod: "Cash on delivery" } as const;
