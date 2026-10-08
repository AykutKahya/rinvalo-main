import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The bot rewrites data/*.json and every push rebuilds the site, so pages can be static.
  poweredByHeader: false,
};

export default nextConfig;
