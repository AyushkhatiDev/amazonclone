"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, ShoppingCart, ChevronDown, Package, Heart, LogOut, User } from "lucide-react";
import type { SearchIndexItem, Department } from "@/lib/catalog";
import { useStore, useAccount, useHydrated } from "@/lib/store";
import { formatINR } from "@/lib/pricing";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-baseline gap-0.5 text-2xl font-extrabold tracking-tight text-white ${className}`}>
      bazaar<span className="text-marigold">.</span>
    </Link>
  );
}

export default function Header({ departments }: { departments: Department[] }) {
  const hydrated = useHydrated();
  const count = useStore((s) => s.cart.reduce((n, l) => n + l.qty, 0));
  const account = useAccount();

  return (
    <header className="sticky top-0 z-40 bg-ink text-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Logo />
        <PincodeButton />
        <div className="order-last w-full md:order-none md:w-auto md:flex-1">
          <SearchBox departments={departments} />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <AccountMenu name={hydrated ? account?.name : undefined} />
          <Link href="/orders" className="hidden rounded-md px-2 py-1 leading-tight hover:bg-white/10 lg:block">
            <span className="block text-xs text-white/70">Returns</span>
            <span className="text-sm font-semibold">& Orders</span>
          </Link>
          <Link href="/cart" className="relative flex items-end gap-1 rounded-md px-2 py-1 hover:bg-white/10" aria-label={`Cart, ${hydrated ? count : 0} items`}>
            <ShoppingCart className="h-7 w-7" />
            <span className="absolute left-5 top-0 min-w-5 rounded-full bg-marigold px-1 text-center text-xs font-bold text-ink">
              {hydrated ? count : 0}
            </span>
            <span className="hidden text-sm font-semibold sm:inline">Cart</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function PincodeButton() {
  const hydrated = useHydrated();
  const pincode = useStore((s) => s.pincode);
  const setPincode = useStore((s) => s.setPincode);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[1-8]\d{5}$/.test(value)) return setError("Enter a valid 6-digit Indian pincode.");
    setPincode(value);
    setOpen(false);
  };

  return (
    <div className="relative hidden md:block">
      <button
        onClick={() => {
          setValue(pincode);
          setError("");
          setOpen((o) => !o);
        }}
        className="flex items-end gap-1 rounded-md px-2 py-1 text-left leading-tight hover:bg-white/10"
      >
        <MapPin className="mb-0.5 h-4 w-4" />
        <span>
          <span className="block text-xs text-white/70">Deliver to</span>
          <span className="text-sm font-semibold">{hydrated && pincode ? pincode : "Set pincode"}</span>
        </span>
      </button>
      {open && (
        <form onSubmit={save} className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl bg-white p-4 text-ink shadow-xl">
          <label className="text-sm font-semibold" htmlFor="pin">
            Where should we deliver?
          </label>
          <p className="mb-3 text-xs text-muted">Delivery dates across the site update to your pincode.</p>
          <div className="flex gap-2">
            <input id="pin" autoFocus inputMode="numeric" maxLength={6} value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} className="input" placeholder="e.g. 734002" />
            <button className="btn-primary px-4">Apply</button>
          </div>
          {error && <p className="mt-2 text-xs text-alert">{error}</p>}
        </form>
      )}
    </div>
  );
}

function SearchBox({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [index, setIndex] = useState<SearchIndexItem[]>([]);
  const loadIndex = () => {
    if (index.length) return;
    fetch("/search-index")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => {}); // suggestions are a nicety; plain search still works
  };
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere, like most shopping sites people use daily.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const suggestions = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index
      .filter((p) => terms.every((t) => `${p.title} ${p.brand ?? ""} ${p.category}`.toLowerCase().includes(t)))
      .slice(0, 6);
  }, [q, index]);

  const go = (query: string) => {
    setOpen(false);
    inputRef.current?.blur();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (dept) params.set("dept", dept);
    router.push(`/s?${params}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && active >= 0 && suggestions[active]) {
      e.preventDefault();
      setOpen(false);
      router.push(`/p/${suggestions[active].slug}`);
    }
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
      className="relative flex h-11 overflow-visible rounded-lg bg-white text-ink focus-within:ring-2 focus-within:ring-marigold"
    >
      <select
        aria-label="Department"
        value={dept}
        onChange={(e) => setDept(e.target.value)}
        className="hidden max-w-36 rounded-l-lg border-r border-line bg-page px-2 text-xs text-ink/80 outline-none sm:block"
      >
        <option value="">All</option>
        {departments.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name}
          </option>
        ))}
      </select>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          loadIndex();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Search products, brands and categories"
        aria-label="Search"
        aria-autocomplete="list"
        className="min-w-0 flex-1 rounded-l-lg px-3 text-[15px] outline-none sm:rounded-none"
      />
      <kbd className="my-auto mr-2 hidden rounded border border-line px-1.5 text-xs text-muted lg:block">/</kbd>
      <button aria-label="Search" className="flex w-12 items-center justify-center rounded-r-lg bg-marigold text-ink hover:brightness-95">
        <Search className="h-5 w-5" />
      </button>

      {open && suggestions.length > 0 && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <Link
                href={`/p/${s.slug}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 ${i === active ? "bg-page" : "hover:bg-page"}`}
              >
                <img src={s.thumbnail} alt="" className="h-10 w-10 rounded object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{s.title}</span>
                  <span className="text-xs text-muted">in {s.category}</span>
                </span>
                <span className="text-sm font-semibold">{formatINR(s.price)}</span>
              </Link>
            </li>
          ))}
          <li>
            <button type="submit" onMouseDown={(e) => e.preventDefault()} className="w-full px-3 py-2 text-left text-sm text-brand hover:bg-page">
              See all results for “{q}”
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}

function AccountMenu({ name }: { name?: string }) {
  const [open, setOpen] = useState(false);
  const signOut = useStore((s) => s.signOut);
  const router = useRouter();

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => (name ? setOpen((o) => !o) : router.push("/signin"))}
        onMouseEnter={() => name && setOpen(true)}
        className="rounded-md px-2 py-1 text-left leading-tight hover:bg-white/10"
      >
        <span className="block text-xs text-white/70">{name ? `Hello, ${name}` : "Hello, sign in"}</span>
        <span className="flex items-center text-sm font-semibold">
          Account <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>
      {open && name && (
        <div className="absolute right-0 top-full z-50 w-56 pt-2">
          <div className="rounded-xl bg-white py-2 text-sm text-ink shadow-xl">
            <MenuLink href="/orders" icon={<Package className="h-4 w-4" />} label="Your orders" onClick={() => setOpen(false)} />
            <MenuLink href="/lists" icon={<Heart className="h-4 w-4" />} label="Your wishlist" onClick={() => setOpen(false)} />
            <MenuLink href="/account" icon={<User className="h-4 w-4" />} label="Addresses & account" onClick={() => setOpen(false)} />
            <button
              onClick={() => {
                signOut();
                setOpen(false);
                router.push("/");
              }}
              className="flex w-full items-center gap-2 px-4 py-2 hover:bg-page"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 px-4 py-2 hover:bg-page">
      {icon} {label}
    </Link>
  );
}
