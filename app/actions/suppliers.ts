// ============================================
// 1. FETCH PURCHASES BY SUPPLIER
"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath, unstable_noStore } from "next/cache";
import { CreateSupplierInput, CreateSupplierSchema } from "@/lib/zod";
import { cache } from "react";
import { getSession } from "@/lib/session";
function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as T;
  }

  const plainObj: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Prisma.Decimal) {
      plainObj[key] = Number(value);
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
async function getUserCompany() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { companyId: true },
  });

  if (!user) throw new Error("User not found");
  return { userId: session.userId, companyId: user.companyId };
}
export async function updateSupplier(
  supplierId: string,

  data: Partial<
    Omit<
      {
        name: string;
        contactPerson: string;
        email: string;
        phoneNumber: string;
        address: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        taxId?: string;
        paymentTerms?: string;
        isActive?: boolean;
      },
      "companyId"
    >
  >,
) {
  try {
    const { companyId } = await getUserCompany();

    // 🔹 Verify supplier belongs to the same company
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!existingSupplier || existingSupplier.companyId !== companyId) {
      return { success: false, error: "المورد غير موجود أو غير مصرح له" };
    }

    // 🔹 Check if email already exists for another supplier
    if (data.email) {
      const emailExists = await prisma.supplier.findFirst({
        where: {
          email: data.email,
          companyId: companyId,
          NOT: { id: supplierId },
        },
      });

      if (emailExists) {
        return { success: false, error: "البريد الإلكتروني مستخدم بالفعل" };
      }
    }

    // 🔹 Update supplier
    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: data.name ?? existingSupplier.name,
        contactPerson: data.contactPerson ?? existingSupplier.contactPerson,
        email: data.email ?? existingSupplier.email,
        phoneNumber: data.phoneNumber ?? existingSupplier.phoneNumber,
        address: data.address ?? existingSupplier.address,
        city: data.city ?? existingSupplier.city,
        state: data.state ?? existingSupplier.state,
        country: data.country ?? existingSupplier.country,
        postalCode: data.postalCode ?? existingSupplier.postalCode,
        taxId: data.taxId ?? existingSupplier.taxId,
        paymentTerms: data.paymentTerms ?? existingSupplier.paymentTerms,
        isActive: data.isActive ?? existingSupplier.isActive,
      },
    });

    // 🔹 Revalidate suppliers list
    revalidatePath("/suppliers");
    revalidatePath("/admin");

    return { success: true, data: updatedSupplier };
  } catch (error) {
    console.error("❌ Error updating supplier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث المورد",
    };
  }
}
export async function slow(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const fetchSuppliers = cache(async (companyId: string) => {
  await slow(1000);
  const total = await prisma.supplier.count({
    where: { companyId: companyId },
  });
  const supplier = await prisma.supplier.findMany({
    where: { companyId: companyId },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      email: true,
      phoneNumber: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      taxId: true,
      paymentTerms: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      totalPaid: true,
      totalPurchased: true,
      outstandingBalance: true,
    },
  });
  const serialized = serializeData(supplier);

  return { data: serialized, total };
});
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
    totalPaid,
    totalPurchased,
    outstandingBalance,
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
        totalPaid,
        totalPurchased,
        outstandingBalance,
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

