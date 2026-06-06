import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { pool } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import type { UserRole } from "@/db/schema/auth";

const ROLES_REQUIRING_2FA: UserRole[] = ["STAFF", "ADMIN"];

function is2faRequired(role: string): boolean {
  return ROLES_REQUIRING_2FA.includes(role as UserRole);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    // ── Google OAuth (CUSTOMER only) ──────────────────────────────
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),

    // ── Password (all roles) ───────────────────────────────────────
    Credentials({
      id: "credentials",
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const result = await pool.query(
          `SELECT id, email, name, role, password_hash, totp_enabled
           FROM "user" WHERE email = $1`,
          [email],
        );

        if (result.rows.length === 0) return null;
        if (!result.rows[0].password_hash) return null;

        const user = result.rows[0];

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          totpEnabled: user.totp_enabled,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth: only allow CUSTOMER role
      if (account?.provider === "google") {
        if (user.role === "ADMIN" || user.role === "STAFF") {
          return "/auth/error?error=OAuthNotAllowed";
        }
        if (!user.role || user.role === "CUSTOMER") return true;
        return "/auth/error?error=AccessDenied";
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role: string }).role ?? "CUSTOMER";
        token.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false;
        token.email = user.email ?? "";
        if (is2faRequired(token.role as string) && token.totpEnabled) {
          token.needsTotp = true;
        }
      }
      if (trigger === "update" && session) {
        if (session.totpVerified === true) token.needsTotp = false;
      }
      return token;
    },

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
