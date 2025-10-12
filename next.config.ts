import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Reduce double-invoked effects in development to improve perceived performance
  reactStrictMode: false,
  // Ignore ESLint errors during production builds to prevent build failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Force the workspace root to this project directory to avoid Next selecting
  // another lockfile higher up (which can break module resolution in dev).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