// ============================================
export const getPurchasesByCompany = cache(
  async (
    companyId: string,
    {
      productQuery,
      where,
      from,
      to,
      pageIndex = 0,
      pageSize = 13,
      parsedSort,
    }: {
      productQuery?: string;
      where?: string;
      from?: string;
      to?: string;
      pageIndex?: number;
      pageSize?: number;
      parsedSort?: { id: string; desc: boolean }[];
    } = {},
  ) => {
    try {
      const filters: any = { companyId };

      // Status filter
      if (where && where !== "all") {
        filters.status = where;
      }

      // Date range filter
      if (from || to) {
        filters.createdAt = {};
        if (from) filters.createdAt.gte = new Date(from);
        if (to) filters.createdAt.lte = new Date(to);
      }

      // Product name/SKU filter
      if (productQuery) {
        const items = await prisma.purchaseItem.findMany({
          where: {
            companyId,
            product: {
              OR: [
                { name: { contains: productQuery, mode: "insensitive" } },
                { sku: { contains: productQuery, mode: "insensitive" } },
              ],
            },
          },
          select: { purchaseId: true },
          distinct: ["purchaseId"],
        });

        const purchaseIds = items.map((i) => i.purchaseId);
        if (purchaseIds.length === 0) return { data: [], total: 0 };
        filters.id = { in: purchaseIds };
      }

      // Count total
      const total = await prisma.purchase.count({ where: filters });

      // Sorting

      await slow(1000);

      // Fetch data
      const purchases = await prisma.purchase.findMany({
        where: filters,
        include: {
          purchaseItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  costPrice: true,
                  unitsPerPacket: true,
                  type: true,
                  packetsPerCarton: true,
                },
              },
            },
          },
          supplier: { select: { id: true, name: true } },
        },

        skip: pageIndex * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      });
      const serialized = serializeData(purchases);
      console.log(serialized);
      return { data: serialized, total };
    } catch (error) {
      console.error("Error fetching company purchases:", error);
      throw error;
    }
  },
);

export const getSupplierPaymentsByCompany = cache(
  async (
    companyId: string,
    {
      from,
      to,
      pageIndex = 0,
      pageSize = 13,
      parsedSort,
    }: {
      from?: string;
      to?: string;
      pageIndex?: number;
      pageSize?: number;
      parsedSort?: { id: string; desc: boolean }[];
    } = {},
  ) => {
    try {
      const filters: any = { companyId };

      // Date range
      if (from || to) {
        filters.paymentDate = {};
        if (from) filters.paymentDate.gte = new Date(from);
        if (to) filters.paymentDate.lte = new Date(to);
      }

      // Count total
      const total = await prisma.supplierPayment.count({ where: filters });

      // Sort

      // Fetch

      await slow(1000);
      const payments = await prisma.supplierPayment.findMany({
        where: filters,
        include: {
          supplier: { select: { id: true, name: true } },
          company: true,
        },

        skip: pageIndex * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      });
      const serialized = serializeData(payments);
      return { data: serialized, total };
    } catch (error) {
      console.error("Error fetching company payments:", error);
      throw error;
    }
  },
);

