// Mirrors every catalog image into public/img so the site doesn't depend on a third-party demo CDN.
// Usage: node scripts/fetch-images.mjs, then re-run build-catalog.mjs to point the catalog at the copies.
import fs from "node:fs";
import path from "node:path";

const PREFIX = "https://cdn.dummyjson.com/product-images/";
export const localPath = (url) => "/img/" + url.slice(PREFIX.length).replace(/[^A-Za-z0-9./-]/g, "-");

const { products } = JSON.parse(fs.readFileSync("src/data/catalog.json", "utf8"));
const urls = [...new Set(products.flatMap((p) => [p.thumbnail, ...p.images]))].filter((u) => u.startsWith(PREFIX));
let done = 0, failed = 0;
const queue = [...urls];
await Promise.all(Array.from({ length: 16 }, async () => {
  for (let u; (u = queue.shift()); ) {
    const file = path.join("public", localPath(u));
    if (fs.existsSync(file)) { done++; continue; }
    const res = await fetch(u).catch(() => null);
    if (!res?.ok) { failed++; console.log("fail", u); continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    done++;
  }
}));
console.log(`${done} images saved, ${failed} failed`);

// Product shots are shown at most ~600px wide: shrink the 1000px originals (thumbnails are already small).
const sharp = (await import("sharp")).default;
let saved = 0;
for (const u of urls) {
  const file = path.join("public", localPath(u));
  if (file.endsWith("thumbnail.webp")) continue;
  const meta = await sharp(file).metadata();
  if (meta.width <= 640) continue;
  const before = fs.statSync(file).size;
  const out = await sharp(file).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  if (out.length < before) { fs.writeFileSync(file, out); saved += before - out.length; }
}
console.log(`resized, saved ${(saved / 1e6).toFixed(1)} MB`);
