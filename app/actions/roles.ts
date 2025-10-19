// "use server";

// import prisma from "@/lib/prisma";
// import {
//   CreateBrandInput,
//   CreateBrandSchema,
//   CreateCategoryInput,
//   CreateCategorySchema,
//   CreateProductInput,
//   CreateProductSchema,
//   CreateRoleInput,
//   CreateRoleSchema,
//   CreateSupplierInput,
//   CreateSupplierSchema,
//   CreateUserSchema,
//   CreateWarehouseSchema,
//   RoleSchema,
//   UpdateInventorySchema,
//   WarehouseInput,
// } from "@/lib/zod";
// import { Prisma } from "@prisma/client";
// import { revalidatePath } from "next/cache";
// import { email, safeParse, z } from "zod";
// import { number } from "zod/v3";

// export async function createRole(input: CreateRoleInput,companyId:string) {
//   const parsed = CreateRoleSchema.safeParse(input);

//   if (!parsed.success) {
//     throw new Error("Invalid role data");
//   }
//   if (!companyId) return;
//   const { name, description, permissions } = parsed.data;

//   try {
//     const role = await prisma.role.create({
//       data: {

//         name,
//         description,
//         permissions,
//       },
//     });
//     return role;
//   } catch (error) {
//     console.error("Failed to create role:", error);
//     throw error;
//   }
// }
// // app/actions/roles.ts (or any server-side file)
// // app/actions/users.ts

// export async function createUser(form: any,companyId:string) {
//   const parsed = CreateUserSchema.safeParse(form);
//   if (!parsed.success) {
//     throw new Error("Invalid user data");
//   }

//   const { email, name, phoneNumber, password, roleId } = parsed.data;

//   try {
//     // ✅ Check if email already exists
//     const existingUser = await prisma.user.findUnique({
//       where: { email },
//     });

//     if (existingUser) {
//       return { error: "هذا البريد الإلكتروني مستخدم بالفعل" };
//     }

//     const user = await prisma.user.create({
//       data: { companyId,email, name, phoneNumber, password },
//     });

//     await prisma.userRole.create({
//       data: {

//         userId: user.id,
//         roleId,
//       },
//     });

//     return { success: true, user };
//   } catch (error) {
//     console.error("Failed to create user:", error);
//     return { error: "فشل في إنشاء المستخدم" };
//   }
// }

// export async function createCategory(form: CreateCategoryInput,companyId:string) {
//   const parsed = CreateCategorySchema.safeParse(form);
//   if (!parsed.success) {
//     throw new Error("Invalid user data");
//   }
//   const { name, description, parentId } = parsed.data;
//   try {
//     const user = await prisma.category.create({
//       data: { companyId,name, description, parentId },
//     });

//     return user;
//   } catch (error) {
//     console.error("Failed to create user:", error);
//     throw error;
//   }
// }
// export async function getAllCategories() {
//   return await prisma.category.findMany({
//     select: { id: true, name: true },
//   });
// }

// export async function createBrand(form: CreateBrandInput) {
//   const parsed = CreateBrandSchema.safeParse(form);
//   if (!parsed.success) {
//     throw new Error("Invalid user data");
//   }
//   const { name, description, website, contactInfo } = parsed.data;
//   try {
//     const user = await prisma.brand.create({
//       data: { name, description, website, contactInfo },
//     });

//     return user;
//   } catch (error) {
//     console.error("Failed to create user:", error);
//     throw error;
//   }
// }
// // Server Action Fix: Convert Decimal objects to numbers

// type DateRange = {
//   from: Date | null;
//   to: Date | null;
// };

// type SortState = {
//   id: string;
//   desc: boolean;
// }[];

// export async function fetchProductforSale() {
//   const products = await prisma.product.findMany({
//     select: {
//       id: true,
//       name: true,
//       sku: true,
//       barcode: true,
//       description: true,
//       categoryId: true,
//       brandId: true,
//       type: true,
//       unitsPerPacket: true,
//       packetsPerCarton: true,

