"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal shelf with arrow buttons on desktop (touch users just swipe). */
export default function ShelfScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <div className="group/shelf relative">
      <div ref={ref} className="-mx-4 flex snap-x gap-4 overflow-x-auto scroll-px-4 px-4 pb-3 [scrollbar-width:none]">
        {children}
      </div>
      {[
        { dir: -1, hidden: edges.start, side: "left-0 -translate-x-1/2", icon: <ChevronLeft className="h-5 w-5" />, label: "Scroll left" },
        { dir: 1, hidden: edges.end, side: "right-0 translate-x-1/2", icon: <ChevronRight className="h-5 w-5" />, label: "Scroll right" },
      ].map((b) => (
        <button
          key={b.dir}
          onClick={() => scroll(b.dir)}
          aria-label={b.label}
          className={`absolute top-1/3 z-10 hidden h-11 w-11 items-center justify-center rounded-full border border-line bg-white/95 shadow-lg backdrop-blur transition hover:scale-105 md:flex ${b.side} ${b.hidden ? "pointer-events-none opacity-0" : "opacity-0 group-hover/shelf:opacity-100"}`}
        >
          {b.icon}
        </button>
      ))}
    </div>
  );
}
