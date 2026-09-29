import { formatINR, savingsPct } from "@/lib/pricing";

/** One price, and the saving in rupees: no strike-through MRP theatre. */
export default function Price({ price, mrp, size = "md" }: { price: number; mrp: number; size?: "sm" | "md" | "lg" }) {
  const pct = savingsPct(price, mrp);
  const big = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];
  return (
    <div>
      <span className={`${big} font-semibold tracking-tight`}>{formatINR(price)}</span>
      {pct > 0 && (
        <span className="ml-2 text-sm text-save">
          Save {formatINR(mrp - price)} <span className="text-muted">({pct}% off list)</span>
        </span>
      )}
    </div>
  );
}
