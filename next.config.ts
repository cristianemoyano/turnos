import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is for Docker prod. Omit on Vercel if ever used there.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["sequelize", "pg", "pg-hstore", "umzug"],
};

export default nextConfig;
