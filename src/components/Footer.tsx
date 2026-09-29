import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-ink text-sm text-white/70">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-xl font-extrabold text-white">
            bazaar<span className="text-marigold">.</span>
          </p>
          <p className="mt-2 max-w-xs">
            The price you see is the price you pay. No sponsored results, no fees that show up at the last step.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-white">Your stuff</p>
          <Link href="/orders" className="hover:text-white">Orders & returns</Link>
          <Link href="/lists" className="hover:text-white">Wishlist</Link>
          <Link href="/cart" className="hover:text-white">Cart</Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-white">About this project</p>
          <p>An amazon.in rebuild for the 8x assignment. Payments are simulated, and your data stays in this browser.</p>
          <a href="https://github.com/Ayushkhatidev/amazonclone" className="hover:text-white">Source on GitHub</a>
        </div>
      </div>
    </footer>
  );
}