export async function updateSupplierPayment(
  paymentId: string,
  data: {
    amount?: number;
    paymentMethod?: string;
    note?: string;
    paymentDate?: Date;
  },
  userId: string,
  companyId: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current payment
      const currentPayment = await tx.supplierPayment.findUnique({
        where: { id: paymentId },
        include: { supplier: true },
      });

      if (!currentPayment) throw new Error("Payment not found");
      if (currentPayment.companyId !== companyId)
        throw new Error("Unauthorized");

      let purchaseUpdate = null;
      let amountDifference = 0;

      // 2. Amount changed?
      if (data.amount && data.amount !== Number(currentPayment.amount)) {
        amountDifference = data.amount - Number(currentPayment.amount);

        const purchases = await tx.purchase.findMany({
          where: {
            companyId,
            supplierId: currentPayment.supplierId,
            status: { in: ["pending", "partial"] },
          },
        });

        if (purchases.length > 0) {
          const latestPurchase = purchases[purchases.length - 1];
          const newAmountPaid =
            Number(latestPurchase.amountPaid) + amountDifference;
          const newAmountDue = Math.max(
            0,
            Number(latestPurchase.totalAmount) - newAmountPaid,
          );

          purchaseUpdate = await tx.purchase.update({
            where: { id: latestPurchase.id },
            data: {
              amountPaid: Math.max(0, newAmountPaid),
              amountDue: newAmountDue,
              status:
                newAmountDue <= 0
                  ? "paid"
                  : newAmountPaid > 0
                    ? "partial"
                    : "pending",
            },
          });
        }

        // --- 3. UPDATE SUPPLIER TOTALS ---
        await tx.supplier.update({
          where: { id: currentPayment.supplierId, companyId },
          data: {
            totalPaid: {
              set: Math.max(
                0,
                Number(currentPayment.supplier.totalPaid) + amountDifference,
              ),
            },
            outstandingBalance: {
              increment: -amountDifference, // paying reduces balance
            },
          },
        });
      }

      // 4. Update payment
      const updatedPayment = await tx.supplierPayment.update({
        where: { id: paymentId },
        data: {
          ...(data.amount && { amount: data.amount }),
          ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
          ...(data.note && { note: data.note }),
          ...(data.paymentDate && { paymentDate: data.paymentDate }),
        },
        include: { supplier: true },
      });

      // 5. Log
      await tx.activityLogs.create({
        data: {
          userId,
          companyId,
          action: "updated supplier payment",
          details: `Payment updated for ${currentPayment.supplier.name}: ${updatedPayment.amount}`,
        },
      });

      revalidatePath("/suppliers");

      return {
        success: true,
        payment: updatedPayment,
        purchaseUpdate,
      };
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
}
export async function createSupplierPaymentFromPurchases(
  userId: string,
  companyId: string,
  data: {
    status: string;
    createdBy: string;
    supplierId: string;
    purchaseId: string;
    amount: number;
    paymentMethod: string;
    note?: string;
    paymentDate?: Date;
  },
) {
  try {
    const {
      status,
      purchaseId,
      createdBy,
      supplierId,
      amount,
      paymentMethod,
      note,
      paymentDate,
    } = data;

    // Validation
    if (!supplierId || !amount || amount <= 0 || !purchaseId) {
      throw new Error(
        "Supplier ID, Purchase ID, and valid amount are required",
      );
    }

    // Get supplier
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) throw new Error("Supplier not found");

    // Get specific purchase with current payment status
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplierPayments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!purchase) throw new Error("Purchase not found");

    // ✅ Calculate amounts correctly
    const totalAmount = Number(purchase.totalAmount);
    const currentAmountPaid = Number(purchase.amountPaid);
    const currentAmountDue = Number(purchase.amountDue);

    // Calculate new amounts
    const newAmountPaid = currentAmountPaid + amount;
    const newAmountDue = Math.max(0, currentAmountDue - amount);

    // Determine new status
    let newStatus: string;
    if (newAmountDue === 0) {
      newStatus = "paid";
    } else if (newAmountPaid > 0) {
      newStatus = "partial";
    } else {
      newStatus = "pending";
    }

    // Check if payment exceeds amount due
    if (amount > currentAmountDue) {
      throw new Error(
        `Payment amount (${amount}) exceeds amount due (${currentAmountDue})`,
      );
    }

    console.log("💰 Payment Calculation:", {
      purchaseId: purchase.id,
      totalAmount,
      currentAmountPaid,
      currentAmountDue,
      newPayment: amount,
      newAmountPaid,
      newAmountDue,
      newStatus,
    });

    // ✅ Transaction with proper sequencing
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Create supplier payment record first
        const supplierPayment = await tx.supplierPayment.create({
          data: {
            companyId,
            supplierId,
            purchaseId, // ✅ Link to purchase
            amount,
            paymentMethod,
            note,
            createdBy,
            paymentDate: paymentDate ?? new Date(),
          },
          include: {
            supplier: true,
            purchase: true,
          },
        });

        // 2. Update purchase with new amounts
        const updatedPurchase = await tx.purchase.update({
          where: { id: purchaseId },
          data: {
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
            purchaseType: "outstandingpayment", // ✅ Trigger the database trigger
          },
        });

        // 3. Update supplier totals
        const supplierUpdateData: any = {
          totalPaid: { increment: amount },
        };

        // Reduce supplier outstanding ONLY if purchase had outstanding
        if (currentAmountDue > 0) {
          supplierUpdateData.outstandingBalance = { decrement: amount };
        }

        await tx.supplier.update({
          where: { id: supplierId, companyId },
          data: supplierUpdateData,
        });

        return {
          supplierPayment,
          updatedPurchase,
          previousAmountPaid: currentAmountPaid,
          previousAmountDue: currentAmountDue,
        };
      },
      {
        timeout: 30000,
        // ✅ Important: Ensure triggers are executed
        isolationLevel: "ReadCommitted",
      },
    );

    const {
      supplierPayment,
      updatedPurchase,
      previousAmountPaid,
      previousAmountDue,
    } = result;

    // Log activity
    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        action: "Created supplier payment",
        details: `Supplier: ${supplierPayment.supplier.name}, Payment: ${amount}, Purchase: ${purchaseId}. Previous paid: ${previousAmountPaid}, New paid: ${newAmountPaid}. Previous due: ${previousAmountDue}, New due: ${newAmountDue}.`,
      },
    });

    revalidatePath("/suppliers");
    revalidatePath("/purchases");

    return {
      success: true,
      payment: serializeData(supplierPayment),
      updatedPurchase: serializeData(updatedPurchase),
      summary: {
        previousAmountPaid,
        newAmountPaid,
        previousAmountDue,
        newAmountDue,
        paymentAmount: amount,
        newStatus,
      },
    };
  } catch (error) {
    console.error("❌ Error creating supplier payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create payment",
    };
  }
}

