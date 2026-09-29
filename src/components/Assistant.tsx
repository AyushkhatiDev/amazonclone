"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Sparkles, X, ArrowUp, RotateCcw, Search, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui";
import type { Snap } from "@/lib/snap";
import { formatINR, orderTotals } from "@/lib/pricing";
import DeliveryLine from "./DeliveryLine";
import AddToCart from "./AddToCart";

type Bubble = { role: "user" | "assistant"; text: string; status?: string; error?: string; pending?: boolean };

type AssistantState = {
  open: boolean;
  bubbles: Bubble[];
  history: unknown[]; // raw API messages, replayed to the server unchanged
  products: Record<number, Snap>;
  busy: boolean;
  setOpen: (open: boolean) => void;
  reset: () => void;
};

// Kept in sessionStorage: the chat survives navigation and reloads, and ends with the tab.
export const useAssistant = create<AssistantState>()(
  persist(
    (set) => ({
      open: false,
      bubbles: [],
      history: [],
      products: {},
      busy: false,
      setOpen: (open) => set({ open }),
      reset: () => set({ bubbles: [], history: [], busy: false }),
    }),
    {
      name: "bazaar-assistant",
      storage: createJSONStorage(() => sessionStorage),
      // A reply cut off by a reload is dropped from the bubbles but its history never landed, so both stay consistent.
      partialize: (s) => ({ bubbles: s.bubbles.filter((b) => !b.pending), history: s.history, products: s.products }),
    },
  ),
);

export function AskFab() {
  const { open, setOpen } = useAssistant();
  const pathname = usePathname();
  if (open || pathname.startsWith("/checkout")) return null;
  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-ink-2 lg:flex"
    >
      <Sparkles className="h-4 w-4 text-marigold" /> Ask Bazaar
    </button>
  );
}

export function AskButton({ className = "" }: { className?: string }) {
  const setOpen = useAssistant((s) => s.setOpen);
  return (
    <button onClick={() => setOpen(true)} className={className} aria-label="Ask Bazaar, the shopping assistant">
      <Sparkles className="h-5 w-5" />
      <span className="hidden text-sm font-semibold xl:inline">Ask Bazaar</span>
    </button>
  );
}

function productIdFromPath(path: string) {
  const m = path.match(/^\/p\/.*-(\d+)$/);
  return m ? Number(m[1]) : undefined;
}

/** Suggestions follow the page you're on, instead of Rufus's generic "games for a 5-year old". */
function suggestionsFor(path: string, cartCount: number): string[] {
  if (path.startsWith("/p/")) {
    return [
      "Is this worth it compared to similar ones?",
      "What do reviewers say about it?",
      "Can I return it if it doesn't suit me?",
      "Is now a good time to buy, or should I wait?",
    ];
  }
  if (path.startsWith("/cart") || path.startsWith("/checkout")) {
    return cartCount
      ? ["How do I get free delivery?", "Which item will arrive last?", "Can I pay cash on delivery?", "Anything cheaper that does the same job?"]
      : ["Gift ideas under ₹1,000", "What arrives tomorrow?"];
  }
  if (path.startsWith("/orders")) return ["How do returns work?", "Can I still cancel an order?", "What should I buy again?"];
  return [
    "Best-rated phone under ₹20,000",
    "Stock my kitchen for under ₹3,000",
    "Gift ideas under ₹1,000 that arrive in 2 days",
    "Compare the top 3 laptops",
  ];
}

