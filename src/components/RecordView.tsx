"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { Snap } from "@/lib/snap";

export default function RecordView({ product }: { product: Snap }) {
  const viewed = useStore((s) => s.viewed);
  useEffect(() => viewed(product), [product, viewed]);
  return null;
}
