import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// Next.js 16 static analysis requires a named `proxy` VariableDeclaration
// (or a FunctionDeclaration). Destructuring `export const { auth: proxy }`
// and bare `export default auth` both fail that check.
export const proxy = auth;

export const config = {
  // Skip auth on static assets, SW, and the web app manifest so install/PWA works.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw\\.js|swe-worker|manifest\\.webmanifest|~offline).*)",
  ],
};
