import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Node.js imports (no Sequelize, no pg, no bcryptjs).
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/r/") ||
        pathname.startsWith("/confirmar/") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/public") ||
        pathname.startsWith("/api/v1/signup") ||
        pathname.startsWith("/api/health");
      return isPublic || !!auth?.user;
    },
  },
  providers: [],
};
