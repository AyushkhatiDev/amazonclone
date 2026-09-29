// Server-side pieces of "Ask Bazaar": the tools the model can call, the system prompt,
// and the per-turn page context. Everything the assistant says about a product comes
// from these tools, never from the model's own memory.
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { search, getProduct, departments, type Product, type SortKey } from "./catalog";
import { snap, type Snap } from "./snap";
import { priceHistory, priceStats } from "./priceHistory";
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE, EXPRESS_FEE, COD_LIMIT } from "./pricing";

export const MODEL = "claude-opus-5-5";

// Frozen for the whole conversation: page context and dates go in user turns instead, so
// the prompt cache stays warm and replayed thinking blocks keep a byte-identical prefix.
export const SYSTEM_PROMPT = `You are Ask Bazaar, the shopping assistant on Bazaar, an Indian online store (prices in INR).

How you work:
- Only recommend products you found with the tools in this conversation. Never invent products, prices, specs, stock or delivery dates.
- If the catalog doesn't answer something (e.g. "is it waterproof?" when the listing doesn't say), say the listing doesn't mention it rather than guessing.
- Rank by what fits the shopper's need, budget and delivery date. There is no sponsored placement on Bazaar; never favour a product for any other reason.
- Be brief: a short answer first, then the products. No long preambles. Use plain sentences, "- " bullet lists and **bold** only; no headings, no tables.

Showing products (the app turns these markers into interactive cards; always put each marker on its own line):
- [[product:ID]] shows one product card with live price, delivery date and an Add to cart button. Use it for every product you recommend, at most 6 per answer.
- [[bundle:ID,ID,ID]] shows a set with its combined total and an "Add all to cart" button. Use it when the shopper asks for a basket, kit or set within a budget.
- [[results:URL]] shows a "See all results" button. Use the see_all_url returned by search_products, unchanged.

Store rules you can rely on:
- Delivery is free on orders of ₹${FREE_DELIVERY_THRESHOLD} or more, otherwise ₹${STANDARD_DELIVERY_FEE}. Express delivery costs ₹${EXPRESS_FEE} flat. There are no other fees.
- Cash on delivery is available for orders up to ₹${COD_LIMIT.toLocaleString("en-IN")}. UPI and cards have no limit.
- Price history: get_product_details includes each product's 90-day low, high, average and a verdict. Use it for "is now a good time to buy?"; the product page shows the same chart (it is simulated for this demo).
- Returns: each product has its own return window (some are not returnable); pickup is free. Orders can be cancelled until they ship.
- The shopper can see the page they're on; its details arrive in <page_context> with each message. Use it for questions like "is this returnable?" or "how do I get free delivery?".

Stay on shopping. For anything unrelated, briefly say you can only help with shopping on Bazaar.`;

const DEPT_SLUGS = departments.map((d) => d.slug) as [string, ...string[]];
const CATEGORY_SLUGS = departments.flatMap((d) => d.categories.map((c) => c.slug)) as [string, ...string[]];
const SORTS = ["relevance", "price-asc", "price-desc", "rating", "fastest", "discount"] as const;

export const SearchInput = z.object({
  query: z.string().max(100).optional(),
  department: z.enum(DEPT_SLUGS).optional(),
  category: z.enum(CATEGORY_SLUGS).optional(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  arrives_within_days: z.number().int().min(1).max(30).optional(),
  in_stock_only: z.boolean().optional(),
  sort: z.enum(SORTS).optional(),
  limit: z.number().int().min(1).max(12).optional(),
});

export const DetailsInput = z.object({ product_ids: z.array(z.number().int()).min(1).max(4) });

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_products",
    description:
      "Search the Bazaar catalog. All filters are optional and combine with AND. Returns matching products (id, title, brand, price in INR, list price, rating, rating count, delivery days, return days, stock) plus see_all_url, a link to the same results on the site. Search broadly first (e.g. just a category and budget) if a narrow query finds nothing.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords matched against title, brand, category, tags and description" },
        department: { type: "string", enum: DEPT_SLUGS, description: "Department slug" },
        category: { type: "string", enum: CATEGORY_SLUGS, description: "Category slug (narrower than department)" },
        min_price: { type: "number", description: "Minimum price in INR" },
        max_price: { type: "number", description: "Maximum price in INR" },
        min_rating: { type: "number", description: "Minimum average star rating, 0-5" },
        arrives_within_days: { type: "integer", description: "Only products delivered within this many days" },
        in_stock_only: { type: "boolean" },
        sort: { type: "string", enum: [...SORTS] },
        limit: { type: "integer", description: "Max results, default 8, up to 12" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_product_details",
    description:
      "Full details for up to 4 products by id: description, warranty, return policy, dimensions, weight, rating breakdown and written reviews. Use before answering questions about specific products or comparing them.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: { product_ids: { type: "array", items: { type: "integer" }, minItems: 1, maxItems: 4 } },
      required: ["product_ids"],
      additionalProperties: false,
    },
  },
];

const summary = (p: Product) => ({
  id: p.id,
  title: p.title,
  brand: p.brand,
  category: p.categoryName,
  price: p.price,
  list_price: p.mrp,
  rating: p.rating,
  rating_count: p.ratings.total,
  delivery_days: p.deliveryDays,
  return_days: p.returnDays,
  stock: p.stock,
});

