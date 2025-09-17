import prisma from "@/lib/prisma";
import { SortingState } from "@tanstack/react-table";

export async function logActivity(
  userId: string,
  action: string,
  details?: string,
  ip?: string,
  userAgent?: string
) {
  await prisma.activityLogs.create({
    data: {
      userId,
      action,
      details,
      ip,
      userAgent,
    },
  });
}

export async function getActivityLogs(
  page: number = 0, // 0-indexed page number
  pageSize: number = 7,
  sort?: SortingState
) {
  const logs = await prisma.activityLogs.findMany({
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
    skip: page * pageSize,
    take: pageSize,
  });
  return logs;
}