// ✅ New function to update existing payment
// export async function updateSupplierPayment(
//   userId: string,
//   companyId: string,
//   paymentId: string,
//   data: {
//     amount: number;
//     paymentMethod?: string;
//     note?: string;
//     paymentDate?: Date;
//   },
// ) {
//   try {
//     // Get existing payment
//     const existingPayment = await prisma.supplierPayment.findUnique({
//       where: { id: paymentId },
//       include: {
//         purchase: true,
//         supplier: true,
//       },
//     });

//     if (!existingPayment) {
//       throw new Error("Payment not found");
//     }

//     if (!existingPayment.purchaseId) {
//       throw new Error("Payment is not linked to a purchase");
//     }

//     const oldAmount = Number(existingPayment.amount);
//     const newAmount = data.amount;
//     const amountDifference = newAmount - oldAmount;

//     // Get purchase
//     const purchase = await prisma.purchase.findUnique({
//       where: { id: existingPayment.purchaseId },
//     });

//     if (!purchase) {
//       throw new Error("Related purchase not found");
//     }

//     const currentAmountPaid = Number(purchase.amountPaid);
//     const currentAmountDue = Number(purchase.amountDue);

//     // Calculate new amounts
//     const newAmountPaid = currentAmountPaid + amountDifference;
//     const newAmountDue = Math.max(0, currentAmountDue - amountDifference);

//     // Determine new status
//     let newStatus: string;
//     if (newAmountDue === 0) {
//       newStatus = "paid";
//     } else if (newAmountPaid > 0) {
//       newStatus = "partial";
//     } else {
//       newStatus = "pending";
//     }

//     // Validate
//     if (newAmountDue < 0) {
//       throw new Error(
//         `Updated payment would result in overpayment. Maximum allowed: ${currentAmountDue + oldAmount}`
//       );
//     }

//     console.log("💰 Payment Update Calculation:", {
//       paymentId,
//       purchaseId: purchase.id,
//       oldAmount,
//       newAmount,
//       amountDifference,
//       currentAmountPaid,
//       newAmountPaid,
//       currentAmountDue,
//       newAmountDue,
//       newStatus,
//     });