//       pricePerUnit: true,
//       pricePerPacket: true,
//       pricePerCarton: true,
//       wholesalePrice: true,
//       minWholesaleQty: true,
//       weight: true,
//       dimensions: true,

//       warehouseId: true,
//       status: true,
//       isActive: true,
//     },
//     where: {
//       isActive: true,
//     },
//   });
//   // Convert Decimal objects to numbers for client components
//   return products.map((product) => ({
//     ...product,
//     // costPrice: product.costPrice ? Number(product.costPrice) : null,
//     pricePerUnit: product.pricePerUnit ? Number(product.pricePerUnit) : null,
//     pricePerPacket: product.pricePerPacket
//       ? Number(product.pricePerPacket)
//       : null,
//     pricePerCarton: product.pricePerCarton
//       ? Number(product.pricePerCarton)
//       : null,
//     wholesalePrice: product.wholesalePrice
//       ? Number(product.wholesalePrice)
//       : null,
//     weight: product.weight ? Number(product.weight) : null,
//   }));
// }
// // Server Action
// export async function fetchProductBySku(sku: string) {
//   const product = await prisma.product.findFirst({
//     where: {
//       sku,
//     },
//     select: {
//       id: true,
//       name: true,
//       sku: true,
//       barcode: true,
//       description: true,
//       categoryId: true,
//       brandId: true,
//       type: true,
//       unitsPerPacket: true,
//       packetsPerCarton: true,
//       costPrice: true,
//       pricePerUnit: true,
//       pricePerPacket: true,
//       pricePerCarton: true,
//       wholesalePrice: true,
//       minWholesaleQty: true,
//       weight: true,
//       dimensions: true,
//       supplierId: true,
//       warehouseId: true,
//       status: true,
//       isActive: true,
//     },
//   });

//   if (!product) return null; // ✅ handle not found

//   return {
//     ...product,
//     costPrice: product.costPrice ? Number(product.costPrice) : null,
//     pricePerUnit: product.pricePerUnit ? Number(product.pricePerUnit) : null,
//     pricePerPacket: product.pricePerPacket
//       ? Number(product.pricePerPacket)
//       : null,
//     pricePerCarton: product.pricePerCarton
//       ? Number(product.pricePerCarton)
//       : null,
//     wholesalePrice: product.wholesalePrice
//       ? Number(product.wholesalePrice)
//       : null,
//     weight: product.weight ? Number(product.weight) : null,
//   };
// }
// export async function createWarehouse(input: WarehouseInput) {
//   const parsed = CreateWarehouseSchema.safeParse(input);
//   if (!parsed.success) {
//     throw new Error("Invalid warehouse data");
//   }
//   const {
//     name,
//     location,
//     address,
//     city,
//     state,
//     country,
//     postalCode,
//     phoneNumber,
//     email,
//   } = parsed.data;
//   try {
//     const warehouse = await prisma.warehouse.create({
//       data: {
//         name,
//         location,
//         address,
//         city,
//         state,
//         country,
//         postalCode,
//         phoneNumber,
//         email,
//       },
//     });
//     return warehouse;
//   } catch (error) {
//     console.error("Failed to create product:", error);
//     throw error;
//   }
// }
// export async function fetchWarehouse() {
//   return await prisma.warehouse.findMany({
//     select: {
//       id: true,
//       name: true,
//       email: true,
//       phoneNumber: true,
//       address: true,
//       city: true,
//       state: true,
//       country: true,
//       postalCode: true,
//       isActive: true,
//       createdAt: true,
//       updatedAt: true,
//     },
//   });
// }
// export async function CreateProduct(data: CreateProductInput) {
//   const parsed = CreateProductSchema.safeParse(data);
//   if (!parsed.success) {
//     throw new Error("Invalid user data");
//   }

