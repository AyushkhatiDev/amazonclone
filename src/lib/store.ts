"use client";

// The whole "backend": accounts, cart, lists and orders, persisted in localStorage.
// Pages only talk to this store, so swapping it for a real API is a contained change.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { snap, type Snap } from "./snap";

export { snap, type Snap };
import { orderTotals, type DeliverySpeed, deliveryDate, expressDays } from "./pricing";

export type CartLine = { item: Snap; qty: number };

export type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

export type Payment = "upi" | "card" | "cod";

export type Order = {
  id: string;
  placedAt: string;
  promisedAt: string;
  lines: CartLine[];
  address: Address;
  payment: Payment;
  speed: DeliverySpeed;
  totals: ReturnType<typeof orderTotals>;
  cancelledAt?: string;
  returns: { productId: number; reason: string; requestedAt: string }[];
};

export type Account = {
  name: string;
  email: string;
  pwHash: string;
  addresses: Address[];
  orders: Order[];
};

type State = {
  pincode: string;
  cart: CartLine[];
  saved: Snap[];
  wishlist: Snap[];
  recent: Snap[];
  session: string | null;
  accounts: Record<string, Account>;
};

type Actions = {
  setPincode: (pin: string) => void;
  addToCart: (p: Snap, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  removeFromCart: (id: number) => void;
  saveForLater: (id: number) => void;
  moveToCart: (id: number) => void;
  removeSaved: (id: number) => void;
  toggleWishlist: (p: Snap) => void;
  viewed: (p: Snap) => void;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInDemo: () => Promise<void>;
  signOut: () => void;
  saveAddress: (a: Address) => void;
  placeOrder: (o: { addressId: string; payment: Payment; speed: DeliverySpeed; lines?: CartLine[] }) => Order | null;
  cancelOrder: (orderId: string) => void;
  requestReturn: (orderId: string, productId: number, reason: string) => void;
};

async function hash(email: string, password: string) {
  // Demo-grade only: the browser is the database here, so this just avoids storing plain text.
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email.toLowerCase()}:${password}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const DEMO_EMAIL = "demo@bazaar.in";
export const DEMO_PASSWORD = "demo1234";

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => {
      const account = () => {
        const { session, accounts } = get();
        return session ? accounts[session] : undefined;
      };
      const updateAccount = (fn: (a: Account) => Account) => {
        const a = account();
        if (!a) return;
        set({ accounts: { ...get().accounts, [a.email]: fn(a) } });
      };

      return {
        pincode: "",
        cart: [],
        saved: [],
        wishlist: [],
        recent: [],
        session: null,
        accounts: {},

        setPincode: (pincode) => set({ pincode }),

        addToCart: (p, qty = 1) =>
          set((s) => {
            const existing = s.cart.find((l) => l.item.id === p.id);
            const cart = existing
              ? s.cart.map((l) => (l.item.id === p.id ? { ...l, qty: Math.min(l.qty + qty, 10, p.stock) } : l))
              : [...s.cart, { item: snap(p), qty: Math.min(qty, 10, p.stock) }];
            return { cart, saved: s.saved.filter((x) => x.id !== p.id) };
          }),
        setQty: (id, qty) =>
          set((s) => ({
            cart: qty <= 0 ? s.cart.filter((l) => l.item.id !== id) : s.cart.map((l) => (l.item.id === id ? { ...l, qty } : l)),
          })),
        removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((l) => l.item.id !== id) })),
        saveForLater: (id) =>
          set((s) => {
            const line = s.cart.find((l) => l.item.id === id);
            if (!line) return s;
            return { cart: s.cart.filter((l) => l.item.id !== id), saved: [line.item, ...s.saved.filter((x) => x.id !== id)] };
          }),
        moveToCart: (id) => {
          const item = get().saved.find((x) => x.id === id);
          if (item) get().addToCart(item);
        },
        removeSaved: (id) => set((s) => ({ saved: s.saved.filter((x) => x.id !== id) })),

        toggleWishlist: (p) =>
          set((s) => ({
            wishlist: s.wishlist.some((x) => x.id === p.id) ? s.wishlist.filter((x) => x.id !== p.id) : [snap(p), ...s.wishlist],
          })),
        viewed: (p) => set((s) => ({ recent: [snap(p), ...s.recent.filter((x) => x.id !== p.id)].slice(0, 12) })),

        signUp: async (name, email, password) => {
          const key = email.trim().toLowerCase();
          if (get().accounts[key]) return "An account with this email already exists. Sign in instead.";
          const acc: Account = { name: name.trim(), email: key, pwHash: await hash(key, password), addresses: [], orders: [] };
          set({ accounts: { ...get().accounts, [key]: acc }, session: key });
          return null;
        },
        signIn: async (email, password) => {
          const key = email.trim().toLowerCase();
          if (key === DEMO_EMAIL && password === DEMO_PASSWORD && !get().accounts[key]) {
            await get().signInDemo();
            return null;
          }
          const acc = get().accounts[key];
          if (!acc) return "No account found with that email.";
          if (acc.pwHash !== (await hash(key, password))) return "That password doesn't match.";
          set({ session: key });
          return null;
        },
        signInDemo: async () => {
          if (!get().accounts[DEMO_EMAIL]) {
            const acc = await demoAccount();
            set({ accounts: { ...get().accounts, [DEMO_EMAIL]: acc } });
          }
          set({ session: DEMO_EMAIL, pincode: get().pincode || "734002" });
        },
        signOut: () => set({ session: null }),

        saveAddress: (a) =>
          updateAccount((acc) => ({
            ...acc,
            addresses: acc.addresses.some((x) => x.id === a.id)
              ? acc.addresses.map((x) => (x.id === a.id ? a : x))
              : [...acc.addresses, a],
          })),

        placeOrder: ({ addressId, payment, speed, lines }) => {
          const acc = account();
          const orderLines = lines ?? get().cart;
          const address = acc?.addresses.find((a) => a.id === addressId);
          if (!acc || !address || !orderLines.length) return null;
          const days = Math.max(...orderLines.map((l) => (speed === "express" ? expressDays(l.item.deliveryDays) : l.item.deliveryDays)));
          const now = new Date();
          const order: Order = {
            id: uid("BZ"),
            placedAt: now.toISOString(),
            promisedAt: deliveryDate(days, now).toISOString(),
            lines: orderLines,
            address,
            payment,
            speed,
            totals: orderTotals(orderLines.map((l) => ({ ...l.item, qty: l.qty })), speed),
            returns: [],
          };
          updateAccount((a) => ({ ...a, orders: [order, ...a.orders] }));
          if (!lines) set({ cart: [] });
          else set((s) => ({ cart: s.cart.filter((l) => !lines.some((x) => x.item.id === l.item.id)) }));
          return order;
        },
        cancelOrder: (orderId) =>
          updateAccount((a) => ({
            ...a,
            orders: a.orders.map((o) => (o.id === orderId ? { ...o, cancelledAt: new Date().toISOString() } : o)),
          })),
        requestReturn: (orderId, productId, reason) =>
          updateAccount((a) => ({
            ...a,
            orders: a.orders.map((o) =>
              o.id === orderId ? { ...o, returns: [...o.returns, { productId, reason, requestedAt: new Date().toISOString() }] } : o,
            ),
          })),
      };
    },
    { name: "bazaar", version: 1 },
  ),
);

