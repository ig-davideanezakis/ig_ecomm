import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import type { UserRole } from "@/db/schema/auth";

// ─── Helper: roles that require 2FA ───────────────────────────────

const ROLES_REQUIRING_2FA: UserRole[] = ["STAFF", "ADMIN"];

function is2faRequired(role: string): boolean {
  return ROLES_REQUIRING_2FA.includes(role as UserRole);
}

// ─── NextAuth configuration ───────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Resend({
      from: "onboarding@resend.dev",
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    // If 2FA is pending, NextAuth will redirect here after signIn callback
    // returns a URL. We handle it at the middleware level instead.
  },
  callbacks: {
    /**
     * signIn — runs after the provider verifies the user.
     * If the user requires 2FA, we DON'T block the sign-in here.
     * Instead we let the session be created, and intercept at the
     * jwt/middleware level to enforce 2FA verification.
     */
    async signIn({}) {
      // Always allow sign-in. 2FA enforcement happens in jwt + middleware.
      return true;
    },

    /**
     * jwt — called whenever a JWT is created or updated.
     * We inject the user's role and 2FA status into the token.
     * If 2FA is required AND not yet verified this session, we
     * add a `needsTotp: true` flag so the middleware can redirect.
     */
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, user object is available
      if (user) {
        token.userId = user.id;
        token.role = (user as { role: string }).role;
        token.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false;
        token.email = user.email ?? "";

        // If 2FA is required, mark as pending
        if (is2faRequired(token.role as string) && token.totpEnabled) {
          token.needsTotp = true;
        }
      }

      // On session update (e.g., after 2FA verification via API)
      if (trigger === "update" && session) {
        if (session.totpVerified === true) {
          token.needsTotp = false;
        }
      }

      return token;
    },

    /**
     * session — maps the JWT to the session object sent to the client.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = (token.role as string) ?? "CUSTOMER";
        session.user.totpEnabled = (token.totpEnabled as boolean) ?? false;
        session.user.needsTotp = (token.needsTotp as boolean) ?? false;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});
