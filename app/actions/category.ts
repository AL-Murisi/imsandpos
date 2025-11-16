"use server";

import prisma from "@/lib/prisma";
import { CreateCategoryInput, CreateCategorySchema } from "@/lib/zod";
import { revalidatePath } from "next/cache";

// Fetch categories
export async function fetchCategory(companyId: string) {
  return prisma.category.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      description: true,
      parentId: true,
      isActive: true,
    },
  });
}

// Create category
export async function createCategory(
  form: CreateCategoryInput,
  companyId: string,
) {
  const parsed = CreateCategorySchema.safeParse(form);
  if (!parsed.success) throw new Error("Invalid data");

  const { name, description, parentId } = parsed.data;
  const category = await prisma.category.create({
    data: { companyId, name, description, parentId },
  });

  revalidatePath("/products");
  revalidatePath("/categories");
  return category;
}

// Update category
export async function updateCategory(
  id: string,
  companyId: string,
  form: CreateCategoryInput,
) {
  const parsed = CreateCategorySchema.safeParse(form);
  if (!parsed.success) throw new Error("Invalid data");

  const { name, description, parentId } = parsed.data;
  const category = await prisma.category.update({
    where: { id, companyId },
    data: { name, description, parentId },
  });

  revalidatePath("/products");
  revalidatePath("/categories");
  return category;
}

// Delete category
export async function deleteCategory(id: string) {
  const category = await prisma.category.delete({ where: { id } });

  revalidatePath("/products");
  revalidatePath("/categories");
  return category;
}

// Toggle activate/deactivate
export async function toggleCategoryActive(id: string, isActive: boolean) {
  const category = await prisma.category.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/products");
  revalidatePath("/categories");
  return category;
}
