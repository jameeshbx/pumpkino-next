import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth configuration (no Prisma imports) — shared by the
 * middleware instance and the full server instance.
 *
 * Session strategy: JWT. Cookies are HTTP-only + SameSite=Lax, and marked
 * Secure in production (NextAuth default when the URL is https / production).
 */
export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8h absolute session lifetime
    updateAge: 60 * 60, // refresh the JWT at most hourly on activity
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.accountId = user.accountId;
        token.accountType = user.accountType;
        token.roles = user.roles;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.accountId = token.accountId;
      session.user.accountType = token.accountType;
      session.user.roles = token.roles ?? [];
      return session;
    },
  },
  providers: [], // credentials provider is added in auth.ts (needs Node runtime)
} satisfies NextAuthConfig;
