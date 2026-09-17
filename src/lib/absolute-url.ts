/**
 * Absolute URL for push payloads and notification deep links.
 * Prefer `NEXT_PUBLIC_BASE_URL`, then `AUTH_URL`, then localhost:3100.
 */
export function absoluteUrl(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3100"
  ).replace(/\/$/, "");
  if (!path) return base;
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
