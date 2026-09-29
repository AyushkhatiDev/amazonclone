import { formatINR, savingsPct } from "@/lib/pricing";

/** One price, and the saving in rupees: no strike-through MRP theatre. */
export default function Price({ price, mrp, size = "md" }: { price: number; mrp: number; size?: "sm" | "md" | "lg" }) {
  const pct = savingsPct(price, mrp);
  const big = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];
  return (
    <div>
      <span className={`${big} font-semibold tracking-tight`}>{formatINR(price)}</span>
      {pct > 0 &&
        (size === "sm" ? (
          // Cards are narrow: keep each piece unbroken so it wraps as a unit, never mid-phrase.
          <span className="ml-2 inline-flex flex-wrap gap-x-1.5 text-sm">
            <span className="whitespace-nowrap text-save">Save {formatINR(mrp - price)}</span>
            <span className="whitespace-nowrap text-muted">{pct}% off</span>
          </span>
        ) : (
          <span className="ml-2 text-sm text-save">
            Save {formatINR(mrp - price)} <span className="text-muted">({pct}% off list)</span>
          </span>
        ))}
    </div>
  );
}
