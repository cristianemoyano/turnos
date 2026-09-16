import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      businessId: string;
      businessName: string;
    } & DefaultSession["user"];
  }
  interface User {
    businessId: string;
    businessName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    businessId: string;
    businessName: string;
  }
}
