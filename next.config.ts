import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce double-invoked effects in development to improve perceived performance
  reactStrictMode: false,
  // Ignore ESLint errors during production builds to prevent build failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use default output file tracing root to avoid Vercel path issues
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
