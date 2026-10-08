import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import { BottomNav, LangSwitch, TopNav } from "@/components/Nav";
import { Search } from "@/components/Search";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Ticker } from "@/components/Ticker";
import { dict, paths, type Lang } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
import "../app/globals.css";

const body = Barlow({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800"], variable: "--font-display-face", display: "swap" });

export function shellMetadata(lang: Lang): Metadata {
  const t = dict(lang);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.siteTitle, template: "%s · Rinvalo" },
    description: t.siteDescription,
    openGraph: { siteName: "Rinvalo", locale: t.ogLocale, type: "website" },
  };
}

export const shellViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131a24" },
  ],
};

const THEME_SCRIPT = `try{var t=localStorage.getItem("rinvalo:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/** The page frame shared by both languages: header, ticker, footer and mobile tab bar. */
export function Shell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const t = dict(lang);
  return (
    <html lang={lang} className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so the page never flashes the other theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <header className="topbar">
          <div className="shell">
            <Link href={paths(lang).home} className="logo" aria-label={t.nav.home}>
              {/* eslint-disable @next/next/no-img-element -- small local brand marks, one per theme */}
              <span className="logo-mark">
                <img className="on-light" src="/brand/mark-dark.png" alt="" width={34} height={34} />
                <img className="on-dark" src="/brand/mark-light.png" alt="" width={34} height={34} />
              </span>
              {/* eslint-enable @next/next/no-img-element */}
              <span className="logo-word">RINVALO</span>
            </Link>
            <TopNav lang={lang} />
            <div className="topbar-right">
              <Search lang={lang} />
              <LangSwitch lang={lang} />
              <ThemeToggle lang={lang} />
            </div>
          </div>
        </header>
        <Ticker lang={lang} />
        <main>
          <div className="shell">{children}</div>
        </main>
        <footer className="footer">
          <div className="shell">
            <span>{t.footer}</span>
            <Link href={paths(lang).myPicks}>{t.myPicks.title}</Link>
          </div>
        </footer>
        <BottomNav lang={lang} />
      </body>
    </html>
  );
}