//   const {
//     name,
//     sku,

//     description,
//     categoryId,
//     brandId,
//     type,
//     unitsPerPacket,
//     packetsPerCarton,
//     costPrice,
//     pricePerUnit,
//     pricePerPacket,
//     pricePerCarton,
//     wholesalePrice,
//     minWholesaleQty,

//     dimensions,
//     supplierId,
//     warehouseId,
//   } = parsed.data;

//   try {
//     const product = await prisma.product.create({
//       data: {
//         name,
//         sku,

//         description,
//         categoryId,
//         brandId,
//         type,
//         unitsPerPacket,
//         packetsPerCarton,
//         costPrice,
//         pricePerUnit,
//         pricePerPacket,
//         pricePerCarton,
//         wholesalePrice,
//         minWholesaleQty,

//         dimensions,
//         supplierId,
//         warehouseId,
//       },
//     });

//     // Convert Decimal objects to numbers before returning
//     return {
//       ...product,
//       costPrice: Number(product.costPrice),
//       pricePerUnit: product.pricePerUnit ? Number(product.pricePerUnit) : null,
//       pricePerPacket: Number(product.pricePerPacket),
//       pricePerCarton: Number(product.pricePerCarton),
//       wholesalePrice: Number(product.wholesalePrice),
//       weight: product.weight ? Number(product.weight) : null,
//     };
//   } catch (error) {
//     console.error("Failed to create product:", error);
//     throw error;
//   }
// }
// export async function UpdateProduct(data: CreateProductInput) {
//   const parsed = CreateProductSchema.safeParse(data);
//   if (!parsed.success) {
//     throw new Error("Invalid product data");
//   }

//   const {
//     sku, // required to find product
//     name,

//     description,
//     categoryId,
//     brandId,
//     type,
//     unitsPerPacket,
//     packetsPerCarton,
//     costPrice,
//     pricePerUnit,
//     pricePerPacket,
//     pricePerCarton,
//     wholesalePrice,
//     minWholesaleQty,

//     dimensions,
//     supplierId,
//     warehouseId,
//   } = parsed.data;

//   try {
//     // ✅ Ensure SKU exists before updating
//     const existing = await prisma.product.findUnique({
//       where: { sku },
//     });

//     if (!existing) {
//       throw new Error(`Product with SKU "${sku}" not found`);
//     }

//     const updated = await prisma.product.update({
//       where: { sku },
//       data: {
//         name,

//         description,
//         categoryId,
//         brandId,
//         type,
//         unitsPerPacket,
//         packetsPerCarton,
//         costPrice,
//         pricePerUnit,
//         pricePerPacket,
//         pricePerCarton,
//         wholesalePrice,
//         minWholesaleQty,

//         dimensions,
//         supplierId,
//         warehouseId,
//       },
//     });

//     // ✅ Convert Decimal fields to numbers
//     return {
//       ...updated,
//       costPrice: Number(updated.costPrice),
//       pricePerUnit: updated.pricePerUnit ? Number(updated.pricePerUnit) : null,
//       pricePerPacket: Number(updated.pricePerPacket),
//       pricePerCarton: Number(updated.pricePerCarton),
//       wholesalePrice: Number(updated.wholesalePrice),
//       weight: updated.weight ? Number(updated.weight) : null,
//     };
//   } catch (error) {
//     console.error("❌ Failed to update product:", error);
//     throw error;
//   }
// }

// type FormValues = z.infer<typeof UpdateInventorySchema> & { id: string };

// export async function UpdateInventory(input: FormValues) {
//   const parsed = UpdateInventorySchema.safeParse(input);
//   if (!parsed.success) {
//     throw new Error("Invalid form data.");
//   }

//   const {
//     stockQuantity,
//     reorderLevel,
//     maxStockLevel,
//     status,
//     availableQuantity,
//     reservedQuantity,
//     location,
//     lastStockTake,
//     id,
//   } = input;

