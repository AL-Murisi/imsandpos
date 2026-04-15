export type SubscriptionPlanKey =
  | "TRIAL"
  | "STARTER"
  | "PRO"
  | "ENTERPRISE"
  | "CUSTOM";

export const SUBSCRIPTION_PLAN_DEFS: Record<
  SubscriptionPlanKey,
  {
    label: string;
    days: number | null;
    maxBranches?: number | null;
    maxCashiers?: number | null;
    maxWarehouses?: number | null;
    maxUsers?: number | null;
  }
> = {
  TRIAL: {
    label: "Trial",
    days: 14,
    maxBranches: 1,
    maxCashiers: 1,
    maxWarehouses: 1,
    maxUsers: 2,
  },
  STARTER: {
    label: "Starter",
    days: 30,
    maxBranches: 1,
    maxCashiers: 2,
    maxWarehouses: 1,
    maxUsers: 5,
  },
  PRO: {
    label: "Pro",
    days: 90,
    maxBranches: 3,
    maxCashiers: 5,
    maxWarehouses: 3,
    maxUsers: 15,
  },
  ENTERPRISE: {
    label: "Enterprise",
    days: 365,
    maxBranches: null,
    maxCashiers: null,
    maxWarehouses: null,
    maxUsers: null,
  },
  CUSTOM: {
    label: "Custom",
    days: null,
    maxBranches: null,
    maxCashiers: null,
    maxWarehouses: null,
    maxUsers: null,
  },
};

export function normalizeSubscriptionPlan(
  plan?: string | null,
): SubscriptionPlanKey {
  const normalized = plan?.trim().toUpperCase();
  if (
    normalized === "TRIAL" ||
    normalized === "STARTER" ||
    normalized === "PRO" ||
    normalized === "ENTERPRISE" ||
    normalized === "CUSTOM"
  ) {
    return normalized;
  }
  return "CUSTOM";
}

export function isSubscriptionRecordActive(
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
