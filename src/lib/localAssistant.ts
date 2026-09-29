// Ask Bazaar's built-in engine: no AI API, no cost, no invented products.
// It reads the question for intent (search, compare, bundle, product or cart questions),
// budget, category, delivery deadline and ranking, then answers straight from the catalog.
// Replies use the same [[product]] / [[bundle]] / [[results]] markers as the Claude path,
// so the chat UI is identical either way.
import { search, getProduct, similar, kindOf, products, departments, type Product, type SortKey } from "./catalog";
import { snap, type Snap } from "./snap";
import { priceHistory, priceStats } from "./priceHistory";
import { formatINR, formatDay, deliveryDate, orderTotals, FREE_DELIVERY_THRESHOLD, COD_LIMIT } from "./pricing";
import type { PageContext } from "./assistant";

export type LocalReply = { status: string; text: string; products: Snap[] };

// ---- Reading the question ----

const CATEGORY_WORDS: [RegExp, { cat?: string; dept?: string; label: string }][] = [
  [/\b(phones?|smartphones?|mobiles?|iphone|android)\b/, { cat: "smartphones", label: "phones" }],
  [/\b(tablets?|ipad)\b/, { cat: "tablets", label: "tablets" }],
  [/\b(laptops?|notebooks?|macbook)\b/, { cat: "laptops", label: "laptops" }],
  [/\b(earbuds?|earphones?|headphones?|chargers?|phone case|accessor(y|ies))\b/, { cat: "mobile-accessories", label: "mobile accessories" }],
  [/\b(kitchen|cook(ing)?|utensils?|cookware)\b/, { cat: "kitchen-accessories", label: "kitchen items" }],
  [/\b(furniture|sofa|bed|chairs?|tables?)\b/, { cat: "furniture", label: "furniture" }],
  [/\b(decor|decoration|lamps?|home decor)\b/, { cat: "home-decoration", label: "home decor" }],
  [/\b(grocer(y|ies)|food|fruits?|vegetables?|snacks?)\b/, { cat: "groceries", label: "groceries" }],
  [/\b(makeup|make-up|lipsticks?|mascara|nail polish)\b/, { cat: "beauty", label: "makeup" }],
  [/\b(perfumes?|fragrances?|scents?|cologne)\b/, { cat: "fragrances", label: "fragrances" }],
  [/\b(skin ?care|creams?|lotions?|serums?|moisturi[sz]er)\b/, { cat: "skin-care", label: "skin care" }],
  [/\b(shirts?)\b/, { cat: "mens-shirts", label: "shirts" }],
  [/\b(sunglass(es)?|shades)\b/, { cat: "sunglasses", label: "sunglasses" }],
  [/\b(dress(es)?|frocks?)\b/, { cat: "womens-dresses", label: "dresses" }],
  [/\b(handbags?|bags?|purses?)\b/, { cat: "womens-bags", label: "bags" }],
  [/\b(jewell?(e)?ry|necklaces?|rings?|earrings?)\b/, { cat: "womens-jewellery", label: "jewellery" }],
  [/\b(sports?|fitness|gym|cricket|football|racket|workout)\b/, { cat: "sports-accessories", label: "sports gear" }],
  [/\b(beauty)\b/, { dept: "beauty", label: "beauty products" }],
  [/\b(electronics|gadgets?)\b/, { dept: "mobiles", label: "gadgets" }],
];

// Words that are better matched against product text than mapped to a category.
const KEYWORD_ITEMS = /\b(shoes?|sneakers?|watch(es)?|tops?)\b/;

