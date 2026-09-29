import data from "@/data/catalog.json";

export type Review = { rating: number; comment: string; date: string; name: string };

export type Product = {
  id: number;
  slug: string;
  title: string;
  brand: string | null;
  description: string;
  department: string;
  category: string;
  categoryName: string;
  price: number;
  mrp: number;
  rating: number;
  ratings: { total: number; counts: number[] };
  stock: number;
  deliveryDays: number;
  warranty: string;
  returnPolicy: string;
  returnDays: number;
  tags: string[];
  weight: number;
  dimensions: { width: number; height: number; depth: number };
  images: string[];
  thumbnail: string;
  reviews: Review[];
};

export type Department = {
  slug: string;
  name: string;
  categories: { slug: string; name: string }[];
  count: number;
  image: string;
};

export const products = data.products as Product[];
export const departments = data.departments as Department[];

const byId = new Map(products.map((p) => [p.id, p]));
const bySlug = new Map(products.map((p) => [p.slug, p]));

export const getProduct = (id: number) => byId.get(id);
export const getProductBySlug = (slug: string) => bySlug.get(slug);
export const getDepartment = (slug: string) => departments.find((d) => d.slug === slug);

export type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "fastest" | "discount";

export type SearchParams = {
  q?: string;
  dept?: string;
  cat?: string;
  min?: number;
  max?: number;
  rating?: number;
  fast?: boolean;
  inStock?: boolean;
  sort?: SortKey;
};

function score(p: Product, terms: string[]) {
  if (!terms.length) return 1;
  const title = p.title.toLowerCase();
  const hay = [p.brand, p.categoryName, p.category, ...p.tags, p.description].join(" ").toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (title.includes(t)) s += title.startsWith(t) ? 6 : 4;
    else if (hay.includes(t)) s += 1;
    else return 0; // every term has to match somewhere
  }
  return s;
}

/** Ranking has no paid placement: relevance first, then rating and delivery speed as tie-breakers. */
export function search(params: SearchParams) {
  const terms = (params.q || "").toLowerCase().split(/\s+/).filter(Boolean);
  let list = products
    .map((p) => ({ p, s: score(p, terms) }))
    .filter(({ p, s }) => {
      if (s === 0) return false;
      if (params.dept && p.department !== params.dept) return false;
      if (params.cat && p.category !== params.cat) return false;
      if (params.min != null && p.price < params.min) return false;
      if (params.max != null && p.price > params.max) return false;
      if (params.rating && p.rating < params.rating) return false;
      if (params.fast && p.deliveryDays > 2) return false;
      if (params.inStock && p.stock === 0) return false;
      return true;
    });
  const sorters: Record<SortKey, (a: typeof list[0], b: typeof list[0]) => number> = {
    relevance: (a, b) => b.s - a.s || b.p.rating - a.p.rating || a.p.deliveryDays - b.p.deliveryDays,
    "price-asc": (a, b) => a.p.price - b.p.price,
    "price-desc": (a, b) => b.p.price - a.p.price,
    rating: (a, b) => b.p.rating - a.p.rating || b.p.ratings.total - a.p.ratings.total,
    fastest: (a, b) => a.p.deliveryDays - b.p.deliveryDays || a.p.price - b.p.price,
    discount: (a, b) => discount(b.p) - discount(a.p),
  };
  list = list.sort(sorters[params.sort || "relevance"]);
  return list.map((x) => x.p);
}

export const discount = (p: Product) => (p.mrp - p.price) / p.mrp;

export function similar(p: Product, n = 4) {
  return products
    .filter((x) => x.id !== p.id && x.category === p.category)
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .slice(0, n);
}

/** Small index shipped to the browser for instant search suggestions. */
export const searchIndex = products.map((p) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  brand: p.brand,
  category: p.categoryName,
  price: p.price,
  thumbnail: p.thumbnail,
}));
export type SearchIndexItem = (typeof searchIndex)[number];
