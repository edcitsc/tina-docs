import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// Parse a comma-separated allow-list from env. Trim and lowercase for
// case-insensitive comparison. Empty entries are dropped.
const getAllowedEmails = (): string[] =>
  (process.env.TINA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

// We build NextAuthOptions ourselves rather than using TinaAuthJSOptions
// from tinacms-authjs. That helper eagerly imports next-auth/providers/credentials
// which causes issues under Next 15's webpack runtime. Since we only use
// Entra ID, we configure NextAuth directly with the callbacks that
// tinacms-authjs' AuthJsBackendAuthProvider.isAuthorized requires
// (session.user.role === "user").

export const buildAuthOptions = (): NextAuthOptions => ({
  secret: requireEnv("NEXTAUTH_SECRET"),
  session: { strategy: "jwt" },
  providers: [
    AzureADProvider({
      clientId: requireEnv("AZURE_AD_CLIENT_ID"),
      clientSecret: requireEnv("AZURE_AD_CLIENT_SECRET"),
      tenantId: requireEnv("AZURE_AD_TENANT_ID"),
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user?.email?.toLowerCase();
      const claims = profile as { preferred_username?: string; upn?: string } | null | undefined;
      console.log("[tina-auth] signIn attempt:", {
        provider: account?.provider,
        email,
        userPrincipalName: claims?.preferred_username ?? claims?.upn,
      });
      if (!email) return false;
      const allowed = getAllowedEmails();
      const isAllowed = allowed.includes(email);
      console.log("[tina-auth] allow-list decision:", {
        email,
        isAllowed,
        allowedCount: allowed.length,
      });
      return isAllowed;
    },
    async jwt({ token }) {
      // Any user that reaches this point passed signIn, so they're authorized
      // to edit. The Tina backend's isAuthorized check requires role: "user".
      token.role = "user";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = (token.role as string | undefined) ?? "guest";
      }
      return session;
    },
  },
});
