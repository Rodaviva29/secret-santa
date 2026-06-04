import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker (copies only needed deps).
  output: "standalone",
  // Keep native / Node-only packages out of the webpack bundle. Notably
  // better-auth statically pulls in @better-auth/kysely-adapter which
  // breaks when webpack tries to resolve kysely's internal exports.
  serverExternalPackages: [
    "better-auth",
    "@better-auth/kysely-adapter",
    "kysely",
    "pg",
  ],
};

export default nextConfig;
