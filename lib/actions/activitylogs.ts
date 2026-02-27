"use server";
import prisma from "@/lib/prisma";
import { SortingState } from "@tanstack/react-table";
import { getSession } from "../session";

export async function logActivity(
  userId: string,
  companyid: string,
  action: string,
  details?: string,
  ip?: string,
  userAgent?: string,
) {
  await prisma.activityLogs.create({
    data: {
      companyId: companyid,
      userId: userId,
      action,
      details,
      ip,
      userAgent,
    },
  });
}

export async function getActivityLogs(
  companyId: string,
  page: number = 0, // 0-indexed page number
  pageSize: number = 7,
  sort?: SortingState,
) {
  const [total, logs] = await Promise.all([
    prisma.activityLogs.count({ where: { companyId } }),
    prisma.activityLogs.findMany({
      where: { companyId },
      select: {
        id: true,
        action: true,
        details: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            roles: {
              select: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: page * pageSize,
      take: pageSize,
    }),
  ]);
  return { logs, total };
}
export async function getUsers() {
  const user = await getSession();
  if (!user) return;
  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    select: {
      id: true,
      name: true,
    },
  });
  return users;
}
