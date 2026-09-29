"use client";

/**
 * Sends a copy of the product image arcing into the header cart icon, so adding to cart
 * is felt without leaving the page. Skipped for reduced-motion users.
 */
export function flyToCart(source: Element | null) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = source?.closest("[data-product]");
  const img = box?.querySelector("img[data-fly]") ?? box?.querySelector("img") ?? null;
  const cart = document.getElementById("cart-icon");
  if (!img || !cart) return;
  const from = img.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  if (!from.width) return;

  const size = Math.min(96, from.width);
  const ghost = img.cloneNode() as HTMLImageElement;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "contain",
    zIndex: "60",
    pointerEvents: "none",
    borderRadius: "12px",
    background: "white",
    boxShadow: "0 10px 30px -8px rgb(0 0 0 / .35)",
    opacity: "1",
  });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 60}px) scale(0.6)`, opacity: 0.95, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0.3 },
      ],
      { duration: 700, easing: "cubic-bezier(.5,0,.3,1)" },
    )
    .finished.finally(() => ghost.remove());
}
