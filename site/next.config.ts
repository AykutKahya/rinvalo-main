import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The bot rewrites data/*.json and every push rebuilds the site, so pages can be static.
  poweredByHeader: false,
  // Two root layouts (Turkish and /en), so unmatched URLs need a global 404 page.
  experimental: { globalNotFound: true },
  async redirects() {
    return [{ source: "/basari", destination: "/analiz/basari", permanent: true }];
  },
};

export default nextConfig;
