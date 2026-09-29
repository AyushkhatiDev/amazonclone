// Builds src/data/catalog.json from the DummyJSON product dump.
// Usage: curl -s "https://dummyjson.com/products?limit=0" -o /tmp/products.json
//        node scripts/build-catalog.mjs /tmp/products.json
import fs from "node:fs";

const USD_TO_INR = 88;

const DEPARTMENTS = [
  { slug: "mobiles", name: "Mobiles & Tablets", categories: ["smartphones", "tablets", "mobile-accessories"] },
  { slug: "laptops", name: "Laptops", categories: ["laptops"] },
  { slug: "home-kitchen", name: "Home & Kitchen", categories: ["kitchen-accessories", "furniture", "home-decoration"] },
  { slug: "grocery", name: "Grocery", categories: ["groceries"] },
  { slug: "beauty", name: "Beauty", categories: ["beauty", "fragrances", "skin-care"] },
  { slug: "men", name: "Men's Fashion", categories: ["mens-shirts", "mens-shoes", "mens-watches", "sunglasses"] },
  { slug: "women", name: "Women's Fashion", categories: ["tops", "womens-dresses", "womens-shoes", "womens-bags", "womens-jewellery", "womens-watches"] },
  { slug: "sports", name: "Sports & Fitness", categories: ["sports-accessories"] },
];

const CATEGORY_NAMES = {
  "smartphones": "Smartphones", "tablets": "Tablets", "mobile-accessories": "Mobile Accessories",
  "laptops": "Laptops", "kitchen-accessories": "Kitchen", "furniture": "Furniture",
  "home-decoration": "Home Decor", "groceries": "Groceries", "beauty": "Makeup",
  "fragrances": "Fragrances", "skin-care": "Skin Care", "mens-shirts": "Shirts",
  "mens-shoes": "Men's Shoes", "mens-watches": "Men's Watches", "sunglasses": "Sunglasses",
  "tops": "Tops", "womens-dresses": "Dresses", "womens-shoes": "Women's Shoes",
  "womens-bags": "Bags", "womens-jewellery": "Jewellery", "womens-watches": "Women's Watches",
  "sports-accessories": "Sports",
};

// "Ships in 3-5 business days" -> days until delivery
function deliveryDays(text = "") {
  const t = text.toLowerCase();
  if (t.includes("overnight")) return 1;
  if (t.includes("1-2")) return 2;
  if (t.includes("3-5")) return 4;
  if (t.includes("2 weeks")) return 10;
  if (t.includes("1 week")) return 6;
  if (t.includes("month")) return 14;
  return 5;
}

// Indian retail pricing: small items end in 9, big ones in 99.
function inr(usd) {
  const v = usd * USD_TO_INR;
  if (v < 100) return Math.max(19, Math.round(v / 10) * 10 - 1);
  if (v < 10000) return Math.round(v / 10) * 10 - 1;
  return Math.round(v / 100) * 100 - 1;
}

// Deterministic pseudo-random so the catalog is stable across rebuilds.
function rng(seed) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

// Rating counts consistent with the product's average rating.
function histogram(avg, id) {
  const r = rng(id);
  const total = Math.round(40 + r() * 4000);
  const weights = [1, 2, 3, 4, 5].map((star) => Math.exp(-Math.abs(star - avg) * 1.6) + r() * 0.05);
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.round((w / sum) * total));
  return { total: counts.reduce((a, b) => a + b, 0), counts }; // counts[0] = 1 star
}

function slugify(s) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const src = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).products;
const catToDept = Object.fromEntries(DEPARTMENTS.flatMap((d) => d.categories.map((c) => [c, d.slug])));

const products = src
  .filter((p) => catToDept[p.category])
  .map((p) => {
    const price = inr(p.price);
    const mrp = p.discountPercentage >= 3 ? Math.round(price / (1 - p.discountPercentage / 100) / 10) * 10 - 1 : price;
    return {
      id: p.id,
      slug: `${slugify(p.title)}-${p.id}`,
      title: p.title,
      brand: p.brand || null,
      description: p.description,
      department: catToDept[p.category],
      category: p.category,
      categoryName: CATEGORY_NAMES[p.category],
      price,
      mrp: Math.max(mrp, price),
      rating: Math.round(p.rating * 10) / 10,
      ratings: histogram(p.rating, p.id),
      stock: p.stock,
      deliveryDays: deliveryDays(p.shippingInformation),
      warranty: p.warrantyInformation,
      returnPolicy: p.returnPolicy,
      returnDays: /(\d+)\s*days?/i.test(p.returnPolicy || "") ? Number(p.returnPolicy.match(/(\d+)\s*days?/i)[1]) : 0,
      tags: p.tags,
      weight: p.weight,
      dimensions: p.dimensions,
      images: p.images,
      thumbnail: p.thumbnail,
      reviews: p.reviews.map((r) => ({ rating: r.rating, comment: r.comment, date: r.date, name: r.reviewerName })),
    };
  });

const departments = DEPARTMENTS.map((d) => ({
  ...d,
  categories: d.categories.map((c) => ({ slug: c, name: CATEGORY_NAMES[c] })),
  count: products.filter((p) => p.department === d.slug).length,
  image: products.find((p) => p.department === d.slug)?.thumbnail,
}));

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/catalog.json", JSON.stringify({ departments, products }));
console.log(`${products.length} products in ${departments.length} departments`);
