"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, RotateCcw } from "lucide-react";
import { useAccount, useHydrated, useStore, orderStatus, returnWindow, type CartLine, type Order } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { formatINR, formatDay } from "@/lib/pricing";
import AddToCart from "@/components/AddToCart";
import { StatusBadge, Timeline, deliveryHeadline, paymentLabel } from "@/components/OrderBits";

const REASONS = ["Doesn't fit / wrong size", "Arrived damaged", "Not as described", "Better price elsewhere", "No longer needed"];

export default function OrderDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const account = useAccount();
  const placed = useSearchParams().get("placed") === "1";
  const cancelOrder = useStore((s) => s.cancelOrder);
  const toast = useUI((s) => s.showToast);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!hydrated) return <div className="h-96" />;
  const order = account?.orders.find((o) => o.id === id);
  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-lg font-semibold">We couldn&apos;t find that order.</p>
        <p className="mt-1 text-sm text-muted">{account ? "It may belong to a different account." : "Sign in to see your orders."}</p>
        <Link href="/orders" className="btn-primary mt-4">Go to your orders</Link>
      </div>
    );
  }

  const st = orderStatus(order);
  const a = order.address;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/orders" className="inline-flex items-center text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> All orders
      </Link>

      {placed && st.stage !== "Cancelled" && (
        <div className="mt-4 flex gap-3 rounded-xl border border-save/30 bg-green-50 p-5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-save" />
          <div>
            <p className="font-semibold text-save">Order placed. Thank you!</p>
            <p className="text-sm">
              {order.payment === "cod" ? `Please keep ${formatINR(order.totals.total)} ready at delivery.` : `${formatINR(order.totals.total)} paid by ${paymentLabel[order.payment]}.`}{" "}
              It&apos;ll arrive {formatDay(new Date(order.promisedAt))}. You can cancel any time before it ships.
            </p>
          </div>
        </div>
      )}

      <div className="card mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{deliveryHeadline(order)}</h1>
          <StatusBadge order={order} />
        </div>
        <p className="mt-1 text-sm text-muted">
          Order {order.id} · placed {new Date(order.placedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </p>
        <div className="mt-6">
          <Timeline order={order} />
        </div>
        {st.stage === "Cancelled" && (
          <p className="mt-4 rounded-lg bg-page p-3 text-sm">
            Cancelled on {new Date(order.cancelledAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.
            {order.payment !== "cod" && ` Your refund of ${formatINR(order.totals.total)} goes back to your ${paymentLabel[order.payment]} within 2–4 working days.`}
          </p>
        )}
        {st.canCancel && (
          <div id="cancel" className="mt-6 scroll-mt-32 border-t border-line pt-4">
            {confirmCancel ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>Cancel the whole order? This can&apos;t be undone.</span>
                <button
                  onClick={() => {
                    cancelOrder(order.id);
                    toast("Order cancelled");
                  }}
                  className="btn bg-alert text-white hover:brightness-110"
                >
                  Yes, cancel it
                </button>
                <button onClick={() => setConfirmCancel(false)} className="btn-secondary">Keep order</button>
              </div>
            ) : (
              <button onClick={() => setConfirmCancel(true)} className="btn-secondary">Cancel order</button>
            )}
            <p className="mt-2 text-xs text-muted">Orders can be cancelled until they ship.</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
        <section id="items" className="card scroll-mt-32 p-5">
          <h2 className="font-semibold">Items</h2>
          <ul className="mt-3 divide-y divide-line">
            {order.lines.map((l) => (
              <ItemRow key={l.item.id} order={order} line={l} />
            ))}
          </ul>
        </section>
        <div className="space-y-4">
          <section className="card p-5 text-sm">
            <h2 className="font-semibold">Delivering to</h2>
            <p className="mt-2">{a.name}</p>
            <p className="text-muted">
              {a.line1}
              {a.line2 && `, ${a.line2}`}
              <br />
              {a.city}, {a.state} {a.pincode}
              <br />
              {a.phone}
            </p>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="font-semibold">Payment</h2>
            <dl className="mt-2 space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{formatINR(order.totals.items)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery{order.speed === "express" && " (express)"}</dt><dd>{order.totals.delivery ? formatINR(order.totals.delivery) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd>{formatINR(order.totals.total)}</dd></div>
              <div className="flex justify-between text-muted"><dt>Paid by</dt><dd>{paymentLabel[order.payment]}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function ItemRow({ order, line }: { order: Order; line: CartLine }) {
  const requestReturn = useStore((s) => s.requestReturn);
  const toast = useUI((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const st = orderStatus(order);
  const win = returnWindow(order, line);
  const returned = order.returns.find((r) => r.productId === line.item.id);

  return (
    <li className="py-4">
      <div className="flex gap-3">
        <Link href={`/p/${line.item.slug}`} className="shrink-0 rounded-lg bg-page p-1">
          <img src={line.item.thumbnail} alt="" className="h-20 w-20 object-contain" />
        </Link>
        <div className="min-w-0 flex-1 text-sm">
          <Link href={`/p/${line.item.slug}`} className="line-clamp-2 font-medium hover:text-brand">{line.item.title}</Link>
          <p className="text-muted">
            Qty {line.qty} · {formatINR(line.item.price * line.qty)}
          </p>
          {returned ? (
            <p className="mt-1 flex items-center gap-1 text-brand-dark">
              <RotateCcw className="h-3.5 w-3.5" /> Return requested: pickup in 1–2 days, refund once it&apos;s collected.
            </p>
          ) : st.deliveredAt ? (
            <p className="mt-1 text-muted">
              {!line.item.returnDays
                ? "This item can't be returned."
                : win.eligible
                  ? `Returnable until ${win.until!.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                  : `Return window closed on ${win.until!.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {st.deliveredAt && <AddToCart product={line.item} className="btn-secondary px-3 py-1 text-xs" />}
            {win.eligible && !returned && !open && (
              <button onClick={() => setOpen(true)} className="btn-secondary px-3 py-1 text-xs">Return item</button>
            )}
          </div>
        </div>
      </div>
      {open && (
        <div className="mt-3 rounded-xl bg-page p-4 text-sm">
          <p className="font-medium">Why are you returning it?</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2">
                <input type="radio" name={`reason-${line.item.id}`} checked={reason === r} onChange={() => setReason(r)} className="accent-brand" /> {r}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Free pickup from {order.address.city} {order.address.pincode}. You&apos;ll get {formatINR(line.item.price * line.qty)} back to your{" "}
            {order.payment === "cod" ? "bank account" : paymentLabel[order.payment]} once it&apos;s collected.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={!reason}
              onClick={() => {
                requestReturn(order.id, line.item.id, reason);
                setOpen(false);
                toast("Return requested. Pickup is scheduled.");
              }}
              className="btn-primary px-4 py-1.5"
            >
              Request pickup
            </button>
            <button onClick={() => setOpen(false)} className="btn-secondary px-4 py-1.5">Not now</button>
          </div>
        </div>
      )}
    </li>
  );
}
