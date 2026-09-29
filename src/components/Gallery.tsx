"use client";

import { useState } from "react";

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row lg:sticky lg:top-32 lg:self-start">
      {images.length > 1 && (
        <div className="flex gap-2 sm:flex-col">
          {images.map((src, i) => (
            <button
              key={src}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`Image ${i + 1}`}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-white p-1 ${i === active ? "border-brand" : "border-line"}`}
            >
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      <div
        className="relative flex-1 cursor-zoom-in overflow-hidden rounded-2xl bg-white"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <img
          src={images[active]}
          alt={title}
          className="aspect-square w-full object-contain p-6 transition-transform duration-150"
          style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>
    </div>
  );
}
