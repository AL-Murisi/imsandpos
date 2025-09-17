"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updateUsers(isActive: boolean, id: string) {
  const updateUsers = await prisma.user.update({
    where: { id },
    data: {
      isActive,
    },
  });
  revalidatePath("/users");
  return updateUsers;
}
