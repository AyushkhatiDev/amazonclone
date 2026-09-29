import type { Product } from "./catalog";

/** The slice of a product that the cart, lists and orders keep. Safe to pass to client components. */
export type Snap = Pick<
  Product,
  "id" | "slug" | "title" | "price" | "mrp" | "thumbnail" | "deliveryDays" | "stock" | "returnDays" | "categoryName"
>;

export const snap = (p: Product | Snap): Snap => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  price: p.price,
  mrp: p.mrp,
  thumbnail: p.thumbnail,
  deliveryDays: p.deliveryDays,
  stock: p.stock,
  returnDays: p.returnDays,
  categoryName: p.categoryName,
});
