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
    "/en/match/[id]/my-pick/[pick]": ["./data/*.json"],
    "/og/[lang]/[id]": ["./data/*.json", "./assets/fonts/*", "./public/crests/*"],
    "/live.json": ["./data/*.json"],
  },
  async redirects() {
    return [{ source: "/basari", destination: "/analiz/basari", permanent: true }];
  },
};

export default nextConfig;