const forWomenRe = /\b(women|women's|womens|her|wife|mom|mother|girlfriend|sister|ladies)\b/;

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function amount(num: string, unit?: string) {
  let v = parseFloat(num.replace(/,/g, ""));
  if (unit === "k") v *= 1000;
  if (unit === "lakh" || unit === "lac") v *= 100000;
  return Number.isFinite(v) ? Math.round(v) : undefined;
}

const MONEY = String.raw`(?:₹|rs\.?|inr)?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|lakh|lac)?\b`;

export function parseQuery(raw: string) {
  const q = raw.toLowerCase().replace(/[’']/g, "'");
  const between = q.match(new RegExp(String.raw`between\s+${MONEY}\s+(?:and|to|-)\s+${MONEY}`));
  const under = q.match(new RegExp(String.raw`(?:under|below|less than|within|up ?to|max(?:imum)?|budget(?: of)?|for|<)\s+${MONEY}`));
  const over = q.match(new RegExp(String.raw`(?:over|above|more than|at least|min(?:imum)?|>)\s+${MONEY}`));
  const max = between ? amount(between[3], between[4]) : under ? amount(under[1], under[2]) : undefined;
  const min = between ? amount(between[1], between[2]) : over ? amount(over[1], over[2]) : undefined;

  let days: number | undefined;
  if (/\b(today|tomorrow|overnight|asap|urgent(ly)?)\b/.test(q)) days = 1;
  const inDays = q.match(/\b(?:in|within)\s+(\d+)\s+days?\b/);
  if (inDays) days = Number(inDays[1]);
  if (/\bthis week\b/.test(q)) days = 7;
  const by = q.match(new RegExp(`\\bby\\s+(${WEEKDAYS.join("|")})\\b`));
  if (by) days = ((WEEKDAYS.indexOf(by[1]) - new Date().getDay() + 7) % 7) || 7;

  let sort: SortKey = "relevance";
  if (/\b(best|top|highest[- ]rated|best[- ]rated|good|quality)\b/.test(q)) sort = "rating";
  if (/\b(cheap(est)?|lowest price|affordable|budget)\b/.test(q)) sort = "price-asc";
  if (/\b(fastest|quickest)\b/.test(q)) sort = "fastest";
  if (/\b(deals?|discount(s|ed)?|sale|offers?|biggest sav(ing|e))\b/.test(q)) sort = "discount";

  const count = q.match(/\btop\s+(\d+)\b|\b(\d+)\s+(?:options|picks|choices|items|products)\b/);
  const limit = count ? Math.min(6, Math.max(1, Number(count[1] ?? count[2]))) : undefined;

  const forMen = /\b(men|men's|mens|him|husband|dad|father|boyfriend|brother)\b/.test(q);
  const forWomen = forWomenRe.test(q);
  let keyword = q.match(KEYWORD_ITEMS)?.[1]?.replace(/s$/, "").replace(/(watche)$/, "watch");
  let category = CATEGORY_WORDS.find(([re]) => re.test(q))?.[1];
  // "running shoes", "gym shoes": athletic footwear, not heels.
  if (keyword === "shoe" && /\b(running|sports?|gym|jogging|walking|training|athletic)\b/.test(q)) {
    category = { cat: forWomenRe.test(q) ? "womens-shoes" : "mens-shoes", label: "sports shoes" };
    keyword = undefined;
  }

  return { q, max, min, days, sort, limit, category, keyword, dept: forMen ? "men" : forWomen ? "women" : category?.dept };
}

// ---- Helpers for writing answers ----

const P = (p: Product) => `[[product:${p.id}]]`;
/** "tomorrow" / "today" / "on Sat, 3 Oct", so it reads naturally mid-sentence. */
const when = (days: number) => {
  const d = formatDay(deliveryDate(days));
  return d === "Tomorrow" || d === "Today" ? d.toLowerCase() : `on ${d}`;
};
const stars = (r: number) => `${r.toFixed(1)}★`;

function resultsUrl(f: { q?: string; dept?: string; cat?: string; min?: number; max?: number; days?: number; sort?: SortKey }) {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.dept) u.set("dept", f.dept);
  if (f.cat) u.set("cat", f.cat);
  if (f.min != null) u.set("min", String(f.min));
  if (f.max != null) u.set("max", String(f.max));
  if (f.days && f.days <= 2) u.set("fast", "1");
  if (f.sort && f.sort !== "relevance") u.set("sort", f.sort);
  return `/s?${u}`;
}

const GIFTABLE = new Set(["fragrances", "beauty", "skin-care", "mens-watches", "womens-watches", "womens-jewellery", "sunglasses", "womens-bags", "mobile-accessories", "home-decoration", "sports-accessories", "tops", "mens-shirts", "womens-dresses"]);

function findProducts(p: ReturnType<typeof parseQuery>, extra: { gift?: boolean } = {}) {
  const base = {
    cat: p.category?.cat,
    dept: p.category?.cat ? undefined : p.dept,
    q: p.category ? undefined : p.keyword,
    min: p.min,
    max: p.max,
    sort: p.sort,
    inStock: true,
  };
  let list = search(base);
  // A gendered ask with a keyword ("watch for my dad"): keep the keyword, narrow by department.
  if (p.keyword && p.dept && !p.category?.cat) list = list.filter((x) => x.department === p.dept);
  if (p.days) list = list.filter((x) => x.deliveryDays <= p.days!);
  if (extra.gift && !p.category) list = list.filter((x) => GIFTABLE.has(x.category));
  return { list, url: resultsUrl({ ...base, days: p.days }) };
}

function describeAsk(p: ReturnType<typeof parseQuery>) {
  return [
    p.category?.label ?? (p.keyword ? (p.keyword === "watch" ? "watches" : `${p.keyword}s`) : "products"),
    p.max && `under ${formatINR(p.max)}`,
    p.min && `over ${formatINR(p.min)}`,
    p.days && (p.days === 1 ? "arriving tomorrow" : `arriving within ${p.days} days`),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Product ids the previous answer showed, so "which one arrives faster?" has something to refer to. */
function lastShown(history: { role: string; content: unknown }[]) {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "assistant" || !Array.isArray(m.content)) continue;
    const text = m.content.map((b: { type?: string; text?: string }) => (b.type === "text" ? b.text : "")).join(" ");
    const ids = [...text.matchAll(/\[\[(?:product|bundle):([\d,\s]+)\]\]/g)].flatMap((x) => x[1].split(",").map((n) => Number(n.trim())));
    const found = ids.map(getProduct).filter((x): x is Product => !!x);
    if (found.length) return found;
  }
  return [];
}

// ---- Intents ----

function answerSearch(p: ReturnType<typeof parseQuery>, gift = false): LocalReply {
  const { list, url } = findProducts(p, { gift });
  const n = p.limit ?? 4;
  const label = gift ? `gift ideas${p.max ? ` under ${formatINR(p.max)}` : ""}${p.days ? (p.days === 1 ? " that arrive tomorrow" : ` that arrive within ${p.days} days`) : ""}` : describeAsk(p);
  if (!list.length) {
    return {
      status: `Searching ${label}`,
      text: `I couldn't find any ${label} right now. Try a higher budget or a later delivery date.\n\n[[results:${resultsUrl({ cat: p.category?.cat, dept: p.dept, max: p.max ? Math.round(p.max * 1.5) : undefined })}]]`,
      products: [],
    };
  }
  const picks = list.slice(0, n);
  const top = picks[0];
  const why =
    p.sort === "price-asc"
      ? `The cheapest is **${top.title}** at ${formatINR(top.price)}.`
      : p.sort === "discount"
        ? `The biggest saving is on **${top.title}**: ${formatINR(top.mrp - top.price)} off its list price.`
        : p.sort === "fastest"
          ? `**${top.title}** is the quickest, arriving ${when(top.deliveryDays)}.`
          : `My top pick is **${top.title}**: rated ${stars(top.rating)} by ${top.ratings.total.toLocaleString("en-IN")} people, arriving ${when(top.deliveryDays)}.`;
  const more = list.length > n ? ` There are ${list.length} matches in total.` : "";
  return {
    status: `Searching ${label}`,
    text: `${why}${more}\n\n${picks.map(P).join("\n")}\n\n[[results:${url}]]`,
    products: picks.map(snap),
  };
}

function answerCompare(p: ReturnType<typeof parseQuery>, shown: Product[]): LocalReply {
  let items = shown.slice(0, 3);
  if (p.category || p.keyword || !items.length) {
    const { list } = findProducts({ ...p, sort: "rating" });
    items = list.slice(0, p.limit ?? 3);
  }
  if (items.length < 2) return answerSearch(p);
  const cheapest = [...items].sort((a, b) => a.price - b.price)[0];
  const best = [...items].sort((a, b) => b.rating - a.rating)[0];
  const fastest = [...items].sort((a, b) => a.deliveryDays - b.deliveryDays)[0];
  const lines = items.map((x) => `- **${x.title}**: ${formatINR(x.price)}, ${stars(x.rating)}, arrives ${when(x.deliveryDays)}, ${x.returnDays ? `${x.returnDays}-day returns` : "no returns"}`);
  const verdict = [
    `**Best rated:** ${best.title}.`,
    cheapest.id !== best.id ? `**Cheapest:** ${cheapest.title}.` : "",
    fastest.id !== best.id && fastest.id !== cheapest.id ? `**Fastest:** ${fastest.title}.` : "",
  ].filter(Boolean);
  return { status: "Comparing products", text: `${lines.join("\n")}\n\n${verdict.join(" ")}\n\n${items.map(P).join("\n")}`, products: items.map(snap) };
}

function answerBundle(p: ReturnType<typeof parseQuery>): LocalReply {
  const budget = p.max ?? 3000;
  // Well-rated items, each capped at a third of the budget so the set has breadth, one of each kind.
  const pool = findProducts({ ...p, max: budget / 3, sort: "rating" }).list.filter((x) => x.rating >= 3.5);
  const picks: Product[] = [];
  let spent = 0;
  for (const x of pool) {
    if (picks.length >= 6) break;
    if (picks.some((y) => kindOf(y) === kindOf(x))) continue;
    if (spent + x.price > budget) continue;
    picks.push(x);
    spent += x.price;
  }
  if (picks.length < 2) return answerSearch(p);
  const t = orderTotals(picks.map((x) => ({ ...x, qty: 1 })));
  return {
    status: `Building a set under ${formatINR(budget)}`,
    text: `Here's a set of ${picks.length} well-rated ${p.category?.label ?? "items"} for ${formatINR(t.items)}, ${formatINR(budget - t.items)} under your budget. ${t.delivery ? `Delivery adds ${formatINR(t.delivery)}.` : "Delivery is free."} Everything arrives ${when(Math.max(...picks.map((x) => x.deliveryDays)))} at the latest.\n\n[[bundle:${picks.map((x) => x.id).join(",")}]]`,
    products: picks.map(snap),
  };
}

function answerProduct(q: string, prod: Product): LocalReply | null {
  const s = snap(prod);
  if (/\b(good time|wait|price (drop|history)|cheaper later|buy (it )?now|right time|go down)\b/.test(q)) {
    const st = priceStats(priceHistory(prod.id, prod.price, prod.mrp));
    const text =
      st.verdict === "lowest"
        ? `Yes. ${formatINR(st.current)} is its **lowest price in 90 days** (it's been as high as ${formatINR(st.high)}).`
        : st.verdict === "below"
          ? `It's a decent time: ${formatINR(st.current)} is ${formatINR(st.avg - st.current)} **below its 90-day average**. The lowest it's been is ${formatINR(st.low)}.`
          : st.verdict === "usual"
            ? `It's at **about its usual price** (90-day average ${formatINR(st.avg)}). The lowest it's been is ${formatINR(st.low)}, so there's no strong reason to wait or rush.`
            : `If you can wait, I would: ${formatINR(st.current)} is **higher than usual**. It averaged ${formatINR(st.avg)} over 90 days and dropped to ${formatINR(st.low)}.`;
    return { status: "Checking price history", text: `${text} The chart is on this page under Price history.`, products: [s] };
  }
  if (/\b(return|refund|exchange|doesn't suit|does not suit|doesn't fit)\b/.test(q)) {
    const text = prod.returnDays
      ? `Yes. **${prod.title}** can be returned within **${prod.returnDays} days** of delivery, with free pickup. Start it from Your Orders and the refund goes back to how you paid.`
      : `No. **${prod.title}** isn't returnable (${prod.returnPolicy.toLowerCase()}). If that's a concern, here are similar ones that are:\n\n${similar(prod, 6).filter((x) => x.returnDays).slice(0, 3).map(P).join("\n")}`;
    return { status: "Checking the return policy", text, products: similar(prod, 6).map(snap) };
  }
  if (/\b(arrive|deliver(y|ed)?|ship(ping)?|when)\b/.test(q)) {
    return {
      status: "Checking delivery",
      text: `If you order now, **${prod.title}** arrives **${when(prod.deliveryDays)}**. ${prod.price >= FREE_DELIVERY_THRESHOLD ? "Delivery is free." : `Delivery is ₹40, or free if your order is ${formatINR(FREE_DELIVERY_THRESHOLD)} or more.`}${prod.deliveryDays > 2 ? " Express delivery at checkout (₹99) can bring it forward." : ""}`,
      products: [s],
    };
  }
  if (/\b(warranty|guarantee)\b/.test(q)) {
    return { status: "Checking warranty", text: `**${prod.title}** comes with: ${prod.warranty}.`, products: [s] };
  }
  if (/\b(review|reviewers|complain|people (say|think)|feedback|opinion|rating)\b/.test(q)) {
    const { total, counts } = prod.ratings;
    const good = Math.round(((counts[3] + counts[4]) / total) * 100);
    const bad = Math.round(((counts[0] + counts[1]) / total) * 100);
    const quotes = prod.reviews.map((r) => `- ${r.rating}★ “${r.comment}”`).join("\n");
    const tone = prod.rating >= 4 ? "Reviewers are mostly happy" : prod.rating >= 3 ? "Reviews are mixed" : "Reviewers are mostly unhappy";
    return {
      status: "Reading reviews",
      text: `${tone}: **${stars(prod.rating)}** from ${total.toLocaleString("en-IN")} ratings. ${good}% gave 4 or 5 stars and ${bad}% gave 1 or 2.\n\nRecent written reviews:\n${quotes}`,
      products: [s],
    };
  }
  if (/\b(worth|compare|similar|alternatives?|better|instead|vs|versus)\b/.test(q)) {
    const others = similar(prod, 3, true).length ? similar(prod, 3, true) : similar(prod, 3);
    if (!others.length) return null;
    const all = [prod, ...others];
    const avgRating = others.reduce((a, x) => a + x.rating, 0) / others.length;
    const cheaper = others.filter((x) => x.price < prod.price && x.rating >= prod.rating);
    const verdict =
      cheaper.length > 0
        ? `Probably not the best value: **${cheaper[0].title}** is cheaper (${formatINR(cheaper[0].price)}) and rated at least as well (${stars(cheaper[0].rating)}).`
        : prod.rating >= avgRating
          ? `Yes, it holds up: rated ${stars(prod.rating)}, against an average of ${stars(avgRating)} for the closest alternatives.`
          : `It's rated lower (${stars(prod.rating)}) than similar options (average ${stars(avgRating)}), so look at these first:`;
    const lines = all.map((x) => `- **${x.title}**${x.id === prod.id ? " (this one)" : ""}: ${formatINR(x.price)}, ${stars(x.rating)}, arrives ${when(x.deliveryDays)}, ${x.returnDays ? `${x.returnDays}-day returns` : "no returns"}`);
    return { status: `Comparing ${prod.title} with similar items`, text: `${verdict}\n\n${lines.join("\n")}\n\n${others.map(P).join("\n")}`, products: all.map(snap) };
  }
  return null;
}

function answerCart(q: string, ctx: PageContext): LocalReply | null {
  const lines = ctx.cart.map((l) => ({ p: getProduct(l.id), qty: l.qty })).filter((l): l is { p: Product; qty: number } => !!l.p);
  const mentionsCart = /\b(cart|my order|my items|everything)\b/.test(q);
  if (!lines.length) {
    return mentionsCart || /\bfree delivery\b/.test(q)
      ? { status: "Checking your cart", text: `Your cart is empty. Orders of ${formatINR(FREE_DELIVERY_THRESHOLD)} or more get free delivery, and there are no other fees.`, products: [] }
      : null;
  }
  const t = orderTotals(lines.map((l) => ({ ...l.p, qty: l.qty })));
  if (/\bfree delivery|delivery (fee|charge)|shipping (fee|charge)\b/.test(q)) {
    if (!t.toFreeDelivery) return { status: "Checking your cart", text: `Good news: your cart (${formatINR(t.items)}) already gets **free delivery**.`, products: [] };
    const inCart = new Set(lines.map((l) => l.p.id));
    const fillers = products
      .filter((x) => !inCart.has(x.id) && x.stock > 0 && x.price >= t.toFreeDelivery && x.rating >= 3.5)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);
    return {
      status: "Finding small add-ons",
      text: `You're **${formatINR(t.toFreeDelivery)}** away from free delivery. Adding any of these, for example, gets you there, and saves the ₹40 fee:\n\n${fillers.map(P).join("\n")}\n\nOr just pay the ₹40. There are no other fees.`,
      products: fillers.map(snap),
    };
  }
  if (/\b(cash on delivery|cod|pay (on|at) delivery|pay cash)\b/.test(q)) {
    return {
      status: "Checking payment options",
      text: t.codAvailable
        ? `Yes. Your order total is ${formatINR(t.total)}, within the ${formatINR(COD_LIMIT)} cash-on-delivery limit, and there's no extra fee for it.`
        : `Not for this order. Cash on delivery works up to ${formatINR(COD_LIMIT)}, and your total is ${formatINR(t.total)}. UPI and cards have no limit.`,
      products: [],
    };
  }
  if (/\b(last|latest|when will|arrive|delivery date)\b/.test(q)) {
    const sorted = [...lines].sort((a, b) => a.p.deliveryDays - b.p.deliveryDays);
    const last = sorted[sorted.length - 1];
    return {
      status: "Checking delivery dates",
      text: `**${last.p.title}** arrives last, **${when(last.p.deliveryDays)}**. Everything else:\n${sorted.slice(0, -1).map((l) => `- ${l.p.title}: ${formatDay(deliveryDate(l.p.deliveryDays))}`).join("\n")}${last.p.deliveryDays > 2 ? "\n\nExpress delivery at checkout (₹99) speeds up the whole order." : ""}`,
      products: [],
    };
  }
  if (/\b(cheaper|save money|alternatives?|same job|less expensive)\b/.test(q)) {
    const swaps = lines
      .map((l) => ({ from: l.p, to: similar(l.p, 8, true).filter((x) => x.price < l.p.price && x.rating >= l.p.rating - 0.3 && x.stock > 0).sort((a, b) => a.price - b.price)[0] }))
      .filter((x): x is { from: Product; to: Product } => !!x.to);
    if (!swaps.length) return { status: "Looking for cheaper options", text: "Everything in your cart is already the best-priced option I can find at a similar rating.", products: [] };
    const saved = swaps.reduce((a, s) => a + s.from.price - s.to.price, 0);
    return {
      status: "Looking for cheaper options",
      text: `You could save about **${formatINR(saved)}**:\n${swaps.map((s) => `- Swap **${s.from.title}** (${formatINR(s.from.price)}) for **${s.to.title}** (${formatINR(s.to.price)}, ${stars(s.to.rating)})`).join("\n")}\n\n${swaps.map((s) => P(s.to)).join("\n")}`,
      products: swaps.map((s) => snap(s.to)),
    };
  }
  return null;
}

function answerPolicy(q: string): LocalReply | null {
  if (/\b(cancel)\b/.test(q)) {
    return { status: "Checking the rules", text: "You can cancel any order until it ships. Open it in **Your orders** and tap **Cancel order**. Card and UPI payments are refunded within 2–4 working days.", products: [] };
  }
  if (/\b(return|refund)\b/.test(q)) {
    return {
      status: "Checking the rules",
      text: "Each product has its own return window (7 to 90 days, and some items can't be returned). The deadline is shown on every item in **Your orders**. Tap **Return item**, pick a reason, and we collect it for free. Refunds go back to how you paid, or to your bank for cash-on-delivery orders.",
      products: [],
    };
  }
  if (/\b(fees?|charges?|hidden)\b/.test(q)) {
    return { status: "Checking the rules", text: `The only possible charge on top of the item price is delivery: ₹40 on orders under ${formatINR(FREE_DELIVERY_THRESHOLD)}, or ₹99 if you choose express. No platform, marketplace or cash-on-delivery fees.`, products: [] };
  }
  return null;
}

// ---- Entry point ----

export function localAnswer(message: string, ctx: PageContext, history: { role: string; content: unknown }[]): LocalReply {
  const p = parseQuery(message);
  const q = p.q;
  const viewing = ctx.productId ? getProduct(ctx.productId) : undefined;
  const shown = lastShown(history);
  const hasFilters = !!(p.category || p.keyword || p.max || p.min);

  if (/\b(hi|hello|hey|namaste)\b/.test(q) && q.split(/\s+/).length <= 3) {
    return { status: "Thinking", text: "Hi! Tell me what you're looking for, your budget and when you need it, like “best-rated phone under ₹20,000” or “gift under ₹1,000 by Friday”.", products: [] };
  }

  // Questions about the product on screen come first, unless they're clearly a new search.
  if (viewing && !hasFilters) {
    const r = answerProduct(q, viewing);
    if (r) return r;
  }
  // "Can I cancel my order?" is about the rules, not about the cart.
  if (!hasFilters && /\b(cancel|refund)\b/.test(q)) return answerPolicy(q)!;
  const cart = answerCart(q, ctx);
  if (cart) return cart;

  // Follow-ups about what was just shown: "which one arrives faster?", "which is cheapest?"
  if (shown.length > 1 && !hasFilters && /\b(which|what about|those|these|them|of these)\b/.test(q)) {
    const pick = /\b(fast|quick|soon|arrive)/.test(q)
      ? [...shown].sort((a, b) => a.deliveryDays - b.deliveryDays)[0]
      : /\b(cheap|price|afford)/.test(q)
        ? [...shown].sort((a, b) => a.price - b.price)[0]
        : [...shown].sort((a, b) => b.rating - a.rating)[0];
    const reason = /\b(fast|quick|soon|arrive)/.test(q) ? `arrives soonest, ${when(pick.deliveryDays)}` : /\b(cheap|price|afford)/.test(q) ? `is the cheapest at ${formatINR(pick.price)}` : `is the best rated at ${stars(pick.rating)}`;
    return { status: "Comparing what I showed you", text: `Of those, **${pick.title}** ${reason}.\n\n${P(pick)}`, products: [snap(pick)] };
  }

  if (/\b(compare|comparison|vs|versus|difference)\b/.test(q)) return answerCompare(p, shown);
  if (/\b(stock|kit|basket|bundle|set up|setup|essentials|starter|everything (i|you) need)\b/.test(q)) return answerBundle(p);

  const policy = answerPolicy(q);
  if (policy && !hasFilters) return policy;

  const gift = /\b(gifts?|present|birthday|anniversary|diwali|rakhi)\b/.test(q);
  if (hasFilters || gift || p.sort !== "relevance" || p.days) return answerSearch(p, gift);

  // Last resort: treat meaningful words as a catalog search.
  const words = q.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  for (let n = words.length; n > 0; n--) {
    const list = search({ q: words.slice(0, n).join(" "), sort: "rating", inStock: true });
    if (list.length) {
      const picks = list.slice(0, 4);
      return {
        status: `Searching “${words.slice(0, n).join(" ")}”`,
        text: `Here's what matches “${words.slice(0, n).join(" ")}”, best rated first:\n\n${picks.map(P).join("\n")}\n\n[[results:${resultsUrl({ q: words.slice(0, n).join(" ") })}]]`,
        products: picks.map(snap),
      };
    }
  }
  return {
    status: "Thinking",
    text: `I can help you find products, compare them, check delivery, returns and price history, or make your cart cheaper. Try something like:\n- best-rated phone under ₹20,000\n- gift under ₹1,000 that arrives by Friday\n- stock my kitchen for ₹3,000\n\nDepartments: ${departments.map((d) => d.name).join(", ")}.`,
    products: [],
  };
}

const STOP = new Set(
  "the and for with that this what which want need looking find show some any good best please can you have get buy from about under over below above something cheap".split(" "),
);