export default function Assistant() {
  const { open, bubbles, busy, products, setOpen, reset } = useAssistant();
  const pathname = usePathname();
  const cart = useStore((s) => s.cart);
  const pincode = useStore((s) => s.pincode);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const productId = productIdFromPath(pathname);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && open && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || useAssistant.getState().busy) return;
    setInput("");
    const update = (fn: (b: Bubble) => Bubble) =>
      useAssistant.setState((s) => ({ bubbles: s.bubbles.map((b, i) => (i === s.bubbles.length - 1 ? fn(b) : b)) }));
    useAssistant.setState((s) => ({
      busy: true,
      bubbles: [...s.bubbles, { role: "user", text: message }, { role: "assistant", text: "", status: "Thinking", pending: true }],
    }));

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: useAssistant.getState().history,
          message,
          context: {
            path: pathname,
            productId,
            cart: cart.map((l) => ({ id: l.item.id, qty: l.qty })),
            pincode: pincode || undefined,
            today: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          },
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Something went wrong." }));
        update((b) => ({ ...b, pending: false, status: undefined, error: err.error }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.t === "text") update((b) => ({ ...b, text: b.text + ev.d, status: undefined }));
          else if (ev.t === "reset") update((b) => ({ ...b, text: "" }));
          else if (ev.t === "status") update((b) => ({ ...b, status: ev.text }));
          else if (ev.t === "products")
            useAssistant.setState((s) => ({ products: { ...s.products, ...Object.fromEntries((ev.items as Snap[]).map((p) => [p.id, p])) } }));
          else if (ev.t === "error") update((b) => ({ ...b, error: ev.message, status: undefined }));
          else if (ev.t === "done") useAssistant.setState((s) => ({ history: [...s.history, ...ev.messages] }));
        }
      }
      update((b) => ({ ...b, pending: false, status: undefined }));
    } catch {
      update((b) => ({ ...b, pending: false, status: undefined, error: "Couldn't reach the assistant. Check your connection." }));
    } finally {
      useAssistant.setState({ busy: false });
    }
  };

  if (!open) return null;
  const suggestions = suggestionsFor(pathname, cart.length);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Ask Bazaar">
      <div className="absolute inset-0 hidden bg-ink/20 sm:block" onClick={() => setOpen(false)} />
      <aside className="relative flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-md animate-[slide_.2s_ease-out]">
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="font-semibold leading-tight">Ask Bazaar</p>
            <p className="text-xs text-muted">Answers come from our catalog. It never recommends paid placements.</p>
          </div>
          {bubbles.length > 0 && (
            <button onClick={reset} className="rounded-full p-2 hover:bg-page" aria-label="New chat" title="New chat">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-page" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {bubbles.length === 0 && (
            <div>
              <p className="text-sm text-ink/80">
                Tell me what you need, your budget, and when you need it by. I&apos;ll search the catalog, compare options and check delivery for you.
              </p>
              <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
                {pathname.startsWith("/p/") ? "About this product" : pathname.startsWith("/cart") && cart.length ? "About your cart" : "Try asking"}
              </p>
              <div className="flex flex-col items-start gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-2xl border border-line bg-page px-3 py-2 text-left text-sm hover:border-brand hover:bg-brand-soft">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {bubbles.map((b, i) =>
            b.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm text-white">
                {b.text}
              </div>
            ) : (
              <div key={i} className="max-w-full text-sm">
                {b.text && <AssistantText text={b.text} streaming={!!b.pending} products={products} />}
                {b.status && (
                  <p className="flex items-center gap-2 text-muted">
                    <Search className="h-3.5 w-3.5 animate-pulse" /> {b.status}…
                  </p>
                )}
                {b.error && <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-alert">{b.error}</p>}
              </div>
            ),
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-line p-3"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-ink/20 px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="e.g. running shoes under ₹3,000 by Friday"
              className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-sm outline-none"
            />
            <button disabled={busy || !input.trim()} aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ---- Rendering the model's reply: light markdown + product markers ----

const MARKER = /\[\[(product|bundle|results):([^\]]+)\]\]/g;

type Part = { kind: "text"; text: string } | { kind: "products"; ids: number[] } | { kind: "bundle"; ids: number[] } | { kind: "results"; url: string };

function parse(text: string, streaming: boolean): Part[] {
  // Hide a half-written marker at the end of a streaming reply.
  const clean = streaming ? text.replace(/\[\[[^\]]*\]?$/, "") : text;
  const parts: Part[] = [];
  let last = 0;
  for (const m of clean.matchAll(MARKER)) {
    const before = clean.slice(last, m.index);
    if (before.trim()) parts.push({ kind: "text", text: before });
    const ids = m[2].split(",").map((x) => Number(x.trim())).filter(Number.isFinite);
    const prev = parts[parts.length - 1];
    if (m[1] === "product") {
      // Consecutive product markers become one swipeable row.
      if (prev?.kind === "products" && !before.trim()) prev.ids.push(...ids);
      else parts.push({ kind: "products", ids });
    } else if (m[1] === "bundle") parts.push({ kind: "bundle", ids });
    else if (m[2].startsWith("/s?")) parts.push({ kind: "results", url: m[2] });
    last = (m.index ?? 0) + m[0].length;
  }
  const rest = clean.slice(last);
  if (rest.trim()) parts.push({ kind: "text", text: rest });
  return parts;
}

function AssistantText({ text, streaming, products }: { text: string; streaming: boolean; products: Record<number, Snap> }) {
  return (
    <div className="space-y-3">
      {parse(text, streaming).map((part, i) => {
        if (part.kind === "text") return <Markdown key={i} text={part.text} />;
        if (part.kind === "results")
          return (
            <Link key={i} href={part.url} className="btn-secondary w-full">
              <Search className="h-4 w-4" /> See all matching results
            </Link>
          );
        const items = part.ids.map((id) => products[id]).filter((p): p is Snap => !!p);
        if (!items.length) return null;
        if (part.kind === "bundle") return <Bundle key={i} items={items} />;
        return (
          <div key={i} className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {items.map((p) => (
              <MiniCard key={p.id} p={p} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MiniCard({ p }: { p: Snap }) {
  return (
    <div className="card flex w-44 shrink-0 snap-start flex-col p-2.5">
      <Link href={`/p/${p.slug}`} className="block rounded-lg bg-page p-1.5">
        <img src={p.thumbnail} alt="" className="aspect-square w-full object-contain" />
      </Link>
      <Link href={`/p/${p.slug}`} className="mt-2 line-clamp-2 text-xs leading-snug hover:text-brand">
        {p.title}
      </Link>
      <p className="mt-1 font-semibold">{formatINR(p.price)}</p>
      <div className="text-xs">
        <DeliveryLine days={p.deliveryDays} price={p.price} compact dateOnly />
      </div>
      <div className="mt-auto pt-2">
        <AddToCart product={p} className="btn-secondary w-full px-2 py-1.5 text-xs" />
      </div>
    </div>
  );
}

function Bundle({ items }: { items: Snap[] }) {
  const add = useStore((s) => s.addToCart);
  const toast = useUI((s) => s.showToast);
  const t = orderTotals(items.map((p) => ({ ...p, qty: 1 })));
  const available = items.filter((p) => p.stock > 0);
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-2.5">
            <img src={p.thumbnail} alt="" className="h-10 w-10 rounded bg-page object-contain" />
            <Link href={`/p/${p.slug}`} className="line-clamp-1 flex-1 text-xs hover:text-brand">
              {p.title}
            </Link>
            <span className="text-xs font-semibold">{formatINR(p.price)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2 bg-page px-3 py-2.5">
        <div className="text-xs">
          <p className="font-semibold">Total {formatINR(t.total)}</p>
          <p className="text-muted">{t.delivery ? `includes ₹${t.delivery} delivery` : "free delivery"}</p>
        </div>
        <button
          onClick={() => {
            available.forEach((p) => add(p));
            toast(`Added ${available.length} items to your cart`);
          }}
          disabled={!available.length}
          className="btn-primary px-3 py-1.5 text-xs"
        >
          <ShoppingCart className="h-3.5 w-3.5" /> Add all to cart
        </button>
      </div>
    </div>
  );
}

/** Just enough markdown for chat: paragraphs, "- " lists and **bold**. */
function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => (seg.startsWith("**") && seg.endsWith("**") ? <strong key={i}>{seg.slice(2, -2)}</strong> : seg));
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*[-*•]\s/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}
