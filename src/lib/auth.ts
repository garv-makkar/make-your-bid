import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/signin' },
  providers: [
    ...(googleEnabled ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google') return (profile as { email_verified?: boolean })?.email_verified === true;
      return false;
    },
    async jwt({ token, account, user }) {
      if (account && user) token.ownerId = `${account.provider}:${account.providerAccountId || user.id}`;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.ownerId as string;
      return session;
    },
  },
};
