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

async function getCategoryDependencyCounts(id: string) {
  const [productCount, childCategoryCount] = await Promise.all([
    prisma.product.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } }),
  ]);

  return {
    productCount,
    childCategoryCount,
    total: productCount + childCategoryCount,
  };
}

// Delete category
export async function deleteCategory(id: string) {
  const dependencies = await getCategoryDependencyCounts(id);

  if (dependencies.total > 0) {
    const blocks: string[] = [];

    if (dependencies.productCount > 0) {
      blocks.push(`${dependencies.productCount} منتج`);
    }
    if (dependencies.childCategoryCount > 0) {
      blocks.push(`${dependencies.childCategoryCount} فئة فرعية`);
    }

    return {
      success: false,
      error: `لا يمكن حذف الفئة لأنها مرتبطة بـ ${blocks.join(" و ")}. احذف أو انقل هذه العناصر أولاً.`,
    };
  }

  const category = await prisma.category.delete({ where: { id } });

  revalidatePath("/products");
  revalidatePath("/categories");
  return { success: true, category };
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
