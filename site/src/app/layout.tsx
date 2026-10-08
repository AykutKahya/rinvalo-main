import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { BottomNav, TopNav } from "@/components/Nav";
import { Ticker } from "@/components/Ticker";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin", "latin-ext"], variable: "--font-figtree", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], weight: ["500", "700"], variable: "--font-mono", display: "swap" });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Rinvalo · Maç tahminleri", template: "%s · Rinvalo" },
  description: "Süper Lig, Premier League, La Liga, Serie A ve Bundesliga maçları için istatistik modeliyle üretilmiş skor ve sonuç tahminleri.",
  openGraph: { siteName: "Rinvalo", locale: "tr_TR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131a24" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${figtree.variable} ${mono.variable}`}>
      <body>
        <header className="topbar">
          <div className="shell">
            <Link href="/" className="logo" aria-label="Rinvalo ana sayfa">
              <span className="logo-mark" aria-hidden="true" />
              rinvalo
            </Link>
            <TopNav />
          </div>
        </header>
        <Ticker />
        <main>
          <div className="shell">{children}</div>
        </main>
        <footer className="footer">
          <div className="shell">
            <span>Rinvalo tahminleri istatistik modelinden üretilir; kesin sonuç değildir.</span>
            <span>
              <Link href="/nasil">Model nasıl çalışıyor?</Link>
            </span>
          </div>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
