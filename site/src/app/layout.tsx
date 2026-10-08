import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import { BottomNav, TopNav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Ticker } from "@/components/Ticker";
import "./globals.css";

const body = Barlow({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800"], variable: "--font-display-face", display: "swap" });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Rinvalo · Maç tahminleri", template: "%s · Rinvalo" },
  description: "Süper Lig, Premier League, La Liga, Serie A ve Bundesliga maçları için istatistik modeliyle üretilmiş skor ve sonuç tahminleri.",
  openGraph: { siteName: "Rinvalo", locale: "tr_TR", type: "website" },
};

const THEME_SCRIPT = `try{var t=localStorage.getItem("rinvalo:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131a24" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so the page never flashes the other theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <header className="topbar">
          <div className="shell">
            <Link href="/" className="logo" aria-label="Rinvalo ana sayfa">
              {/* eslint-disable @next/next/no-img-element -- small local brand marks, one per theme */}
              <span className="logo-mark">
                <img className="on-light" src="/brand/mark-dark.png" alt="" width={34} height={34} />
                <img className="on-dark" src="/brand/mark-light.png" alt="" width={34} height={34} />
              </span>
              {/* eslint-enable @next/next/no-img-element */}
              <span className="logo-word">RINVALO</span>
            </Link>
            <TopNav />
            <div className="topbar-right">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <Ticker />
        <main>
          <div className="shell">{children}</div>
        </main>
        <footer className="footer">
          <div className="shell">
            <span>Tahminler istatistiksel modele dayanır; kesinlik taşımaz.</span>
          </div>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
