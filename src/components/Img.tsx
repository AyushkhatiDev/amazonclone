"use client";

import { useEffect, useRef, useState } from "react";

/** Product image that shimmers while loading and fades in, instead of popping in half-drawn. */
export default function Img({ className = "", wrapClassName = "", alt = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { wrapClassName?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  // Cached images can finish before hydration, when onLoad has already fired.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true);
  }, []);
  return (
    <span className={`relative block ${wrapClassName}`}>
      {!loaded && <span className="skeleton absolute inset-0 rounded-lg" aria-hidden />}
      <img
        ref={ref}
        {...props}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}
