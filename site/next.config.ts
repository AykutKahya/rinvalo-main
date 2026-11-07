import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The bot uploads data/*.json to Supabase Storage and triggers a deploy; scripts/pull-data.mjs fetches
  // it before the build, so pages can be static.
  poweredByHeader: false,
  // Two root layouts (Turkish and /en), so unmatched URLs need a global 404 page.
  experimental: { globalNotFound: true },
  // Share images, live scores and pages rendered on first visit read these files at runtime.
  outputFileTracingIncludes: {
    "/mac/[id]": ["./data/*.json"],
    "/takim/[slug]": ["./data/*.json"],
    "/en/match/[id]": ["./data/*.json"],
    "/en/team/[slug]": ["./data/*.json"],
    "/mac/[id]/tahminim/[pick]": ["./data/*.json"],
    "/lig/[code]/hafta/[round]": ["./data/*.json"],
    "/en/league/[code]/round/[round]": ["./data/*.json"],
    "/og/week/[lang]/[code]/[round]": ["./data/*.json", "./assets/fonts/*", "./public/crests/*", "./public/leagues/*"],
    "/en/match/[id]/my-pick/[pick]": ["./data/*.json"],
    "/og/day/[lang]/[date]": ["./data/*.json", "./assets/fonts/*", "./public/crests/*", "./public/leagues/*", "./public/nations/*"],
    "/og/[lang]/[id]": ["./data/*.json", "./assets/fonts/*", "./public/crests/*"],
    "/live.json": ["./data/*.json"],
  },
  async headers() {
    const supabase = "https://cmwfmjbygorsjjopngky.supabase.co";
    // Next's own inline scripts need 'unsafe-inline'; everything else may come only from here and Supabase.
    const csp = [
      "default-src 'self'",
      // Dev mode needs eval for React's debugging tools; production never does.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${supabase}`,
      "font-src 'self'",
      `connect-src 'self' ${supabase} wss://cmwfmjbygorsjjopngky.supabase.co`,
      "worker-src 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Logos rarely change: a week in the browser, then refreshed in the background.
      {
        source: "/:dir(crests|leagues|nations)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
  async redirects() {
    return [{ source: "/basari", destination: "/analiz/basari", permanent: true }];
  },
};

export default nextConfig;
