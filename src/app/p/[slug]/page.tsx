import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { products, getProductBySlug, getDepartment, similar } from "@/lib/catalog";
import { formatINR, savingsPct } from "@/lib/pricing";
import Stars from "@/components/Stars";
import Gallery from "@/components/Gallery";
import BuyBox from "@/components/BuyBox";
import DeliveryLine from "@/components/DeliveryLine";
import Reviews from "@/components/Reviews";
import RecordView from "@/components/RecordView";
import { snap } from "@/lib/snap";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const p = getProductBySlug((await params).slug);
  return p ? { title: p.title, description: p.description } : {};
}

export default async function ProductPage({ params }: PageProps<"/p/[slug]">) {
  const p = getProductBySlug((await params).slug);
  if (!p) notFound();
  const dept = getDepartment(p.department)!;
  const others = similar(p, 3);
  const pct = savingsPct(p.price, p.mrp);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4">
      <RecordView product={snap(p)} />
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href={`/s?dept=${dept.slug}`} className="hover:text-brand hover:underline">{dept.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/s?dept=${dept.slug}&cat=${p.category}`} className="hover:text-brand hover:underline">{p.categoryName}</Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_320px]">
        <Gallery images={p.images} title={p.title} />

        <div>
          {p.brand && (
            <Link href={`/s?q=${encodeURIComponent(p.brand)}`} className="text-sm font-medium text-brand hover:underline">
              More from {p.brand}
            </Link>
          )}
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{p.title}</h1>
          <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm hover:underline">
            <span className="font-medium">{p.rating.toFixed(1)}</span>
            <Stars rating={p.rating} size={16} />
            <span className="text-brand">{p.ratings.total.toLocaleString("en-IN")} ratings</span>
          </a>

          <div className="my-5 border-y border-line py-5">
            <span className="text-3xl font-semibold tracking-tight">{formatINR(p.price)}</span>
            {pct > 0 && (
              <p className="mt-1 text-sm">
                <span className="font-medium text-save">You save {formatINR(p.mrp - p.price)}</span>
                <span className="text-muted"> · {pct}% below the list price of {formatINR(p.mrp)}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-muted">Includes GST. Delivery fees are shown below. There are no other charges.</p>
          </div>

          <h2 className="font-semibold">About this item</h2>
          <p className="mt-2 leading-relaxed text-ink/85">{p.description}</p>

          <dl className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
            <Fact icon={<Truck className="h-5 w-5" />} label={p.deliveryDays <= 2 ? "Fast delivery" : `Delivery in ${p.deliveryDays} days`} />
            <Fact icon={<RotateCcw className="h-5 w-5" />} label={p.returnDays ? `${p.returnDays}-day returns` : "Not returnable"} muted={!p.returnDays} />
            <Fact icon={<ShieldCheck className="h-5 w-5" />} label={p.warranty} />
          </dl>

          <table className="mt-6 w-full text-sm">
            <tbody className="divide-y divide-line">
              {p.brand && <Spec k="Brand" v={p.brand} />}
              <Spec k="Category" v={p.categoryName} />
              <Spec k="Dimensions" v={`${p.dimensions.width} × ${p.dimensions.height} × ${p.dimensions.depth} cm`} />
              <Spec k="Weight" v={`${p.weight} kg`} />
              <Spec k="Returns" v={p.returnPolicy} />
            </tbody>
          </table>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <p className="text-2xl font-semibold">{formatINR(p.price)}</p>
            <div className="mt-3">
              <DeliveryLine days={p.deliveryDays} price={p.price} />
            </div>
            <p className={`mt-3 text-sm font-medium ${p.stock === 0 ? "text-alert" : "text-save"}`}>
              {p.stock === 0 ? "Currently unavailable" : p.stock <= 5 ? `In stock (${p.stock} left)` : "In stock"}
            </p>
            <BuyBox product={snap(p)} />
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-muted">
              <div className="flex justify-between"><dt>Sold & shipped by</dt><dd className="text-ink">Bazaar Retail</dd></div>
              <div className="flex justify-between"><dt>Returns</dt><dd className="text-ink">{p.returnDays ? `${p.returnDays} days, free pickup` : "Not returnable"}</dd></div>
              <div className="flex justify-between"><dt>Payment</dt><dd className="text-ink">UPI, card or cash on delivery</dd></div>
            </dl>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold tracking-tight">Compare with similar items</h2>
          <p className="text-sm text-muted">The closest items in price from {p.categoryName}. None of them paid to be here.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="card w-full min-w-[640px] table-fixed text-sm">
              <thead>
                <tr className="align-top">
                  <th className="w-36 p-4 text-left font-normal text-muted" />
                  {[p, ...others].map((x, i) => (
                    <th key={x.id} className="p-4 text-left font-normal">
                      <Link href={`/p/${x.slug}`} className="block">
                        <img src={x.thumbnail} alt="" className="mb-2 h-28 w-full rounded-lg bg-page object-contain p-2" />
                        <span className={`line-clamp-2 ${i === 0 ? "font-semibold" : "hover:text-brand"}`}>{x.title}</span>
                      </Link>
                      {i === 0 && <span className="mt-1 inline-block rounded bg-brand-soft px-2 py-0.5 text-xs text-brand-dark">This item</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <CompareRow label="Price" cells={[p, ...others].map((x) => formatINR(x.price))} best={bestIndex([p, ...others].map((x) => -x.price))} />
                <CompareRow label="Rating" cells={[p, ...others].map((x) => `${x.rating.toFixed(1)} ★ (${x.ratings.total.toLocaleString("en-IN")})`)} best={bestIndex([p, ...others].map((x) => x.rating))} />
                <CompareRow label="Delivery" cells={[p, ...others].map((x) => (x.deliveryDays === 1 ? "Tomorrow" : `${x.deliveryDays} days`))} best={bestIndex([p, ...others].map((x) => -x.deliveryDays))} />
                <CompareRow label="Returns" cells={[p, ...others].map((x) => (x.returnDays ? `${x.returnDays} days` : "None"))} best={bestIndex([p, ...others].map((x) => x.returnDays))} />
                <CompareRow label="Warranty" cells={[p, ...others].map((x) => x.warranty)} />
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Reviews rating={p.rating} ratings={p.ratings} reviews={p.reviews} />
    </div>
  );
}

function bestIndex(values: number[]) {
  const max = Math.max(...values);
  return values.filter((v) => v === max).length === values.length ? -1 : values.indexOf(max);
}

function CompareRow({ label, cells, best = -1 }: { label: string; cells: string[]; best?: number }) {
  return (
    <tr>
      <td className="p-4 text-muted">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className={`p-4 ${i === best ? "font-semibold text-save" : ""}`}>
          {c}
          {i === best && <span className="ml-1 text-xs font-normal">best</span>}
        </td>
      ))}
    </tr>
  );
}

function Fact({ icon, label, muted }: { icon: React.ReactNode; label: string; muted?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 ${muted ? "text-muted" : "text-ink"}`}>
      <span className={muted ? "" : "text-brand"}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <th className="w-32 py-2 pr-4 text-left font-normal text-muted">{k}</th>
      <td className="py-2">{v}</td>
    </tr>
  );
}