export const useAccount = () => useStore((s) => (s.session ? s.accounts[s.session] : undefined));

/** localStorage is only readable after mount; render store-driven UI after this flips. */
const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// ---- Order status is derived from time, so orders progress on their own ----

export const STAGES = ["Ordered", "Packed", "Shipped", "Out for delivery", "Delivered"] as const;
export type Stage = (typeof STAGES)[number];

export function orderStatus(o: Order, now = Date.now()) {
  if (o.cancelledAt) return { stage: "Cancelled" as const, index: -1, canCancel: false, deliveredAt: null };
  const start = new Date(o.placedAt).getTime();
  const end = new Date(o.promisedAt).getTime();
  const f = (now - start) / Math.max(1, end - start);
  const index = f >= 1 ? 4 : f >= 0.85 ? 3 : f >= 0.35 ? 2 : f >= 0.1 ? 1 : 0;
  return { stage: STAGES[index], index, canCancel: index < 2, deliveredAt: index === 4 ? new Date(end) : null };
}

export function returnWindow(o: Order, line: CartLine, now = Date.now()) {
  const st = orderStatus(o, now);
  if (!st.deliveredAt || !line.item.returnDays) return { eligible: false, until: null as Date | null };
  const until = new Date(st.deliveredAt.getTime() + line.item.returnDays * 86400000);
  return { eligible: now < until.getTime(), until };
}

// ---- Demo account with history, so every flow (track, return, buy again) is visible at once ----

async function demoAccount(): Promise<Account> {
  const { products } = await import("./catalog");
  const pick = (id: number) => snap(products.find((p) => p.id === id) ?? products[0]);
  const address: Address = {
    id: "addr-home",
    name: "Demo Shopper",
    phone: "9800000000",
    line1: "Flat 4B, Sunrise Apartments, Sevoke Road",
    line2: "Near City Centre",
    city: "Siliguri",
    state: "West Bengal",
    pincode: "734002",
  };
  const day = 86400000;
  const mk = (id: string, placedDaysAgo: number, deliverDays: number, lines: CartLine[], payment: Payment): Order => {
    const placed = new Date(Date.now() - placedDaysAgo * day);
    return {
      id,
      placedAt: placed.toISOString(),
      promisedAt: new Date(placed.getTime() + deliverDays * day).toISOString(),
      lines,
      address,
      payment,
      speed: "standard",
      totals: orderTotals(lines.map((l) => ({ ...l.item, qty: l.qty }))),
      returns: [],
    };
  };
  const returnable = products.filter((p) => p.returnDays >= 30);
  return {
    name: "Demo Shopper",
    email: DEMO_EMAIL,
    pwHash: await hash(DEMO_EMAIL, DEMO_PASSWORD),
    addresses: [address],
    orders: [
      mk("BZ-DEMO3", 2, 6, [{ item: snap(returnable[3]), qty: 1 }], "upi"),
      mk("BZ-DEMO2", 6, 4, [{ item: snap(returnable[0]), qty: 1 }, { item: pick(170), qty: 2 }], "card"),
      mk("BZ-DEMO1", 75, 4, [{ item: snap(returnable[8]), qty: 1 }], "cod"),
    ],
  };
}
