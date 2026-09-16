import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { validateCredentials } from "@/modules/business/business.service";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
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