//   try {
//     const updatedInventory = await prisma.inventory.update({
//       where: { id },
//       data: {
//         stockQuantity,
//         reorderLevel,
//         maxStockLevel,
//         status,
//         availableQuantity,
//         reservedQuantity,
//         location,
//         lastStockTake: new Date(lastStockTake), // convert to Date object if it's string
//       },
//     });
//     return updatedInventory;
//   } catch (error) {
//     console.error("Failed to update inventory:", error);
//     throw new Error("Inventory update failed");
//   }
// }
// export async function createSupplier(form: CreateSupplierInput) {
//   const parsed = CreateSupplierSchema.safeParse(form);
//   if (!parsed.success) {
//     throw new Error("Invalid user data");
//   }
//   const {
//     name,
//     contactPerson,
//     email,
//     phoneNumber,
//     address,
//     city,
//     state,
//     country,
//     postalCode,
//     taxId,
//     paymentTerms,
//   } = parsed.data;
//   try {
//     const user = await prisma.supplier.create({
//       data: {
//         name,
//         contactPerson,
//         email,
//         phoneNumber,
//         address,
//         city,
//         state,
//         country,
//         postalCode,
//         taxId,
//         paymentTerms,
//       },
//     });
//     revalidatePath("/suppliers");
//     return user;
//   } catch (error) {
//     console.error("Failed to create user:", error);
//     throw error;
//   }
// }
// export async function fetchSuppliers() {
//   return prisma.supplier.findMany({
//     select: {
//       id: true,
//       name: true,
//       contactPerson: true,
//       email: true,
//       phoneNumber: true,
//       address: true,
//       city: true,
//       state: true,
//       country: true,
//       postalCode: true,
//       taxId: true,
//       paymentTerms: true,
//       isActive: true,
//       createdAt: true,
//       updatedAt: true,
//     },
//   });
// }
// export async function fetchCategory() {
//   return prisma.category.findMany({
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       parentId: true,
//       isActive: true,
//     },
//   });
// }
// export async function fetechUser(
//   searchQuery: string,
//   role: any,
//   from?: string,
//   to?: string,
//   page: number = 1,
//   pageSize: number = 5,
// ) {
//   const combinedWhere: any = {
//     // Existing filters (category, warehouse, etc.)
//   };
//   const fromatDate = from ? new Date(from).toISOString() : undefined;
//   const toDate = to ? new Date(to).toISOString() : undefined;
//   if (searchQuery) {
//     combinedWhere.OR = [
//       { name: { contains: searchQuery, mode: "insensitive" } },

//       { phoneNumber: { contains: searchQuery, mode: "insensitive" } },
//     ];
//   }
//   if (role) {
//     combinedWhere.roles = {
//       some: {
//         role: {
//           id: {
//             equals: role, // or contains: role for partial match
//             mode: "insensitive",
//           },
//         },
//       },
//     };
//   }

//   if (fromatDate || toDate) {
//     combinedWhere.createdAt = {
//       ...(fromatDate && {
//         gte: fromatDate,
//       }),
//       ...(toDate && {
//         lte: toDate,
//       }),
//     };
//   }
//   const data = await prisma.user.findMany({
//     select: {
//       id: true,
//       name: true,
//       email: true,
//       phoneNumber: true,
//       isActive: true,
//       roles: {
//         select: {
//           role: {
//             select: {
//               name: true,
//             },
//           },
//         },
//       },
//     },
//     where: combinedWhere,
//     skip: page * pageSize,
//     take: pageSize,
//   });

//   return data;
// }
// // app/actions/roles.ts

// // Schema to validate an array of roles
// const RoleListSchema = z.array(RoleSchema);

// export async function fetchRoles(
//   page: number = 0, // 0-indexed page number
//   pageSize: number = 7,
// ) {
//   const roles = await prisma.role.findMany({
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       permissions: true,
//       createdAt: true,
//       updatedAt: true,
//     },

