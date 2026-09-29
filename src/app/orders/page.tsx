"use client";

import Link from "next/link";
import { useState } from "react";
import { Package } from "lucide-react";
import { useAccount, useHydrated, orderStatus, returnWindow } from "@/lib/store";
import { formatINR } from "@/lib/pricing";
import AuthForm from "@/components/AuthForm";
import AddToCart from "@/components/AddToCart";
import { StatusBadge, deliveryHeadline } from "@/components/OrderBits";

const FILTERS = ["All", "In progress", "Delivered", "Cancelled"] as const;

export default function OrdersPage() {
  const hydrated = useHydrated();
  const account = useAccount();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  if (!hydrated) return <div className="h-96" />;

  if (!account) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="card p-6">
          <h1 className="mb-1 text-xl font-bold">Your orders</h1>
          <p className="mb-5 text-sm text-muted">Sign in to see and manage your orders.</p>
          <AuthForm />
        </div>
      </div>
    );
  }

  const orders = account.orders.filter((o) => {
    const s = orderStatus(o).stage;
    if (filter === "All") return true;
    if (filter === "Cancelled") return s === "Cancelled";
    if (filter === "Delivered") return s === "Delivered";
    return s !== "Cancelled" && s !== "Delivered";
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Your orders</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${filter === f ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/30"}`}>
            {f}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center p-12 text-center">
          <Package className="h-10 w-10 text-muted" />
          <p className="mt-3 font-semibold">{account.orders.length ? "No orders match this filter." : "You haven't placed any orders yet."}</p>
          <Link href="/" className="btn-primary mt-4">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => {
            const st = orderStatus(o);
            const returnable = o.lines.some((l) => returnWindow(o, l).eligible && !o.returns.some((r) => r.productId === l.item.id));
            return (
              <li key={o.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-page/60 px-5 py-3 text-xs text-muted">
                  <span>
                    Placed {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {formatINR(o.totals.total)}
                  </span>
                  <span>Order {o.id}</span>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{deliveryHeadline(o)}</h2>
                    <StatusBadge order={o} />
                  </div>
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                    <ul className="flex-1 space-y-3">
                      {o.lines.map((l) => (
                        <li key={l.item.id} className="flex gap-3">
                          <Link href={`/p/${l.item.slug}`} className="shrink-0 rounded-lg bg-page p-1">
                            <img src={l.item.thumbnail} alt="" className="h-16 w-16 object-contain" />
                          </Link>
                          <div className="min-w-0 text-sm">
                            <Link href={`/p/${l.item.slug}`} className="line-clamp-2 hover:text-brand">{l.item.title}</Link>
                            <p className="text-muted">Qty {l.qty}</p>
                            {st.stage === "Delivered" && <AddToCart product={l.item} className="btn-secondary mt-1 px-3 py-1 text-xs" />}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-48">
                      <Link href={`/orders/${o.id}`} className="btn-primary">
                        {st.stage === "Delivered" || st.stage === "Cancelled" ? "View order" : "Track package"}
                      </Link>
                      {st.canCancel && <Link href={`/orders/${o.id}#cancel`} className="btn-secondary">Cancel order</Link>}
                      {returnable && <Link href={`/orders/${o.id}#items`} className="btn-secondary">Return an item</Link>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
