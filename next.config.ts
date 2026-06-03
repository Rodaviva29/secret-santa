import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / Node-only packages out of the webpack bundle. Notably
  // better-auth statically pulls in @better-auth/kysely-adapter which
  // breaks when webpack tries to resolve kysely's internal exports.
  serverExternalPackages: [
    "better-sqlite3",
    "better-auth",
    "@better-auth/kysely-adapter",
    "kysely",
  ],
};

export default nextConfig;
