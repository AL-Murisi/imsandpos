import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import prisma from "@/lib/prisma";

const googleClientId =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

const providers = [
  ...(googleClientId && googleClientSecret
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : []),
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");

      if (!email || !password) return null;

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          companyId: true,
          roles: { include: { role: true } },
        },
      });

      if (!user || !user.password || user.password !== password) {
        return null;
      }

      const roles = user.roles.map((r) => r.role.name);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: user.companyId,
        roles,
        userId: user.id,
      } as any;
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? process.env.ENCRYPTION_SECRET,
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          return "/signup"; // redirect if Google user not registered
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).userId ?? user.id;
        token.companyId = (user as any).companyId;
        token.roles = (user as any).roles ?? [];
      }

      const email =
        typeof token.email === "string" ? token.email.trim().toLowerCase() : "";

      if (email) {
        const appUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            companyId: true,
            roles: { include: { role: true } },
          },
        });

        if (!appUser) {
          token.roles = [];
          return token;
        }

        token.userId = appUser.id;
        token.companyId = appUser.companyId;
        token.roles = appUser.roles.map((r) => r.role.name);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).userId = token.userId;
        (session.user as any).companyId = token.companyId;
        (session.user as any).roles = token.roles ?? [];
      }
      return session;
    },
  },
});
