import Link from "next/link";
import { ShieldCheck, Receipt, BadgeCheck } from "lucide-react";
import { departments, products, discount } from "@/lib/catalog";
import Shelf from "@/components/Shelf";
import ForYou from "@/components/ForYou";

export default function Home() {
  const deals = [...products].filter((p) => p.rating >= 3.5 && p.stock > 0).sort((a, b) => discount(b) - discount(a)).slice(0, 10);
  const fast = products.filter((p) => p.deliveryDays === 1 && p.stock > 0).sort((a, b) => b.rating - a.rating).slice(0, 10);
  const home = products.filter((p) => p.department === "home-kitchen").sort((a, b) => b.rating - a.rating).slice(0, 10);
  const phones = products.filter((p) => p.category === "smartphones").sort((a, b) => b.rating - a.rating).slice(0, 10);

  return (
    <div className="mx-auto max-w-[1400px] px-4">
      <section className="mt-5 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-brand to-brand-dark px-6 py-5 text-white lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Shopping, minus the noise.</h1>
          <p className="text-sm text-white/80">The price in your cart is the price you pay, and nothing here is an ad.</p>
        </div>
        <ul className="hidden flex-wrap gap-2 text-sm sm:flex">
          <Pill icon={<Receipt className="h-4 w-4" />} label="No surprise fees" />
          <Pill icon={<BadgeCheck className="h-4 w-4" />} label="No sponsored results" />
          <Pill icon={<ShieldCheck className="h-4 w-4" />} label="Returns in two taps" />
        </ul>
      </section>

      <ForYou />

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold tracking-tight">Shop by department</h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
          {departments.map((d) => (
            <Link key={d.slug} href={`/s?dept=${d.slug}`} className="card group p-1.5 text-center transition hover:shadow-md sm:p-3">
              <img src={d.image} alt="" className="mx-auto aspect-square w-full rounded-lg bg-page object-contain p-2 transition group-hover:scale-105" />
              <p className="mt-1.5 text-[11px] font-medium leading-tight sm:mt-2 sm:text-sm">{d.name}</p>
              <p className="hidden text-xs text-muted sm:block">{d.count} products</p>
            </Link>
          ))}
        </div>
      </section>

      <Shelf title="Today's biggest savings" note="Rated 3.5★ or higher, sorted by how much you save" href="/s?sort=discount" items={deals} />
      <Shelf title="Arrives tomorrow" href="/s?fast=1&sort=fastest" items={fast} />
      <Shelf title="Top rated smartphones" href="/s?cat=smartphones&sort=rating" items={phones} />
      <Shelf title="Best of Home & Kitchen" href="/s?dept=home-kitchen&sort=rating" items={home} />
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
      {icon} {label}
    </li>
  );
}
