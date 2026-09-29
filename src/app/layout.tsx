import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import DeptNav from "@/components/DeptNav";
import Footer from "@/components/Footer";
import AddedDrawer, { Toast } from "@/components/AddedDrawer";
import Assistant, { AskFab } from "@/components/Assistant";
import { departments } from "@/lib/catalog";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Bazaar: shopping without the noise", template: "%s · Bazaar" },
  description: "An amazon.in rebuild: honest prices, no sponsored results, and a checkout with no surprises.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header departments={departments} />
        <DeptNav departments={departments} />
        <main className="flex-1">{children}</main>
        <Footer />
        <AddedDrawer />
        <Assistant />
        <AskFab />
        <Toast />
      </body>
    </html>
  );
}
