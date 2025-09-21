import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Reduce double-invoked effects in development to improve perceived performance
  reactStrictMode: false,
  // Ignore ESLint errors during production builds to prevent build failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Silence workspace root inference warnings by explicitly setting the root
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