//     skip: page * pageSize,
//     take: pageSize,
//   });

//   return roles; // ✅ Fully typed & validated
// } // Add these server actions to your existing roles.ts file

// // }
// // export async function fetchProduct() {
// //   return prisma.product.findMany({
// //     select: {
// //       id: true,
// //       name: true,
// //       sku: true,
// //       barcode: true,
// //       description: true,
// //       categoryId: true,
// //       brandId: true,
// //       type: true,
// //       unitsPerPacket: true,
// //       packetsPerCarton: true,
// //       costPrice: true,
// //       pricePerUnit: true,

// //       pricePerPacket: true,
// //       pricePerCarton: true,
// //       wholesalePrice: true,
// //       minWholesaleQty: true,
// //       weight: true,
// //       dimensions: true,
// //       supplierId: true,
// //       warehouseId: true,
// //       status: true,
// //       isActive: true,
// //     },
// //     where: {
// //       isActive: true,
// //     },
// //   });
// // }

// export async function fetchInvontery() {
//   return await prisma.inventory.findMany({
//     select: {
//       id: true,
//       product: {
//         select: {
//           name: true,
//           sku: true,
//         },
//       },
//       productId: true,
//       warehouse: {
//         select: {
//           name: true,
//           location: true,
//         },
//       },
//       warehouseId: true,

//       // Stock quantities
//       stockQuantity: true,
//       reservedQuantity: true,
//       availableQuantity: true,
//       reorderLevel: true,
//       maxStockLevel: true,

//       // Location in warehouse
//       location: true,

//       // Status
//       status: true,

//       lastStockTake: true,
//       createdAt: true,
//       updatedAt: true,
//     },
//   });
// }
// export async function fetchRolesForSelect() {
//   return prisma.role.findMany({
//     select: {
//       id: true,
//       name: true,
//     },
//     orderBy: {
//       name: "asc",
//     },
//   });
// }
// export async function fetchWarehousesForSelect() {
//   return await prisma.warehouse.findMany({
//     select: {
//       id: true,
//       name: true,
//     },
//     where: {
//       isActive: true, // assuming you have an isActive field
//     },
//     orderBy: {
//       name: "asc",
//     },
//   });
// }

// export async function fetchCategoriesForSelect() {
//   return prisma.category.findMany({
//     select: {
//       id: true,
//       name: true,
//     },
//     where: {
//       isActive: true, // assuming you have an isActive field
//     },
//     orderBy: {
//       name: "asc",
//     },
//   });
// }
// export async function fetchSuppliersForSelect() {
//   return prisma.supplier.findMany({
//     select: {
//       id: true,
//       name: true,
//     },
//     where: {
//       isActive: true, // assuming you have an isActive field
//     },
//     orderBy: {
//       name: "asc",
//     },
//   });
// }
// export async function fetchBrandsForSelect() {
//   return prisma.brand.findMany({
//     select: {
//       id: true,
//       name: true,
//     },
//     where: {
//       isActive: true, // assuming you have an isActive field
//     },
//     orderBy: {
//       name: "asc",
//     },
//   });
// }
// // If you need to fetch all the form data at once for better performance
// export async function fetchAllFormData() {
//   try {
//     const [warehouses, categories, brands, suppliers] = await Promise.all([
//       prisma.warehouse.findMany({
//         select: { id: true, name: true },
//         where: { isActive: true },
//         orderBy: { name: "asc" },
//       }),
//       prisma.category.findMany({
//         select: { id: true, name: true },
//         where: { isActive: true },
//         orderBy: { name: "asc" },
//       }),
//       prisma.brand.findMany({
//         select: { id: true, name: true },
//         where: { isActive: true },
//         orderBy: { name: "asc" },
//       }),
//       prisma.supplier.findMany({
//         select: { id: true, name: true },
//         where: { isActive: true },
//         orderBy: { name: "asc" },
//       }),
//     ]);