//     // Transaction
//     const result = await prisma.$transaction(
//       async (tx) => {
//         // 1. Update payment record
//         const updatedPayment = await tx.supplierPayment.update({
//           where: { id: paymentId },
//           data: {
//             amount: newAmount,
//             paymentMethod: data.paymentMethod ?? existingPayment.paymentMethod,
//             note: data.note ?? existingPayment.note,
//             paymentDate: data.paymentDate ?? existingPayment.paymentDate,
//           },
//           include: {
//             supplier: true,
//             purchase: true,
//           },
//         });

//         // 2. Update purchase
//         const updatedPurchase = await tx.purchase.update({
//           where: { id: existingPayment.purchaseId },
//           data: {
//             amountPaid: newAmountPaid,
//             amountDue: newAmountDue,
//             status: newStatus,
//             purchaseType: "outstandingpayment", // ✅ Trigger update
//           },
//         });

//         // 3. Update supplier totals
//         await tx.supplier.update({
//           where: { id: existingPayment.supplierId, companyId },
//           data: {
//             totalPaid: { increment: amountDifference },
//             outstandingBalance: { decrement: amountDifference },
//           },
//         });

//         return {
//           updatedPayment,
//           updatedPurchase,
//         };
//       },
//       {
//         timeout: 30000,
//         isolationLevel: 'ReadCommitted',
//       },
//     );

//     // Log activity
//     await prisma.activityLogs.create({
//       data: {
//         userId,
//         companyId,
//         action: "Updated supplier payment",
//         details: `Payment ID: ${paymentId}, Old amount: ${oldAmount}, New amount: ${newAmount}, Difference: ${amountDifference}`,
//       },
//     });

//     revalidatePath("/suppliers");
//     revalidatePath("/purchases");

//     return {
//       success: true,
//       payment: serializeData(result.updatedPayment),
//       updatedPurchase: serializeData(result.updatedPurchase),
//       summary: {
//         oldAmount,
//         newAmount,
//         amountDifference,
//         newAmountPaid,
//         newAmountDue,
//         newStatus,
//       },
//     };
//   } catch (error) {
//     console.error("❌ Error updating supplier payment:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error ? error.message : "Failed to update payment",
//     };
//   }
// }

// ✅ Function to get payment history for a purchase
export async function getPurchasePaymentHistory(
  purchaseId: string,
  companyId: string,
) {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId, companyId },
      include: {
        supplierPayments: {
          orderBy: { paymentDate: "desc" },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Calculate cumulative totals
    let runningPaid = 0;
    const paymentsWithRunningTotal = purchase.supplierPayments
      .map((payment) => {
        runningPaid += Number(payment.amount);
        return {
          ...payment,
          cumulativePaid: runningPaid,
          remainingDue: Number(purchase.totalAmount) - runningPaid,
        };
      })
      .reverse(); // Reverse to show oldest first with running total

    return {
      success: true,
      purchase: {
        id: purchase.id,
        totalAmount: Number(purchase.totalAmount),
        amountPaid: Number(purchase.amountPaid),
        amountDue: Number(purchase.amountDue),
        status: purchase.status,
        supplier: purchase.supplier,
      },
      payments: serializeData(paymentsWithRunningTotal),
    };
  } catch (error) {
    console.error("❌ Error getting payment history:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get payment history",
    };
  }
}
// export async function createSupplierPaymentFromPurchases(
//   userId: string,
//   companyId: string,
//   data: {
//     status: string;
//     createdBy: string;
//     supplierId: string;
//     purchaseId: string; // IMPORTANT
//     amount: number;
//     paymentMethod: string;
//     note?: string;
//     paymentDate?: Date;
//   },
// ) {
//   try {
//     const {
//       status,
//       purchaseId,
//       createdBy,
//       supplierId,

//       amount,
//       paymentMethod,
//       note,
//       paymentDate,
//     } = data;

//     if (!supplierId || !amount || amount <= 0 || !purchaseId) {
//       throw new Error(
//         "Supplier ID, Purchase ID, and valid amount are required",
//       );
//     }

//     const supplier = await prisma.supplier.findUnique({
//       where: { id: supplierId },
//     });
//     if (!supplier) throw new Error("Supplier not found");

