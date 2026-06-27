import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // Skip prerendering for the SPA — all rendering happens client-side via React Router
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
