# Bazaar: an Amazon.in rebuild

This is a rebuild of amazon.in's core shopping loop: find, decide, buy, track. Amazon was the reference, but where its design serves Amazon more than the shopper, Bazaar does something different.

## Recon: what I saw on amazon.in

Screenshots are in [`recon/`](recon/). They were taken signed in (Siliguri 734002) during the Great Indian Festival run-up. An automated look at search and help pages failed because amazon.in returns a bot challenge, so those notes come from using the site directly.

| # | Screen | What works | What gets in the way |
|---|---|---|---|
| 01 | Home | "Buy it again" and "Inspired by your recent history" are genuinely useful. | Six promo tiles and an autoplaying video ad come first. Bank-offer badges appear on every tile. "Keep shopping for" is shown twice. A Sponsored tile sits among the personal rows. |
| 02 | Product | The buy box is clear: delivery date, stock, Add to cart / Buy now. | A sponsored banner sits above the breadcrumb. The price appears twice, next to a "-30%" off an M.R.P. The offers row is a sideways-scrolling carousel of bank terms. "Only 2 left" scarcity. A cart panel takes about 10% of the page width on every screen. |
| 03 | Added to cart | You get clear confirmation. | Adding an item opens a whole new page. Most of it is a sponsored carousel ("Page 1 of 4"), and it takes another click to get to the cart. |
| 05 | Cart | Quantity stepper, save for later, a delivery date per item, and a free-delivery progress bar. | A gift checkbox on every item, an EMI accordion, a cross-sell column, and "Deselect all" checkboxes. |
| 04 | Checkout | Everything is on one page. | The cart said ₹7,365. Checkout says ₹7,370, because a ₹5 "Marketplace Fee" only appears here. Line items show "--" until you pick a payment method. Cash on Delivery is greyed out at the very last step ("cart value exceeds your available limit"). |
| 06 | Menu | | The drawer opens with Echo, Fire TV, Kindle and Prime Video (Amazon's own services). The shopping categories are below the fold. |

## What Bazaar changes

1. **No surprises in the total.** Every fee (delivery, and the platform fee Amazon adds only at checkout) is shown in the cart, and the total never changes between cart and checkout. Search results show the price including delivery.
2. **No sponsored placements.** Products are ranked by relevance, rating and delivery speed. Nothing is paid to appear.
3. **Honest prices and stock.** There's one price per product, with the discount shown as a saving in rupees. Stock is shown as a plain count, without red urgency text.
4. **Adding to cart doesn't send you anywhere.** A small drawer confirms the item and shows the cart total, and you keep browsing.
5. **Payment rules are shown upfront.** Whether Cash on Delivery is available, and why not, appears in the cart before checkout. The order total is visible before you choose how to pay.
6. **Shopping comes first.** The home page opens with your history (continue browsing, buy again) and the categories, not banners. The menu lists only shopping categories.
7. **Deciding is easier.** A rating breakdown, recent reviews, and a side-by-side comparison with similar items.
8. **After you buy:** orders with a tracking timeline, cancel before it ships, a return within the window, and buy-again in one click.
9. **Price history that answers "should I buy now?"** Amazon.in shows a "Price history" pill (screenshot 02) that sends you somewhere else. Bazaar leads with a verdict: "Lowest price in 90 days", "₹X below its 90-day average", or "Higher than usual, it dropped to ₹X on 21 Jul". A chip next to the price shows the verdict, and a 90-day chart backs it up, with the low and today's price labelled, a hover tooltip and a table view. The catalog has no real history, so it's simulated, deterministic for each product, always ends at the real current price, and is labelled as simulated on the page. Ask Bazaar can read it too ("Is now a good time to buy?").
10. **Ask Bazaar, an assistant that answers from the catalog instead of improvising, at zero running cost.** Amazon's Rufus offers generic prompts (it suggested "Best games to play with a 5-year old" on a home page showing supplements and clogs) and answers mostly in text. Ask Bazaar:
   - **Grounded:** every product it mentions is a live card with price, delivery date and Add to cart. It can't invent a product, because it only ever reads the catalog.
   - **Knows the page:** on a product page it answers "Is this worth it compared to similar ones?", "What do reviewers say?", "Can I return it?" and "Is now a good time to buy?" about that product. In the cart it answers "How do I get free delivery?" (with small add-ons that close the gap), "Which item arrives last?", "Can I pay cash on delivery?" and "Anything cheaper that does the same job?". The suggested questions change with the page.
   - **Acts, with you in control:** "Stock my kitchen for ₹3,000" builds a varied set within budget with one "Add all to cart" button. Searches link to the full filtered results. Nothing is added until you click.
   - **Understands shopping language:** budgets ("under 10k", "between ₹500 and ₹2,000"), deadlines ("by Friday", "tomorrow"), who it's for ("for my dad"), ranking ("best", "cheapest", "deals") and follow-ups ("which one is cheapest?").
   - **Why no LLM by default:** the questions shoppers actually ask here are about budget, category, delivery, returns and price, and the catalog answers all of them. A built-in engine does this instantly, for free, and can't hallucinate. So the public demo runs it with no API key and no cost. A Claude-powered path (tool use over the same catalog) is in the code and switches on only if an `ANTHROPIC_API_KEY` is configured.

## Deliberately cut

These parts of amazon.in are left out, to spend the time on the shopping loop:
- Prime Video, Music, Alexa, Kindle, Fire TV, Hotel Booking and Amazon Pay
- Seller Central, the "Other sellers" marketplace and seller ratings
- Bank offer carousels, EMI calculators and coupons
- Gift options, language switcher, gift cards

## Build notes

- Next.js 16 (App Router) with Tailwind v4, deployed on Vercel.
- **Catalog:** 170+ products from DummyJSON (with their images, ratings and reviews), converted to INR. It's fixed data that ships with the app.
- **Accounts, cart, lists and orders are stored in the browser (localStorage).** That keeps the live link working for any visitor with no backend to run, and a one-click demo account is provided. The trade-off: data doesn't sync between devices. All reads and writes go through one store (`src/lib/store.ts`), so a real API can replace it without changing the pages.
- Payments are simulated. No card details are ever collected.
- **Ask Bazaar** runs by default on a built-in engine (`src/lib/localAssistant.ts`). It detects the intent and filters in the question and answers from the catalog, with no API and no cost. The optional Claude path (`src/lib/assistant.ts`) uses a tool loop over `search_products` and `get_product_details`, and only runs when `ANTHROPIC_API_KEY` is set. Both stream the same events to the same UI (`src/app/api/assistant/route.ts`).
