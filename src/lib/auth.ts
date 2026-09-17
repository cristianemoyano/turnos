import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { validateCredentials } from "@/modules/business/business.service";
import { isCapServerConfigured, verifyCapToken } from "@/lib/cap-verify";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  capToken: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, capToken: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        if (isCapServerConfigured()) {
          const capOk = await verifyCapToken(parsed.data.capToken ?? "");
          if (!capOk) {
            console.warn("[auth] login blocked: invalid cap token", parsed.data.email);
            return null;
          }
        }

        const result = await validateCredentials(parsed.data.email, parsed.data.password);
        if (!result) return null;
        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          businessId: result.business.id,
          businessName: result.business.name,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      const t = token as typeof token & { businessId: string; businessName: string };
      if (user) {
        t.businessId = user.businessId;
        t.businessName = user.businessName;
      }
      return t;
    },
    session: async ({ session, token }) => {
      const t = token as typeof token & { businessId: string; businessName: string };
      if (session.user) {
        session.user.id = token.sub!;
        session.user.businessId = t.businessId;
        session.user.businessName = t.businessName;
      }
      return session;
    },
  },
});
