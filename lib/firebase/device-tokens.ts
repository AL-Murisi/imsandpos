import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type PushDeviceTokenRecord = {
  id: string;
  token: string;
  company_id: string;
  userId: string | null;
  role: string | null;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
};

function buildRecipientFilter(
  companyId: string,
  targetUserIds: string[],
  targetRoles: string[],
) {
  const conditions: Prisma.Sql[] = [Prisma.sql`"company_id" = ${companyId}`];

  if (targetUserIds.length > 0 && targetRoles.length > 0) {
    conditions.push(
      Prisma.sql`("userId" IN (${Prisma.join(targetUserIds)}) OR "role" IN (${Prisma.join(targetRoles)}))`,
    );
  } else if (targetUserIds.length > 0) {
    conditions.push(Prisma.sql`"userId" IN (${Prisma.join(targetUserIds)})`);
  } else if (targetRoles.length > 0) {
    conditions.push(Prisma.sql`"role" IN (${Prisma.join(targetRoles)})`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export async function findPushDeviceTokens(
  companyId: string,
  targetUserIds: string[],
  targetRoles: string[],
) {
  const whereClause = buildRecipientFilter(companyId, targetUserIds, targetRoles);

  return prisma.$queryRaw<PushDeviceTokenRecord[]>(Prisma.sql`
    SELECT
      "id",
      "token",
      "company_id",
      "userId",
      "role",
      "provider",
      "createdAt",
      "updatedAt"
    FROM "pushDeviceToken"
    ${whereClause}
  `);
}

export async function upsertPushDeviceToken(params: {
  token: string;
  companyId: string;
  userId: string;
  role: string | null;
  provider?: string;
}) {
  const {
    token,
    companyId,
    userId,
    role,
    provider = "fcm",
  } = params;

  const id = randomUUID();

  const rows = await prisma.$queryRaw<PushDeviceTokenRecord[]>(Prisma.sql`
    INSERT INTO "pushDeviceToken" (
      "id",
      "token",
      "company_id",
      "userId",
      "role",
      "provider",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${token},
      ${companyId},
      ${userId},
      ${role},
      ${provider},
      NOW(),
      NOW()
    )
    ON CONFLICT ("token")
    DO UPDATE SET
      "company_id" = EXCLUDED."company_id",
      "userId" = EXCLUDED."userId",
      "role" = EXCLUDED."role",
      "provider" = EXCLUDED."provider",
      "updatedAt" = NOW()
    RETURNING
      "id",
      "token",
      "company_id",
      "userId",
      "role",
      "provider",
      "createdAt",
      "updatedAt"
  `);

  return rows[0] ?? null;
}

export async function deletePushDeviceTokensByTokens(tokens: string[]) {
  if (tokens.length === 0) {
    return 0;
  }

  const deleted = await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "pushDeviceToken"
    WHERE "token" IN (${Prisma.join(tokens)})
  `);

  return deleted;
}

export async function deletePushDeviceTokenByUserAndToken(
  userId: string,
  token: string,
) {
  return prisma.$executeRaw(Prisma.sql`
    DELETE FROM "pushDeviceToken"
    WHERE "userId" = ${userId} AND "token" = ${token}
  `);
}
