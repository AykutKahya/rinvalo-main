"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Maçlar", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/ligler", label: "Ligler", icon: "M5 4h14v4a7 7 0 0 1-14 0zM9 20h6M12 15v5" },
  { href: "/basari", label: "Başarı", icon: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
];

function active(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/mac/");
  if (href === "/ligler") return path.startsWith("/ligler") || path.startsWith("/lig/") || path.startsWith("/takim/");
  return path.startsWith(href);
}

export function TopNav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Ana menü">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(path, l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
      <Link href="/manset" className="manset-link" aria-current={path === "/manset" ? "page" : undefined}>
        Manşet
      </Link>
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  const all = [...LINKS.slice(0, 2), { href: "/manset", label: "Manşet", icon: "M4 5h12v14H6a2 2 0 0 1-2-2zM16 9h4v8a2 2 0 0 1-4 0M7 9h6M7 13h6" }, LINKS[2]];
  return (
    <nav className="bottombar" aria-label="Alt menü">
      {all.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(path, l.href) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={l.icon} />
          </svg>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