//     return {
//       warehouses,
//       categories,
//       brands,
//       suppliers,
//     };
//   } catch (error) {
//     console.error("Error fetching form data:", error);
//     throw new Error("Failed to fetch form data");
//   }
// }
"use server";

import prisma from "@/lib/prisma";
import {
  CreateBrandInput,
  CreateBrandSchema,
  CreateCategoryInput,
  CreateCategorySchema,
  CreateProductInput,
  CreateProductSchema,
  CreateRoleInput,
  CreateRoleSchema,
  CreateSupplierInput,
  CreateSupplierSchema,
  CreateUserSchema,
  CreateWarehouseSchema,
  RoleSchema,
  UpdateInventorySchema,
  WarehouseInput,
} from "@/lib/zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { email, safeParse, z } from "zod";
import { number } from "zod/v3";
export async function fetchProduct(
  companyId: string,
  searchQuery: string = "",
  where: Prisma.ProductWhereInput = {},
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 7,
  sort: SortState = [],
) {
  // Allow caching (no-store → no-cache)
  // This ensures bfcache can work
  const cacheOption: RequestCache = "no-cache"; // instead of "no-store"

  const combinedWhere: Prisma.ProductWhereInput = { ...where, companyId };

  const fromDate = from ? new Date(from).toISOString() : undefined;
  const toDate = to ? new Date(to).toISOString() : undefined;

  if (searchQuery) {
    combinedWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { sku: { contains: searchQuery, mode: "insensitive" } },
      { barcode: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  if (fromDate || toDate) {
    combinedWhere.createdAt = {
      ...(fromDate && { gte: fromDate }),
      ...(toDate && { lte: toDate }),
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = sort.map((s) => ({
    [s.id]: s.desc ? "desc" : "asc",
  }));

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        description: true,
        categoryId: true,
        brandId: true,
        type: true,
        unitsPerPacket: true,
        packetsPerCarton: true,
        costPrice: true,
        pricePerUnit: true,
        pricePerPacket: true,
        pricePerCarton: true,
        wholesalePrice: true,
        minWholesaleQty: true,
        weight: true,
        dimensions: true,
        supplierId: true,
        warehouseId: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
      where: combinedWhere,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
      skip: page * pageSize,
      take: pageSize,
    });

    const formattedProducts = products.map((product) => ({
      ...product,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      pricePerUnit: product.pricePerUnit ? Number(product.pricePerUnit) : null,
      pricePerPacket: product.pricePerPacket
        ? Number(product.pricePerPacket)
        : null,
      pricePerCarton: product.pricePerCarton
        ? Number(product.pricePerCarton)
        : null,
      wholesalePrice: product.wholesalePrice
        ? Number(product.wholesalePrice)
        : null,
      weight: product.weight ? Number(product.weight) : null,
    }));

    return {
      products: formattedProducts,
      totalCount: formattedProducts.length,
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [], totalCount: 0 };
  }
}
export async function createRole(input: CreateRoleInput) {
  const parsed = CreateRoleSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid role data");
  }
  const { name, description, permissions } = parsed.data;

  try {
    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions,
      },
    });
    return role;
  } catch (error) {
    console.error("Failed to create role:", error);
    throw error;
  }
}
// app/actions/roles.ts (or any server-side file)
// app/actions/users.ts

export async function createUser(form: any, companyId: string) {
  const parsed = CreateUserSchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  const { email, name, phoneNumber, password, roleId } = parsed.data;

  try {
    // ✅ Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "هذا البريد الإلكتروني مستخدم بالفعل" };
    }

    const user = await prisma.user.create({
      data: { companyId, email, name, phoneNumber, password },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId,
      },
    });

    return { success: true, user };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { error: "فشل في إنشاء المستخدم" };
  }
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
export async function getAllCategories() {
  return await prisma.category.findMany({
    select: { id: true, name: true },
  });
}

