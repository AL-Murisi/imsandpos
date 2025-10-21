"use server";
import prisma from "@/lib/prisma";
import { CreateCategoryInput, CreateCategorySchema } from "@/lib/zod";
import { revalidatePath } from "next/cache";

export async function fetchCategory(companyId: string) {
  return prisma.category.findMany({
    where: { companyId: companyId },
    select: {
      id: true,
      name: true,
      description: true,
      parentId: true,
      isActive: true,
    },
  });
}
export async function createCategory(
  form: CreateCategoryInput,
  companyId: string,
) {
  const parsed = CreateCategorySchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }
  const { name, description, parentId } = parsed.data;
  try {
    const user = await prisma.category.create({
      data: { companyId, name, description, parentId },
    });
    revalidatePath("/products");
    revalidatePath("/categories");
    return user;
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
}
