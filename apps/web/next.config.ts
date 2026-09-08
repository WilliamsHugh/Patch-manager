import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript is checked explicitly via `npm run lint`. This avoids a
  // Next 16.3 CLI parsing issue in the current execution environment.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
