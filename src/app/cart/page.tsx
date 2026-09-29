"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, Info, ShieldCheck } from "lucide-react";
import { useStore, useHydrated, type Snap } from "@/lib/store";
import { formatINR, orderTotals, FREE_DELIVERY_THRESHOLD, COD_LIMIT } from "@/lib/pricing";
import DeliveryLine from "@/components/DeliveryLine";
import AddToCart from "@/components/AddToCart";

export default function CartPage() {
  const hydrated = useHydrated();
  const { cart, saved, wishlist, setQty, removeFromCart, saveForLater, moveToCart, removeSaved } = useStore();
  if (!hydrated) return <div className="mx-auto h-96 max-w-[1400px]" />;

  const t = orderTotals(cart.map((l) => ({ ...l.item, qty: l.qty })));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>
            {cart.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-lg font-semibold">Your cart is empty.</p>
                <p className="mt-1 text-sm text-muted">Items you add show up here, with the full price including delivery.</p>
                <Link href="/s?sort=discount" className="btn-primary mt-5">
                  Browse today&apos;s deals
                </Link>
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {cart.map(({ item, qty }) => (
                  <li key={item.id} className="flex gap-4 py-5">
                    <Link href={`/p/${item.slug}`} className="shrink-0 rounded-xl bg-page p-2">
                      <img src={item.thumbnail} alt="" className="h-24 w-24 object-contain sm:h-32 sm:w-32" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-4">
                        <Link href={`/p/${item.slug}`} className="line-clamp-2 font-medium hover:text-brand">
                          {item.title}
                        </Link>
                        <div className="shrink-0 sm:text-right">
                          <p className="text-lg font-semibold">{formatINR(item.price * qty)}</p>
                          {qty > 1 && <p className="text-xs text-muted">{formatINR(item.price)} each</p>}
                        </div>
                      </div>
                      <div className="mt-1 space-y-0.5 text-sm">
                        <DeliveryLine days={item.deliveryDays} price={item.price} compact dateOnly />
                        <p className="text-muted">{item.returnDays ? `Returnable within ${item.returnDays} days` : "Not returnable"}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center rounded-full border border-ink/15 bg-white">
                          <button
                            onClick={() => setQty(item.id, qty - 1)}
                            aria-label={qty === 1 ? "Remove" : "Decrease quantity"}
                            className="rounded-l-full p-2 hover:bg-page"
                          >
                            {qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          </button>
                          <span className="w-8 text-center font-semibold" aria-live="polite">
                            {qty}
                          </span>
                          <button
                            onClick={() => setQty(item.id, qty + 1)}
                            disabled={qty >= Math.min(10, item.stock)}
                            aria-label="Increase quantity"
                            className="rounded-r-full p-2 hover:bg-page disabled:opacity-30"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <button onClick={() => saveForLater(item.id)} className="link">
                          Save for later
                        </button>
                        <button onClick={() => removeFromCart(item.id)} className="link">
                          Delete
                        </button>
                        {qty >= Math.min(10, item.stock) && <span className="text-xs text-muted">Max {Math.min(10, item.stock)} per order</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {saved.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Saved for later ({saved.length})</h2>
              <ItemGrid
                items={saved}
                actions={(p) => (
                  <>
                    <button onClick={() => moveToCart(p.id)} className="btn-secondary w-full px-3 py-1.5 text-xs" disabled={p.stock === 0}>
                      Move to cart
                    </button>
                    <button onClick={() => removeSaved(p.id)} className="mt-1 w-full text-xs text-muted hover:underline">
                      Remove
                    </button>
                  </>
                )}
              />
            </section>
          )}

          {wishlist.length > 0 && (
            <section className="card p-5 sm:p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">From your wishlist</h2>
                <Link href="/lists" className="text-sm link">
                  View wishlist
                </Link>
              </div>
              <ItemGrid
                items={wishlist.filter((w) => !cart.some((l) => l.item.id === w.id)).slice(0, 6)}
                actions={(p) => <AddToCart product={p} className="btn-secondary w-full px-3 py-1.5 text-xs" />}
              />
            </section>
          )}
        </div>

        {cart.length > 0 && (
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="card p-5">
              <h2 className="font-semibold">Order summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label={`Items (${t.count})`} value={formatINR(t.items)} />
                <Row label="Delivery" value={t.delivery ? formatINR(t.delivery) : "Free"} valueClass={t.delivery ? "" : "text-save"} />
                <Row label="Other fees" value="None" valueClass="text-muted" />
                <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
                  <dt>Total</dt>
                  <dd>{formatINR(t.total)}</dd>
                </div>
                {t.saved > 0 && <p className="text-right text-sm text-save">You save {formatINR(t.saved)} against list prices</p>}
              </dl>

              {t.toFreeDelivery > 0 && (
                <div className="mt-4 rounded-lg bg-page p-3 text-xs">
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full bg-save" style={{ width: `${(t.items / FREE_DELIVERY_THRESHOLD) * 100}%` }} />
                  </div>
                  Add {formatINR(t.toFreeDelivery)} more to get free delivery.
                </div>
              )}

              <p className="mt-4 flex gap-2 rounded-lg bg-brand-soft p-3 text-xs text-brand-dark">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                This total won&apos;t change at checkout, unless you choose express delivery ({formatINR(99)}).
              </p>
              {!t.codAvailable && (
                <p className="mt-2 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                  <Info className="h-4 w-4 shrink-0" />
                  Cash on delivery is only available on orders up to {formatINR(COD_LIMIT)}. You can pay for this order by UPI or card.
                </p>
              )}

              <Link href="/checkout" className="btn-primary mt-4 w-full py-3">
                Proceed to checkout
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
  );
}

function ItemGrid({ items, actions }: { items: Snap[]; actions: (p: Snap) => React.ReactNode }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <div key={p.id} data-product className="text-sm">
          <Link href={`/p/${p.slug}`} className="block rounded-xl bg-page p-2">
            <img src={p.thumbnail} alt="" className="aspect-square w-full object-contain" />
          </Link>
          <p className="mt-2 line-clamp-2">{p.title}</p>
          <p className="font-semibold">{formatINR(p.price)}</p>
          {p.stock === 0 && <p className="text-xs text-alert">Out of stock</p>}
          <div className="mt-2">{actions(p)}</div>
        </div>
      ))}
    </div>
  );
}
