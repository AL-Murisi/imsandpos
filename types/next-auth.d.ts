import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      userId: string;
      companyId: string;
      role?: string;
      isActive?: boolean;
      companyActive?: boolean;
      subscriptionActive?: boolean;
      subscriptionEndsAt?: string | null;
      expiresAt?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    companyId?: string;
    role?: string;
    userActive?: boolean;
    companyActive?: boolean;
    subscriptionActive?: boolean;
    subscriptionEndsAt?: string | Date | null;
    expiresAt?: string | null;
  }
}
