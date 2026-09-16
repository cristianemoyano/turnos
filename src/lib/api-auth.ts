import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type AuthedContext = { businessId: string; userId: string };

/**
 * Every authenticated API route needs the caller's business_id scoped
 * server-side from the session — never trust a business/org id from the
 * request body or query string.
 */
export async function requireBusiness(): Promise<
  { ctx: AuthedContext } | { error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.businessId) {
    return { error: NextResponse.json({ error: "No autenticado", code: "UNAUTHENTICATED" }, { status: 401 }) };
  }
  return { ctx: { businessId: session.user.businessId, userId: session.user.id } };
}