export async function createBrand(form: CreateBrandInput, companyId: string) {
  const parsed = CreateBrandSchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }
  const { name, description, website, contactInfo } = parsed.data;
  try {
    const user = await prisma.brand.create({
      data: { companyId, name, description, website, contactInfo },
    });

    return user;
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
}
// Server Action Fix: Convert Decimal objects to numbers

type DateRange = {
  from: Date | null;
  to: Date | null;
};

type SortState = {
  id: string;
  desc: boolean;
}[];

export async function fetchProductBySku(sku: string) {
  const product = await prisma.product.findFirst({
    where: {
      sku,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      description: true,
      categoryId: true,
      brandId: true,
      type: true,
      unitsPerPacket: true,
      packetsPerCarton: true,
      costPrice: true,
      pricePerUnit: true,
      pricePerPacket: true,
      pricePerCarton: true,
      wholesalePrice: true,
      minWholesaleQty: true,
      weight: true,
      dimensions: true,
      supplierId: true,
      warehouseId: true,
      status: true,
      isActive: true,
    },
  });

  if (!product) return null; // ✅ handle not found

  return {
    ...product,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    pricePerUnit: product.pricePerUnit ? Number(product.pricePerUnit) : null,
    pricePerPacket: product.pricePerPacket
      ? Number(product.pricePerPacket)
      : null,
    pricePerCarton: product.pricePerCarton
      ? Number(product.pricePerCarton)
      : null,
    wholesalePrice: product.wholesalePrice
      ? Number(product.wholesalePrice)
      : null,
    weight: product.weight ? Number(product.weight) : null,
  };
}
export async function createWarehouse(
  input: WarehouseInput,
  companyId: string,
) {
  const parsed = CreateWarehouseSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid warehouse data");
  }
  const {
    name,
    location,
    address,
    city,
    state,
    country,
    postalCode,
    phoneNumber,
    email,
  } = parsed.data;
  try {
    const warehouse = await prisma.warehouse.create({
      data: {
        companyId,
        name,
        location,
        address,
        city,
        state,
        country,
        postalCode,
        phoneNumber,
        email,
      },
    });
    revalidatePath("warehouses");
    revalidatePath("/products");
    return warehouse;
  } catch (error) {
    console.error("Failed to create product:", error);
    throw error;
  }
}
export async function fetchWarehouse(companyId: string) {
  return await prisma.warehouse.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function UpdateProduct(
  data: CreateProductInput,
  companyId: string,
) {
  const parsed = CreateProductSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid product data");
  }

  const {
    sku, // required to find product
    name,

    description,
    categoryId,
    brandId,
    type,
    unitsPerPacket,
    packetsPerCarton,
    costPrice,
    pricePerUnit,
    pricePerPacket,
    pricePerCarton,
    wholesalePrice,
    minWholesaleQty,

    dimensions,
    supplierId,
    warehouseId,
  } = parsed.data;

  try {
    // ✅ Ensure SKU exists before updating

    const updated = await prisma.product.update({
      where: {
        // 💡 FIX: Use the compound unique key defined by @@unique([companyId, sku])
        companyId_sku: {
          companyId: companyId, // <-- Provide the company ID
          sku: sku, // <-- Provide the SKU to search for
        },
      },
      data: {
        name,

        description,
        categoryId,
        brandId,
        type,
        unitsPerPacket,
        packetsPerCarton,
        costPrice,
        pricePerUnit,
        pricePerPacket,
        pricePerCarton,
        wholesalePrice,
        minWholesaleQty,

        dimensions,
        supplierId,
        warehouseId,
      },
    });
    revalidatePath("/products");
    // ✅ Convert Decimal fields to numbers
    return {
      ...updated,
      costPrice: Number(updated.costPrice),
      pricePerUnit: updated.pricePerUnit ? Number(updated.pricePerUnit) : null,
      pricePerPacket: Number(updated.pricePerPacket),
      pricePerCarton: Number(updated.pricePerCarton),
      wholesalePrice: Number(updated.wholesalePrice),
      weight: updated.weight ? Number(updated.weight) : null,
    };
  } catch (error) {
    console.error("❌ Failed to update product:", error);
    throw error;
  }
}

