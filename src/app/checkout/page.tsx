import type { Metadata } from "next";
import { getProduct } from "@/lib/catalog";
import { snap } from "@/lib/snap";
import Checkout from "./Checkout";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const product = sp.buy ? getProduct(Number(sp.buy)) : undefined;
  const qty = Math.max(1, Math.min(10, Number(sp.qty) || 1));
  return <Checkout buyNow={product && product.stock > 0 ? { item: snap(product), qty: Math.min(qty, product.stock) } : undefined} />;
}
