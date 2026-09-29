import Link from "next/link";
import type { Metadata } from "next";
import { X, SlidersHorizontal } from "lucide-react";
import { search, departments, getDepartment, type SortKey } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import Stars from "@/components/Stars";

type Raw = Record<string, string | string[] | undefined>;

const PRICE_BUCKETS = [
  { label: "Under ₹500", max: 499 },
  { label: "₹500 – ₹2,000", min: 500, max: 2000 },
  { label: "₹2,000 – ₹10,000", min: 2000, max: 10000 },
  { label: "₹10,000 – ₹50,000", min: 10000, max: 50000 },
  { label: "Over ₹50,000", min: 50000 },
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | string[] | undefined) => (one(v) != null && !isNaN(Number(one(v))) ? Number(one(v)) : undefined);

function parse(sp: Raw) {
  return {
    q: one(sp.q),
    dept: one(sp.dept),
    cat: one(sp.cat),
    min: num(sp.min),
    max: num(sp.max),
    rating: num(sp.rating),
    fast: one(sp.fast) === "1",
    inStock: one(sp.stock) === "1",
    sort: (one(sp.sort) as SortKey) || "relevance",
  };
}

type Parsed = ReturnType<typeof parse>;

/** Build a results URL from the current filters with some overridden (undefined removes one). */
function href(cur: Parsed, patch: Partial<Record<keyof Parsed, string | number | boolean | undefined>>) {
  const next = { ...cur, ...patch };
  const p = new URLSearchParams();
  if (next.q) p.set("q", String(next.q));
  if (next.dept) p.set("dept", String(next.dept));
  if (next.cat) p.set("cat", String(next.cat));
  if (next.min != null) p.set("min", String(next.min));
  if (next.max != null) p.set("max", String(next.max));
  if (next.rating) p.set("rating", String(next.rating));
  if (next.fast) p.set("fast", "1");
  if (next.inStock) p.set("stock", "1");
  if (next.sort && next.sort !== "relevance") p.set("sort", String(next.sort));
  return `/s?${p}`;
}

export async function generateMetadata({ searchParams }: PageProps<"/s">): Promise<Metadata> {
  const f = parse(await searchParams);
  return { title: f.q ? `Results for “${f.q}”` : getDepartment(f.dept || "")?.name || "All products" };
}

export default async function SearchPage({ searchParams }: PageProps<"/s">) {
  const f = parse(await searchParams);
  const results = search(f);
  const dept = f.dept ? getDepartment(f.dept) : undefined;
  const heading = f.q ? `“${f.q}”` : dept?.name || (f.sort === "discount" ? "Today's deals" : f.fast ? "Arrives in 2 days" : "All products");

  const chips: { label: string; remove: string }[] = [];
  if (f.q) chips.push({ label: `“${f.q}”`, remove: href(f, { q: undefined }) });
  if (dept) chips.push({ label: dept.name, remove: href(f, { dept: undefined, cat: undefined }) });
  if (f.cat) chips.push({ label: dept?.categories.find((c) => c.slug === f.cat)?.name || f.cat, remove: href(f, { cat: undefined }) });
  if (f.min != null || f.max != null)
    chips.push({ label: PRICE_BUCKETS.find((b) => b.min === f.min && b.max === f.max)?.label || "Price", remove: href(f, { min: undefined, max: undefined }) });
  if (f.rating) chips.push({ label: `${f.rating}★ & up`, remove: href(f, { rating: undefined }) });
  if (f.fast) chips.push({ label: "Arrives in 2 days", remove: href(f, { fast: undefined }) });
  if (f.inStock) chips.push({ label: "In stock", remove: href(f, { inStock: undefined }) });

  const filters = (
    <div className="space-y-6 text-sm">
      <FilterGroup title="Department">
        <FilterLink active={!f.dept} to={href(f, { dept: undefined, cat: undefined })}>All departments</FilterLink>
        {departments.map((d) => (
          <div key={d.slug}>
            <FilterLink active={f.dept === d.slug && !f.cat} to={href(f, { dept: d.slug, cat: undefined })}>
              {d.name}
            </FilterLink>
            {f.dept === d.slug && (
              <div className="ml-3 border-l border-line pl-2">
                {d.categories.map((c) => (
                  <FilterLink key={c.slug} active={f.cat === c.slug} to={href(f, { cat: c.slug })}>
                    {c.name}
                  </FilterLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </FilterGroup>
      <FilterGroup title="Delivery">
        <FilterLink active={f.fast} to={href(f, { fast: !f.fast || undefined })} check>
          Arrives in 2 days
        </FilterLink>
        <FilterLink active={f.inStock} to={href(f, { inStock: !f.inStock || undefined })} check>
          In stock only
        </FilterLink>
      </FilterGroup>
      <FilterGroup title="Customer rating">
        {[4, 3].map((r) => (
          <FilterLink key={r} active={f.rating === r} to={href(f, { rating: f.rating === r ? undefined : r })}>
            <Stars rating={r} /> <span className="ml-1">& up</span>
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup title="Price">
        {PRICE_BUCKETS.map((b) => {
          const active = f.min === b.min && f.max === b.max;
          return (
            <FilterLink key={b.label} active={active} to={href(f, active ? { min: undefined, max: undefined } : { min: b.min, max: b.max })}>
              {b.label}
            </FilterLink>
          );
        })}
      </FilterGroup>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
          <p className="text-sm text-muted">
            {results.length} {results.length === 1 ? "result" : "results"} · none of them sponsored
          </p>
        </div>
        <SortSelect value={f.sort} />
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Link key={c.label} href={c.remove} className="flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-sm text-brand-dark hover:border-brand">
              {c.label} <X className="h-3.5 w-3.5" />
            </Link>
          ))}
          <Link href="/s" className="text-sm text-muted hover:underline">
            Clear all
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <aside>
          <details className="card p-4 md:hidden">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </summary>
            <div className="mt-4">{filters}</div>
          </details>
          <div className="hidden md:block">{filters}</div>
        </aside>

        {results.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center p-12 text-center">
            <p className="text-lg font-semibold">Nothing matches all of that.</p>
            <p className="mt-1 text-sm text-muted">Try removing a filter, or search for something broader.</p>
            {chips.length > 0 && (
              <Link href={chips[chips.length - 1].remove} className="btn-secondary mt-4">
                Remove “{chips[chips.length - 1].label}”
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-semibold">{title}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function FilterLink({ active, to, children, check }: { active?: boolean; to: string; children: React.ReactNode; check?: boolean }) {
  return (
    <Link href={to} scroll={false} className={`flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white ${active ? "font-semibold text-brand-dark" : "text-ink/80"}`}>
      {check && (
        <span className={`flex h-4 w-4 items-center justify-center rounded border ${active ? "border-brand bg-brand text-white" : "border-ink/30 bg-white"}`}>
          {active && "✓"}
        </span>
      )}
      {children}
    </Link>
  );
}
