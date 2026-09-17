import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

/**
 * Serwist injects a webpack plugin for the service worker.
 * Next.js 16 defaults to Turbopack for `next build`; production builds
 * must use `next build --webpack` (see package.json "build" script).
 */
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.GIT_COMMIT?.slice(0, 12) ??
  `${Date.now()}`;

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  reloadOnOnline: true,
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  // Standalone is for Docker prod. Omit on Vercel if ever used there.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["sequelize", "pg", "pg-hstore", "umzug"],
};

export default withSerwist(nextConfig);