//     // --- GET SPECIFIC PURCHASE ---
//     const purchase = await prisma.purchase.findUnique({
//       where: { id: purchaseId },
//     });

//     if (!purchase) throw new Error("Purchase not found");

//     // --- CALCULATE PAYMENT ---
//     const amountDue = Number(purchase.amountDue);
//     const apply = Math.abs(amountDue - amount);
//     const remainingAmount = amount - apply;

//     const purchaseUpdates = [
//       {
//         id: purchase.id,
//         amountPaid: amount,
//         amountDue: Math.max(0, amountDue - apply),
//         status: apply >= amountDue ? "paid" : "partial",
//       },
//     ];

//     // --- TRANSACTION ---
//     const result = await prisma.$transaction(
//       async (tx) => {
//         const updatedPurchases = await Promise.all(
//           purchaseUpdates.map((u) =>
//             tx.purchase.update({
//               where: { id: u.id },
//               data: {
//                 amountPaid: u.amountPaid,
//                 amountDue: u.amountDue,
//                 status: u.status,
//                 purchaseType: "outstandingpayment",
//               },
//             }),
//           ),
//         );

//         const supplierPayment = await tx.supplierPayment.create({
//           data: {
//             companyId,
//             supplierId,
//             amount,
//             paymentMethod,
//             note,
//             createdBy,
//             paymentDate: paymentDate ?? new Date(),
//           },
//           include: { supplier: true },
//         });

//         await tx.supplier.update({
//           where: { id: supplierId, companyId },
//           data: {
//             totalPaid: { increment: amount },
//             outstandingBalance: { increment: -amount },
//           },
//         });

//         return { updatedPurchases, supplierPayment };
//       },
//       { timeout: 30000 },
//     );

//     const { updatedPurchases, supplierPayment } = result;

//     await prisma.activityLogs.create({
//       data: {
//         userId,
//         companyId,
//         action: "Created supplier payment",
//         details: `Supplier: ${supplierPayment.supplier.name}, Payment: ${amount}, Applied to purchase ${purchaseId}.`,
//       },
//     });

//     revalidatePath("/suppliers");

//     return {
//       success: true,
//       payment: serializeData(supplierPayment),
//       updatedPurchases: serializeData(updatedPurchases),
//       remainingAmount,
//     };
//   } catch (error) {
//     console.error("❌ Error creating supplier payment:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error ? error.message : "Failed to create payment",
//     };
//   }
// }

// ============================================
// 4. GET SUPPLIER SUMMARY (Purchases + Payments)
// ============================================
export async function getSupplierSummary(
  supplierId: string,
  companyId: string,
) {
  try {
    const [purchases, payments, totalPurchases] = await Promise.all([
      prisma.purchase.findMany({
        where: { companyId, supplierId },
        select: {
          totalAmount: true,
          amountPaid: true,
          amountDue: true,
          status: true,
        },
      }),
      prisma.supplierPayment.findMany({
        where: { companyId, supplierId },
        select: { amount: true },
      }),
      prisma.purchase.count({
        where: { companyId, supplierId },
      }),
    ]);

    const totalAmount = purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount),
      0,
    );
    const totalPaid = purchases.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0,
    );
    const totalDue = purchases.reduce((sum, p) => sum + Number(p.amountDue), 0);

    return {
      totalPurchases,
      totalAmount,
      totalPaid,
      totalDue,
      balance: totalDue,
      purchaseCount: purchases.length,
      paymentCount: payments.length,
      statusBreakdown: {
        pending: purchases.filter((p) => p.status === "pending").length,
        partial: purchases.filter((p) => p.status === "partial").length,
        paid: purchases.filter((p) => p.status === "paid").length,
        received: purchases.filter((p) => p.status === "received").length,
      },
    };
  } catch (error) {
    console.error("Error fetching supplier summary:", error);
    throw error;
  }
}
