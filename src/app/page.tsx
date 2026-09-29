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
      <section className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white">
        <div className="grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shopping, minus the noise.</h1>
            <p className="mt-3 max-w-lg text-white/85">
              The price in your cart is the price you pay. Results are ranked by what fits your search, never by who paid to be there.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/s?sort=discount" className="btn bg-white text-ink hover:bg-white/90">
                Today&apos;s deals
              </Link>
              <Link href="/s?fast=1" className="btn border border-white/40 hover:bg-white/10">
                Arrives in 2 days
              </Link>
            </div>
          </div>
          <ul className="grid gap-3 text-sm">
            <Promise icon={<Receipt className="h-5 w-5" />} title="No surprise fees" body="Delivery is shown in the cart. The total never changes at checkout." />
            <Promise icon={<BadgeCheck className="h-5 w-5" />} title="No sponsored results" body="Nothing on Bazaar is an ad." />
            <Promise icon={<ShieldCheck className="h-5 w-5" />} title="Returns in two taps" body="Start a return from Your Orders. The deadline is shown on every item." />
          </ul>
        </div>
      </section>

      <ForYou />

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold tracking-tight">Shop by department</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {departments.map((d) => (
            <Link key={d.slug} href={`/s?dept=${d.slug}`} className="card group p-3 text-center transition hover:shadow-md">
              <img src={d.image} alt="" className="mx-auto aspect-square w-full rounded-lg bg-page object-contain p-2 transition group-hover:scale-105" />
              <p className="mt-2 text-sm font-medium">{d.name}</p>
              <p className="text-xs text-muted">{d.count} products</p>
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

function Promise({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-white/80">{body}</span>
      </span>
    </li>
  );
}