/** Runs a tool call. Returns the JSON for the model plus the products the UI may need to render. */
export function runTool(name: string, input: unknown): { result: string; products: Snap[]; isError?: boolean; status: string } {
  if (name === "search_products") {
    const parsed = SearchInput.safeParse(input);
    if (!parsed.success) return { result: `Invalid input: ${parsed.error.message}`, products: [], isError: true, status: "Searching" };
    const f = parsed.data;
    const all = search({
      q: f.query,
      dept: f.department,
      cat: f.category,
      min: f.min_price,
      max: f.max_price,
      rating: f.min_rating,
      inStock: f.in_stock_only,
      sort: f.sort as SortKey | undefined,
    }).filter((p) => !f.arrives_within_days || p.deliveryDays <= f.arrives_within_days);
    const hits = all.slice(0, f.limit ?? 8);
    const url = new URLSearchParams();
    if (f.query) url.set("q", f.query);
    if (f.department) url.set("dept", f.department);
    if (f.category) url.set("cat", f.category);
    if (f.min_price != null) url.set("min", String(f.min_price));
    if (f.max_price != null) url.set("max", String(f.max_price));
    if (f.min_rating) url.set("rating", String(Math.floor(f.min_rating)));
    if (f.arrives_within_days && f.arrives_within_days <= 2) url.set("fast", "1");
    if (f.in_stock_only) url.set("stock", "1");
    if (f.sort && f.sort !== "relevance") url.set("sort", f.sort);
    const label = [f.query && `“${f.query}”`, f.max_price && `under ₹${f.max_price.toLocaleString("en-IN")}`].filter(Boolean).join(" ");
    return {
      result: JSON.stringify({ total_matches: all.length, results: hits.map(summary), see_all_url: `/s?${url}` }),
      products: hits.map(snap),
      status: `Searching${label ? ` ${label}` : " the catalog"}`,
    };
  }
  if (name === "get_product_details") {
    const parsed = DetailsInput.safeParse(input);
    if (!parsed.success) return { result: `Invalid input: ${parsed.error.message}`, products: [], isError: true, status: "Reading product details" };
    const found = parsed.data.product_ids.map(getProduct).filter((p): p is Product => !!p);
    return {
      result: JSON.stringify(
        found.map((p) => ({
          ...summary(p),
          description: p.description,
          warranty: p.warranty,
          return_policy: p.returnPolicy,
          dimensions_cm: p.dimensions,
          weight_kg: p.weight,
          tags: p.tags,
          ratings_by_star: { 5: p.ratings.counts[4], 4: p.ratings.counts[3], 3: p.ratings.counts[2], 2: p.ratings.counts[1], 1: p.ratings.counts[0] },
          reviews: p.reviews.map((r) => ({ rating: r.rating, comment: r.comment, date: r.date.slice(0, 10) })),
          price_last_90_days: (({ low, high, avg, lowPoint, verdict }) => ({ low, high, average: avg, low_was_days_ago: lowPoint.daysAgo, verdict }))(
            priceStats(priceHistory(p.id, p.price, p.mrp)),
          ),
        })),
      ),
      products: found.map(snap),
      status: found.length > 1 ? "Comparing products" : `Reading about ${found[0]?.title ?? "the product"}`,
    };
  }
  return { result: `Unknown tool ${name}`, products: [], isError: true, status: "Working" };
}

// ---- Page context sent by the browser with each message ----

export const PageContext = z.object({
  path: z.string().max(200),
  productId: z.number().int().optional(),
  cart: z.array(z.object({ id: z.number().int(), qty: z.number().int().min(1).max(10) })).max(50).default([]),
  pincode: z.string().max(6).optional(),
  today: z.string().max(40),
});
export type PageContext = z.infer<typeof PageContext>;

/** Rendered from our own catalog (not trusted client text), so prices and titles are always real. */
export function contextBlock(ctx: PageContext) {
  const lines = [`Today: ${ctx.today}`, `Page: ${ctx.path}`];
  if (ctx.pincode) lines.push(`Delivery pincode: ${ctx.pincode}`);
  const viewing = ctx.productId ? getProduct(ctx.productId) : undefined;
  if (viewing) lines.push(`Viewing product: ${JSON.stringify(summary(viewing))}`);
  const cart = ctx.cart.map((l) => ({ p: getProduct(l.id), qty: l.qty })).filter((l): l is { p: Product; qty: number } => !!l.p);
  if (cart.length) {
    const items = cart.reduce((s, l) => s + l.p.price * l.qty, 0);
    lines.push(`Cart (${cart.length} lines, items total ₹${items}, delivery ${items >= FREE_DELIVERY_THRESHOLD ? "free" : `₹${STANDARD_DELIVERY_FEE}`}):`);
    for (const l of cart) lines.push(`- ${l.qty} × ${l.p.title} (id ${l.p.id}, ₹${l.p.price}, delivers in ${l.p.deliveryDays} days, returns ${l.p.returnDays || "none"})`);
  } else {
    lines.push("Cart: empty");
  }
  return `<page_context>\n${lines.join("\n")}\n</page_context>`;
}

export const ContextSnaps = (ctx: PageContext): Snap[] => {
  const ids = [ctx.productId, ...ctx.cart.map((l) => l.id)].filter((x): x is number => !!x);
  return ids.map(getProduct).filter((p): p is Product => !!p).map(snap);
};
