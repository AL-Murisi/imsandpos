"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

type LimitResource = "branches" | "cashiers" | "warehouses" | "users";

type ResourceUsage = {
  limit: number | null;
  used: number;
  remaining: number | null;
  atLimit: boolean;
};

type SubscriptionUsage = {
  subscription: Awaited<ReturnType<typeof getCompanySubscriptionInfo>>;
  branches: ResourceUsage;
  cashiers: ResourceUsage;
  warehouses: ResourceUsage;
  users: ResourceUsage;
};

function buildUsage(
  limit: number | null | undefined,
  used: number,
): ResourceUsage {
  const normalizedLimit = typeof limit === "number" ? limit : null;

  return {
    limit: normalizedLimit,
    used,
    remaining:
      normalizedLimit === null ? null : Math.max(normalizedLimit - used, 0),
    atLimit: normalizedLimit !== null && used >= normalizedLimit,
  };
}

export async function getCompanySubscriptionInfo() {
  const session = await getSession();
  if (!session) return null;

  const subscription = await prisma.subscription.findFirst({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
  });

  return subscription;
}

export async function getCompanySubscriptionUsage(): Promise<SubscriptionUsage | null> {
  const session = await getSession();
  if (!session) return null;

  return getCompanySubscriptionUsageByCompanyId(session.companyId);
}

export async function getCompanySubscriptionUsageByCompanyId(
  companyId: string,
): Promise<SubscriptionUsage> {
  const [subscription, branchCount, cashierCount, warehouseCount, userCount] =
    await Promise.all([
      prisma.subscription.findFirst({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.points_of_sale.count({
        where: { company_id: companyId },
      }),
      prisma.user.count({
        where: {
          companyId,
          roles: {
            some: {
              role: {
                name: "cashier",
              },
            },
          },
        },
      }),
      prisma.warehouse.count({
        where: { companyId },
      }),
      prisma.user.count({
        where: { companyId },
      }),
    ]);

  return {
    subscription,
    branches: buildUsage(subscription?.maxBranches, branchCount),
    cashiers: buildUsage(subscription?.maxCashiers, cashierCount),
    warehouses: buildUsage(subscription?.maxWarehouses, warehouseCount),
    users: buildUsage(subscription?.maxUsers, userCount),
  };
}

export async function canCreateSubscriptionResource(
  companyId: string,
  resource: LimitResource,
) {
  const usage = await getCompanySubscriptionUsageByCompanyId(companyId);
  const resourceUsage = usage[resource];

  return {
    allowed: !resourceUsage.atLimit,
    usage: resourceUsage,
    subscription: usage.subscription,
  };
}

export async function renewSubscription(days: number = 30) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const isAdmin = (session.roles ?? []).some((r) =>
    r.toLowerCase().includes("admin"),
  );
  if (!isAdmin) {
    return { success: false, error: "Forbidden" };
  }

  const latest = await prisma.subscription.findFirst({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const baseDate =
    latest?.endsAt && latest.endsAt.getTime() > now.getTime()
      ? latest.endsAt
      : now;
  const newEndsAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  if (!latest) {
    const created = await prisma.subscription.create({
      data: {
        companyId: session.companyId,
        plan: "CUSTOM",
        status: "ACTIVE",
        startsAt: now,
        endsAt: newEndsAt,
        isActive: true,
      },
    });
    return { success: true, subscription: created };
  }

  const updated = await prisma.subscription.update({
    where: { id: latest.id },
    data: {
      status: "ACTIVE",
      isActive: true,
      endsAt: newEndsAt,
    },
  });

  return { success: true, subscription: updated };
}

const PLAN_DEFS: Record<
  string,
  {
    days: number;
    maxBranches?: number;
    maxCashiers?: number;
    maxWarehouses?: number;
    maxUsers?: number;
  }
> = {
  TRIAL: {
    days: 7,
    maxBranches: 1,
    maxCashiers: 1,
    maxWarehouses: 1,
    maxUsers: 2,
  },
  BASIC: {
    days: 30,
    maxBranches: 1,
    maxCashiers: 2,
    maxWarehouses: 1,
    maxUsers: 5,
  },
  ADVANCE: {
    days: 90,
    maxBranches: 3,
    maxCashiers: 5,
    maxWarehouses: 3,
    maxUsers: 15,
  },
  PRO: {
    days: 180,
    maxBranches: 10,
    maxCashiers: 20,
    maxWarehouses: 10,
    maxUsers: 50,
  },
};

export async function setSubscriptionPlan(plan: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const isAdmin = (session.roles ?? []).some((r) =>
    r.toLowerCase().includes("admin"),
  );
  if (!isAdmin) {
    return { success: false, error: "Forbidden" };
  }

  const key = plan.trim().toUpperCase();
  const def = PLAN_DEFS[key];
  if (!def) {
    return { success: false, error: "Invalid plan" };
  }

  const now = new Date();
  const latest = await prisma.subscription.findFirst({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
  });

  const baseDate =
    latest?.endsAt && latest.endsAt.getTime() > now.getTime()
      ? latest.endsAt
      : now;
  const newEndsAt = new Date(
    baseDate.getTime() + def.days * 24 * 60 * 60 * 1000,
  );

  if (!latest) {
    const created = await prisma.subscription.create({
      data: {
        companyId: session.companyId,
        plan: key,
        status: "ACTIVE",
        startsAt: now,
        endsAt: newEndsAt,
        isActive: true,
        maxBranches: def.maxBranches,
        maxCashiers: def.maxCashiers,
        maxWarehouses: def.maxWarehouses,
        maxUsers: def.maxUsers,
      },
    });
    return { success: true, subscription: created };
  }

  const updated = await prisma.subscription.update({
    where: { id: latest.id },
    data: {
      plan: key,
      status: "ACTIVE",
      isActive: true,
      endsAt: newEndsAt,
      maxBranches: def.maxBranches,
      maxCashiers: def.maxCashiers,
      maxWarehouses: def.maxWarehouses,
      maxUsers: def.maxUsers,
    },
  });
  revalidatePath("/subscription");
  return { success: true, subscription: updated };
}
