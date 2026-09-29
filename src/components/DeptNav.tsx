import Link from "next/link";
import { Tag, Zap } from "lucide-react";
import type { Department } from "@/lib/catalog";

/** Only shopping destinations: no Prime Video, Alexa or Hotel Booking crowding the bar. */
export default function DeptNav({ departments }: { departments: Department[] }) {
  return (
    <nav className="bg-ink-2 text-sm text-white">
      <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-3 py-1.5 [scrollbar-width:none]">
        <Link href="/s?sort=discount" className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 font-semibold text-marigold hover:bg-white/10">
          <Tag className="h-3.5 w-3.5" /> Today&apos;s deals
        </Link>
        <Link href="/s?fast=1" className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 hover:bg-white/10">
          <Zap className="h-3.5 w-3.5" /> Arrives in 2 days
        </Link>
        {departments.map((d) => (
          <Link key={d.slug} href={`/s?dept=${d.slug}`} className="shrink-0 rounded-md px-2.5 py-1 hover:bg-white/10">
            {d.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