type FormValues = z.infer<typeof UpdateInventorySchema> & { id: string };
function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as T;
  }

  const plainObj: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Prisma.Decimal) {
      plainObj[key] = value.toNumber(); // or value.toString() if you prefer
    } else if (value instanceof Date) {
      plainObj[key] = value.toISOString();
    } else if (typeof value === "bigint") {
      plainObj[key] = value.toString();
    } else if (typeof value === "object" && value !== null) {
      plainObj[key] = serializeData(value);
    } else {
      plainObj[key] = value;
    }
  }

  return plainObj;
}
export async function createSupplier(
  form: CreateSupplierInput,
  companyId: string,
) {
  const parsed = CreateSupplierSchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }
  const {
    name,
    contactPerson,
    email,
    phoneNumber,
    address,
    city,
    state,
    country,
    postalCode,
    taxId,
    paymentTerms,
  } = parsed.data;
  try {
    const user = await prisma.supplier.create({
      data: {
        name,
        companyId,
        contactPerson,
        email,
        phoneNumber,
        address,
        city,
        state,
        country,
        postalCode,
        taxId,
        paymentTerms,
      },
    });
    revalidatePath("/suppliers");
    revalidatePath("/products");
    const users = serializeData(user);
    return users;
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
}

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
export async function fetechUser(
  companyId: string,
  searchQuery: string,
  role: any,
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 5,
) {
  const combinedWhere: any = {
    companyId, // Existing filters (category, warehouse, etc.)
  };
  const fromatDate = from ? new Date(from).toISOString() : undefined;
  const toDate = to ? new Date(to).toISOString() : undefined;
  if (searchQuery) {
    combinedWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },

      { phoneNumber: { contains: searchQuery, mode: "insensitive" } },
    ];
  }
  if (role) {
    combinedWhere.roles = {
      some: {
        role: {
          id: {
            equals: role, // or contains: role for partial match
            mode: "insensitive",
          },
        },
      },
    };
  }

  if (fromatDate || toDate) {
    combinedWhere.createdAt = {
      ...(fromatDate && {
        gte: fromatDate,
      }),
      ...(toDate && {
        lte: toDate,
      }),
    };
  }
  const data = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      isActive: true,
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
    where: combinedWhere,
    skip: page * pageSize,
    take: pageSize,
  });

  return data;
}
// app/actions/roles.ts

// Schema to validate an array of roles
const RoleListSchema = z.array(RoleSchema);

export async function fetchRoles(
  page: number = 0, // 0-indexed page number
  pageSize: number = 7,
) {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },

    skip: page * pageSize,
    take: pageSize,
  });

  return roles; // ✅ Fully typed & validated
}

export async function fetchRolesForSelect() {
  return prisma.role.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function fetchAllFormData(companyId: string) {
  try {
    const [warehouses, categories, brands, suppliers] = await Promise.all([
      prisma.warehouse.findMany({
        select: { id: true, name: true },
        where: { isActive: true, companyId },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        select: { id: true, name: true },
        where: { isActive: true, companyId },
        orderBy: { name: "asc" },
      }),
      prisma.brand.findMany({
        select: { id: true, name: true },
        where: { isActive: true, companyId },
        orderBy: { name: "asc" },
      }),
      prisma.supplier.findMany({
        select: { id: true, name: true },
        where: { isActive: true, companyId },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      warehouses,
      categories,
      brands,
      suppliers,
    };
  } catch (error) {
    console.error("Error fetching form data:", error);
    throw new Error("Failed to fetch form data");
  }
}
