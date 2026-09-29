# Bazaar: an amazon.in rebuild

Bazaar rebuilds Amazon's core shopping loop: search, product, cart, checkout, orders and returns. It keeps what Amazon gets right and removes the parts that work against the shopper.

- **Live:** _link added after deploy_
- **What I changed and why:** [PRODUCT.md](PRODUCT.md), with recon screenshots in [`recon/`](recon/)
- **Agent logs:** [`.agent-logs/`](.agent-logs/), and how capture was set up: [CAPTURE-TEST.md](CAPTURE-TEST.md)

## Try it in two minutes

1. Search from the header. Suggestions appear as you type, and `/` focuses the search box from anywhere. Filter by department, rating, price or "arrives in 2 days".
2. Open a product. It has one price, a verdict on whether now is a good time to buy (backed by a 90-day price chart), a delivery date, the return window, a comparison with similar items, and reviews you can filter by star rating.
3. Add to cart. A drawer confirms it and you keep browsing. The cart shows the final total, including delivery.
4. Check out and choose **Continue with the demo account**. Pick UPI, card or cash on delivery (card and UPI are simulated), then place the order.
5. Open **Ask Bazaar** from the header and try "Stock my kitchen for under ₹3,000" or, on a product page, "Is this worth it compared to similar ones?".
6. On **Your orders**, the tracking timeline advances with time. You can cancel before an order ships. On the older delivered demo order, you can return an item.

## What's different from amazon.in

| Amazon.in | Bazaar |
|---|---|
| A ₹5 "Marketplace Fee" first appears at checkout | Every fee is shown in the cart, and the total doesn't change |
| Sponsored results and banners mixed into search | No paid placement: results are ranked by relevance, rating and delivery speed |
| "Added to cart" opens a new page full of ads | A drawer confirms it and you keep browsing |
| Cash on delivery blocked at the last step | The cash-on-delivery limit is explained in the cart |
| Price shown twice, "-30%" off an M.R.P. | One price, with the saving shown in rupees |
| Menu opens with Prime Video, Alexa, Fire TV | Navigation lists shopping categories only |
| Buy it again / recent history below six banners | Your history comes first on the home page |
| "Price history" is a pill that links elsewhere | A verdict ("lowest in 90 days" / "higher than usual") next to the price, backed by a 90-day chart |
| Rufus: generic prompts, text-heavy answers | Ask Bazaar: grounded in the catalog, knows the page and your cart, answers with live product cards and one-tap bundles |

Full reasoning, and what was deliberately cut, is in [PRODUCT.md](PRODUCT.md).

## Stack

- Next.js 16 (App Router, React 19) with Tailwind CSS v4, deployed on Vercel.
- Search results are server-rendered, and every filter is a plain URL, so results can be shared and the back button works.
- All 184 product pages are statically generated. Delivery dates are calculated in the browser, so they never go stale between deploys.
- Accounts, cart, wishlist and orders live in a single zustand store (`src/lib/store.ts`), saved in localStorage. The live link needs no backend or database, and anyone can open it. Moving to a real API only means replacing that one module.
- **Catalog:** [DummyJSON](https://dummyjson.com) products converted to INR by `scripts/build-catalog.mjs`. Images are mirrored and resized by `scripts/fetch-images.mjs`. Rating counts are generated to match each product's average rating.

## Run locally

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local   # optional: enables Ask Bazaar
npm run dev   # http://localhost:3000
```

## Limitations

- Data doesn't sync between devices or browsers, because it's stored in the browser.
- Passwords are hashed in the browser for the demo. That isn't real security.
- There are no real payments, seller marketplace or product Q&A.
