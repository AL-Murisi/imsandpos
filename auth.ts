import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import prisma from "@/lib/prisma";

function normalizeRole(role?: string | null) {
  const normalized = role?.trim().toLowerCase();
  return normalized ? [normalized] : [];
}

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
          role: true,
          isActive: true,
          companyId: true,
          company: { select: { isActive: true } },
          userInvites: {
            where: { usedAt: null, expiresAt: { gt: new Date() } },
            select: { id: true },
          },
        },
      });

      if (
        !user ||
        !user.password ||
        user.password !== password ||
        !user.isActive ||
        !user.company?.isActive ||
        user.userInvites.length > 0
      ) {
        return null;
      }

      const subscription = await ensureTrialSubscription(user.companyId);
      const subscriptionEndsAt = subscription?.endsAt ?? null;
      const subscriptionActive = isSubscriptionActive(subscription);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: user.companyId,
        role: user.role,
        userId: user.id,
        isActive: user.isActive,
        companyActive: user.company?.isActive ?? false,
        subscriptionActive,
        subscriptionEndsAt,
      } as any;
    },
  }),
];

function isSubscriptionActive(
  subscription: {
    isActive: boolean;
    status: string;
    endsAt: Date | null;
  } | null,
) {
  if (!subscription) return false;
  if (!subscription.isActive) return false;
  if (subscription.status !== "ACTIVE") return false;
  if (subscription.endsAt && subscription.endsAt.getTime() < Date.now()) {
    return false;
  }
  return true;
}

async function ensureTrialSubscription(companyId: string) {
  const existing = await prisma.subscription.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  return await prisma.subscription.create({
    data: {
      companyId,
      plan: "TRIAL",
      status: "ACTIVE",
      startsAt,
      endsAt,
      isActive: true,
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.ENCRYPTION_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials") {
        const email =
          typeof user?.email === "string"
            ? user.email.trim().toLowerCase()
            : "";
        if (!email) return false;

        const appUser = await prisma.user.findUnique({
          where: { email },
          select: {
            isActive: true,
            company: { select: { isActive: true } },
            companyId: true,
            userInvites: {
              where: { usedAt: null, expiresAt: { gt: new Date() } },
              select: { id: true },
            },
          },
        });

        if (
          !appUser ||
          !appUser.isActive ||
          !appUser.company?.isActive ||
          appUser.userInvites.length > 0
        ) {
          return false;
        }
        await ensureTrialSubscription(appUser.companyId);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).userId ?? user.id;
        token.companyId = (user as any).companyId;
        token.role = (user as any).role ?? "";
        token.userActive =
          typeof (user as any).isActive === "boolean"
            ? (user as any).isActive
            : true;
        token.companyActive =
          typeof (user as any).companyActive === "boolean"
            ? (user as any).companyActive
            : true;
        token.subscriptionActive =
          typeof (user as any).subscriptionActive === "boolean"
            ? (user as any).subscriptionActive
            : true;
        token.subscriptionEndsAt = (user as any).subscriptionEndsAt ?? null;
        token.expiresAt =
          typeof token.exp === "number"
            ? new Date(token.exp * 1000).toISOString()
            : null;
      }

      if (
        token.userId &&
        token.companyId &&
        typeof token.role === "string" &&
        token.role.trim().length > 0
      ) {
        return token;
      }

      const email =
        typeof token.email === "string" ? token.email.trim().toLowerCase() : "";
      if (email) {
        try {
          const appUser = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              companyId: true,
              role: true,
              isActive: true,
              company: { select: { isActive: true } },
            },
          });

          if (appUser) {
            token.userId = appUser.id;
            token.companyId = appUser.companyId;
            token.userActive = appUser.isActive;
            token.companyActive = appUser.company?.isActive ?? false;
            token.role = appUser.role ?? "";
            const subscription = await ensureTrialSubscription(
              appUser.companyId,
            );
            token.subscriptionActive = isSubscriptionActive(subscription);
            token.subscriptionEndsAt = subscription?.endsAt ?? null;
            token.expiresAt =
              typeof token.exp === "number"
                ? new Date(token.exp * 1000).toISOString()
                : null;
          }
        } catch (error) {
          return token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).userId = token.userId;
        (session.user as any).companyId = token.companyId;
        (session.user as any).role = token.role ?? "";
        (session.user as any).isActive = token.userActive ?? true;
        (session.user as any).companyActive = token.companyActive ?? true;
        (session.user as any).subscriptionActive =
          token.subscriptionActive ?? true;
        (session.user as any).subscriptionEndsAt =
          token.subscriptionEndsAt ?? null;
        (session.user as any).expiresAt = token.expiresAt ?? null;
      }
      return session;
    },
  },
});
