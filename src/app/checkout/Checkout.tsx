"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Smartphone, CreditCard, Banknote, Zap, Truck } from "lucide-react";
import { useStore, useAccount, useHydrated, type CartLine, type Payment } from "@/lib/store";
import { formatINR, orderTotals, deliveryDate, formatDay, expressDays, COD_LIMIT, EXPRESS_FEE, type DeliverySpeed } from "@/lib/pricing";
import AuthForm from "@/components/AuthForm";
import AddressForm from "@/components/AddressForm";

export default function Checkout({ buyNow }: { buyNow?: CartLine }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const cart = useStore((s) => s.cart);
  const pincode = useStore((s) => s.pincode);
  const { saveAddress, placeOrder } = useStore();
  const account = useAccount();

  const [addressId, setAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [speed, setSpeed] = useState<DeliverySpeed>("standard");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [upi, setUpi] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  if (!hydrated) return <div className="mx-auto h-96 max-w-6xl" />;

  const lines = buyNow ? [buyNow] : cart;
  if (!lines.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-lg font-semibold">There&apos;s nothing to check out yet.</p>
        <Link href="/" className="btn-primary mt-4">
          Continue shopping
        </Link>
      </div>
    );
  }

  const t = orderTotals(lines.map((l) => ({ ...l.item, qty: l.qty })), speed);
  const standardDays = Math.max(...lines.map((l) => l.item.deliveryDays));
  const fastDays = Math.max(...lines.map((l) => expressDays(l.item.deliveryDays)));
  const addresses = account?.addresses ?? [];
  const selectedAddress = addresses.find((a) => a.id === (addressId ?? addresses[0]?.id));
  const showAddressForm = account && (addingAddress || addresses.length === 0);
  const codBlocked = !t.codAvailable;

  const place = () => {
    setError("");
    if (!selectedAddress) return setError("Add a delivery address.");
    if (!payment) return setError("Choose how you'd like to pay.");
    if (payment === "upi" && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(upi)) return setError("Enter a UPI ID like name@okbank.");
    setPlacing(true);
    // A short pause so the button state is visible, as a real payment call would take a moment.
    setTimeout(() => {
      const order = placeOrder({ addressId: selectedAddress.id, payment, speed, lines: buyNow ? [buyNow] : undefined });
      if (order) router.push(`/orders/${order.id}?placed=1`);
      else {
        setPlacing(false);
        setError("Something went wrong placing the order. Please try again.");
      }
    }, 700);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Lock className="h-5 w-5 text-muted" /> Checkout
      </h1>
      {buyNow && (
        <p className="mt-1 text-sm text-muted">
          Buying just this item. {cart.length > 0 && "Your cart is left as it is."}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Step n={1} title="Account" done={!!account} summary={account && `${account.name} · ${account.email}`}>
            <div className="max-w-md">
              <AuthForm compact />
            </div>
          </Step>

          <Step n={2} title="Delivery address" done={!!selectedAddress && !showAddressForm} disabled={!account}
            summary={selectedAddress && !showAddressForm && `${selectedAddress.name}, ${selectedAddress.line1}, ${selectedAddress.city} ${selectedAddress.pincode}`}
            action={selectedAddress && !showAddressForm && addresses.length > 0 && <button onClick={() => setAddingAddress(true)} className="text-sm link">Add new</button>}
          >
            {showAddressForm ? (
              <AddressForm
                defaultName={account?.name}
                defaultPincode={pincode}
                onSave={(a) => {
                  saveAddress(a);
                  setAddressId(a.id);
                  setAddingAddress(false);
                }}
                onCancel={addresses.length ? () => setAddingAddress(false) : undefined}
              />
            ) : null}
          </Step>
          {account && !showAddressForm && addresses.length > 1 && (
            <div className="-mt-2 space-y-2 rounded-b-xl px-1">
              {addresses.map((a) => (
                <label key={a.id} className="card flex cursor-pointer items-start gap-3 p-3 text-sm">
                  <input type="radio" name="addr" checked={selectedAddress?.id === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-brand" />
                  <span>
                    <span className="font-medium">{a.name}</span> · {a.line1}, {a.line2 && `${a.line2}, `}
                    {a.city}, {a.state} {a.pincode}
                  </span>
                </label>
              ))}
            </div>
          )}

          <Step n={3} title="Delivery speed" done disabled={!account}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice selected={speed === "standard"} onClick={() => setSpeed("standard")} icon={<Truck className="h-5 w-5" />}
                title={`Standard: ${formatDay(deliveryDate(standardDays))}`}
                body={t.items >= 499 ? "Free" : "₹40, free on orders over ₹499"} />
              <Choice selected={speed === "express"} onClick={() => setSpeed("express")} icon={<Zap className="h-5 w-5" />}
                title={`Express: ${formatDay(deliveryDate(fastDays))}`}
                body={`${formatINR(EXPRESS_FEE)} flat`} disabled={fastDays >= standardDays}
                note={fastDays >= standardDays ? "These items already arrive as fast as we can deliver them." : undefined} />
            </div>
          </Step>

          <Step n={4} title="Payment" done={!!payment} disabled={!account}>
            <div className="grid gap-3">
              <Choice selected={payment === "upi"} onClick={() => setPayment("upi")} icon={<Smartphone className="h-5 w-5" />} title="UPI" body="Pay from any UPI app. We'll send a collect request.">
                {payment === "upi" && (
                  <input autoFocus className="input mt-3 max-w-xs" placeholder="yourname@okbank" value={upi} onChange={(e) => setUpi(e.target.value.trim())} onClick={(e) => e.stopPropagation()} />
                )}
              </Choice>
              <Choice selected={payment === "card"} onClick={() => setPayment("card")} icon={<CreditCard className="h-5 w-5" />} title="Credit or debit card"
                body="Simulated in this demo. No card details are collected." />
              <Choice selected={payment === "cod"} onClick={() => setPayment("cod")} icon={<Banknote className="h-5 w-5" />} title="Cash on delivery"
                body={codBlocked ? `Available on orders up to ${formatINR(COD_LIMIT)}. This one is ${formatINR(t.total)}.` : "Pay in cash or UPI when it arrives. No extra fee."}
                disabled={codBlocked} />
            </div>
          </Step>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <h2 className="font-semibold">Order summary</h2>
            <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
              {lines.map(({ item, qty }) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <img src={item.thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-page object-contain" />
                  <span className="line-clamp-2 flex-1">
                    {item.title} {qty > 1 && <span className="text-muted">× {qty}</span>}
                  </span>
                  <span className="font-medium">{formatINR(item.price * qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Items ({t.count})</dt><dd>{formatINR(t.items)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery{speed === "express" && " (express)"}</dt><dd className={t.delivery ? "" : "text-save"}>{t.delivery ? formatINR(t.delivery) : "Free"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Other fees</dt><dd className="text-muted">None</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Order total</dt><dd>{formatINR(t.total)}</dd></div>
            </dl>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-alert">{error}</p>}
            <button onClick={place} disabled={!account || placing} className="btn-primary mt-4 w-full py-3">
              {placing ? "Placing your order…" : `Place order · ${formatINR(t.total)}`}
            </button>
            {!account && <p className="mt-2 text-center text-xs text-muted">Sign in above to place your order.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({ n, title, done, disabled, summary, action, children }: {
  n: number; title: string; done?: boolean; disabled?: boolean; summary?: React.ReactNode; action?: React.ReactNode; children?: React.ReactNode;
}) {
  const collapsed = done && summary;
  return (
    <section className={`card p-5 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done && !disabled ? "bg-save text-white" : "bg-page text-ink"}`}>
          {done && !disabled ? <Check className="h-4 w-4" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          {collapsed && <p className="truncate text-sm text-muted">{summary}</p>}
        </div>
        {action}
      </div>
      {!collapsed && !disabled && children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Choice({ selected, onClick, icon, title, body, disabled, note, children }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; body: string; disabled?: boolean; note?: string; children?: React.ReactNode;
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && onClick()}
      className={`rounded-xl border-2 p-4 text-sm transition ${disabled ? "cursor-not-allowed border-line bg-page text-muted" : selected ? "cursor-pointer border-brand bg-brand-soft/50" : "cursor-pointer border-line hover:border-ink/30"}`}
    >
      <div className="flex gap-3">
        <span className={selected ? "text-brand" : "text-muted"}>{icon}</span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className={disabled ? "" : "text-muted"}>{body}</p>
          {note && <p className="mt-1 text-xs">{note}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
