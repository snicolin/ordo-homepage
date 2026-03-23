import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "online",
        },
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).isAdmin =
          token.isAdmin ?? false;
        (session.user as unknown as Record<string, unknown>).defaultPageSlug =
          token.defaultPageSlug ?? null;
      }
      return session;
    },
  },
};
