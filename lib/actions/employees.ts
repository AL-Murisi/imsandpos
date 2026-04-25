"use server";

import prisma from "@/lib/prisma";
import {
  CreateEmployeeSchema,
  EmployeeSalaryPaymentSchema,
  UpdateEmployeeSchema,
} from "@/lib/zod";
import { revalidatePath } from "next/cache";
import { canCreateSubscriptionResource } from "./subscription";
import { getSession } from "@/lib/session";
import { getNextVoucherNumber } from "./cashier";
import { validateFiscalYear } from "./fiscalYear";

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function nextEmployeeCode(companyId: string) {
  const count = await prisma.employee.count({ where: { companyId } });
  return `EMP-${String(count + 1).padStart(4, "0")}`;
}

export async function fetchEmployees(
  companyId: string,
  searchQuery = "",
  page = 0,
  pageSize = 10,
  from?: string,
  to?: string,
) {
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;
  const where = {
    companyId,
    ...(searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" as const } },
            { email: { contains: searchQuery, mode: "insensitive" as const } },
            { phone: { contains: searchQuery } },
            {
              employeeCode: {
                contains: searchQuery,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
    select: { mapping_type: true, account_id: true },
  });
  const prAccount = mappings.find(
    (m) => m.mapping_type === "payroll_expenses",
  )?.account_id;
  if (!prAccount) {
    return {
      success: false,
      error: "حساب العملاء (المدينون) غير مربوط",
    };
  }
  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: page * pageSize,
      take: pageSize,
      select: {
        name: true,
        id: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        userId: true,
        employeeCode: true,
        position: true,
        department: true,
        salary: true,
        hireDate: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.count({ where }),
  ]);
  const result = await Promise.all(
    employees.map(async (employee) => {
      const paymentIds = await prisma.financialTransaction.findMany({
        where: {
          companyId,
          employeeId: employee.id,
          createdAt: {
            ...(fromDate && { gte: fromDate }),
            ...(toDate && { lte: toDate }),
          },
        },
        select: { id: true },
      });
      const paymentIdList = paymentIds.map((p) => p.id);
      const employeeReferenceIds = [employee.id, ...paymentIdList];
      // جلب القيود المحاسبية الخاصة بهذا العميل تحديداً ضمن الفترة الزمنية
      const entries = await prisma.journalLine.findMany({
        where: {
          companyId: companyId,
          accountId: prAccount,
          header: {
            referenceId: { in: employeeReferenceIds },
            entryDate: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          },
        },
        select: {
          debit: true,
          credit: true,
        },
      });

      // حساب الإجمالي من واقع القيود
      const totalDebit = entries.reduce((s, t) => s + Number(t.debit || 0), 0);
      const totalCredit = entries.reduce(
        (s, t) => s + Number(t.credit || 0),
        0,
      );
      return {
        ...employee,
        balance: totalCredit - totalDebit,
        salary: employee.salary ? Number(employee.salary) : null,
        hireDate: employee.hireDate.toISOString(),
        // إجمالي الديون (الجانب المدين في المحاسبة للعملاء عادة يمثل الديون المطلوبة منهم)

        // إجمالي المبالغ المدفوعة أو الدائنة
      };
    }),
  );

  return {
    employees: result,
    total,
  };
}

export async function createEmployee(form: unknown, companyId: string) {
  const parsed = CreateEmployeeSchema.safeParse(form);
  if (!parsed.success) {
    return { error: "Invalid employee data" };
  }

  const {
    name,
    email,
    phone,
    position,
    department,
    salary,
    hireDate,
    password,
  } = parsed.data;
  const normalizedEmail = email?.trim().toLowerCase() || null;

  try {
    let userId: string | null = null;
    if (normalizedEmail) {
      const userCapacity = await canCreateSubscriptionResource(
        companyId,
        "users",
      );
      if (!userCapacity.allowed) {
        return {
          error: `تم الوصول إلى الحد الأقصى للمستخدمين (${userCapacity.usage.used}/${userCapacity.usage.limit})`,
        };
      }

      if (!password) {
        return { error: "كلمة المرور مطلوبة لإنشاء حساب الموظف" };
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (existingUser) {
        return { error: "هذا البريد مستخدم بالفعل" };
      }

      const user = await prisma.user.create({
        data: {
          companyId,
          email: normalizedEmail,
          name,
          phoneNumber: normalizeOptionalString(phone),
          password,
          role: position,
        },
      });

      userId = user.id;
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        userId,
        employeeCode: await nextEmployeeCode(companyId),
        name,
        email: normalizedEmail,
        phone: normalizeOptionalString(phone),
        position: normalizeOptionalString(position),
        department: normalizeOptionalString(department),
        salary,
        hireDate: new Date(hireDate),
      },
    });

    revalidatePath("/employee");
    revalidatePath("/user");
    return { success: true, employee };
  } catch (error) {
    console.error("Failed to create employee:", error);
    return { error: "Failed to create employee" };
  }
}

export async function updateEmployee(
  employeeId: string,
  companyId: string,
  form: unknown,
) {
  const parsed = UpdateEmployeeSchema.safeParse(form);
  if (!parsed.success) {
    return { error: "Invalid employee data" };
  }

  const {
    name,
    email,
    phone,
    position,
    department,
    salary,
    hireDate,
    password,
  } = parsed.data;
  const normalizedEmail = email?.trim().toLowerCase() || null;

  try {
    const existingEmployee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { userId: true },
    });

    if (!existingEmployee) {
      return { error: "Employee not found" };
    }

    let userId = existingEmployee.userId ?? null;

    if (normalizedEmail) {
      if (!userId) {
        const userCapacity = await canCreateSubscriptionResource(
          companyId,
          "users",
        );
        if (!userCapacity.allowed) {
          return {
            error: `تم الوصول إلى الحد الأقصى للمستخدمين (${userCapacity.usage.used}/${userCapacity.usage.limit})`,
          };
        }

        if (!password) {
          return { error: "أدخل كلمة مرور لإنشاء حساب الموظف" };
        }

        const createdUser = await prisma.user.create({
          data: {
            companyId,
            email: normalizedEmail,
            name: name ?? "",
            phoneNumber: normalizeOptionalString(phone),
            password,
          },
        });

        userId = createdUser.id;
      } else {
        await prisma.user.update({
          where: { id: userId, companyId },
          data: {
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
            ...(name ? { name } : {}),
            phoneNumber: normalizeOptionalString(phone),
            ...(password ? { password } : {}),
          },
        });
      }
    }

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(normalizedEmail !== null ? { email: normalizedEmail } : {}),
        ...(phone !== undefined
          ? { phone: normalizeOptionalString(phone) }
          : {}),
        ...(position !== undefined
          ? { position: normalizeOptionalString(position) }
          : {}),
        ...(department !== undefined
          ? { department: normalizeOptionalString(department) }
          : {}),
        ...(salary !== undefined ? { salary } : {}),
        ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
        userId,
      },
    });

    revalidatePath("/employee");
    revalidatePath("/user");
    return { success: true, employee };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { error: "Failed to update employee" };
  }
}

export async function updateEmployeeStatus(
  employeeId: string,
  companyId: string,
  isActive: boolean,
) {
  try {
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive },
      select: { userId: true },
    });

    if (employee.userId) {
      await prisma.user.update({
        where: { id: employee.userId, companyId },
        data: { isActive },
      });
    }

    revalidatePath("/employee");
    revalidatePath("/user");
    return { success: true };
  } catch (error) {
    console.error("Failed to update employee status:", error);
    return { error: "Failed to update employee status" };
  }
}

export async function deleteEmployee(employeeId: string, companyId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { id: employeeId, companyId },
        select: { userId: true },
      });

      await tx.employee.delete({ where: { id: employeeId } });

      if (employee?.userId) {
        await tx.customer.updateMany({
          where: { userId: employee.userId, companyId },
          data: { userId: null },
        });
        await tx.userInvite.deleteMany({ where: { userId: employee.userId } });
        await tx.pushSubscription.deleteMany({
          where: { userId: employee.userId },
        });

        await tx.user.delete({ where: { id: employee.userId, companyId } });
      }
    });

    revalidatePath("/employee");
    revalidatePath("/user");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return { error: "Failed to delete employee" };
  }
}

export async function createEmployeeSalaryPayment(
  employeeId: string,
  companyId: string,
  form: unknown,
) {
  const parsed = EmployeeSalaryPaymentSchema.safeParse(form);
  if (!parsed.success) {
    return { error: "Invalid salary payment data" };
  }

  const session = await getSession();
  if (!session?.userId || session.companyId !== companyId) {
    return { error: "Unauthorized" };
  }

  const {
    amount,
    paymentMethod,
    paymentDate,
    branchId,
    referenceNumber,
    notes,
    currencyCode,
  } = parsed.data;

  try {
    await validateFiscalYear(companyId);

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, isActive: true },
      select: {
        id: true,
        name: true,
        salary: true,
        userId: true,
      },
    });

    if (!employee) {
      return { error: "Employee not found" };
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { base_currency: true },
    });

    const paymentDateValue = new Date(paymentDate);
    const selectedCurrency = currencyCode || company?.base_currency || "YER";

    const result = await prisma.$transaction(
      async (tx) => {
        const voucherNumber = await getNextVoucherNumber(
          companyId,
          "PAYMENT",
          tx,
        );

        const [mappings, payrollExpenseAccount] = await Promise.all([
          tx.account_mappings.findMany({
            where: { company_id: companyId, is_default: true },
            select: { mapping_type: true, account_id: true },
          }),
          tx.accounts.findFirst({
            where: {
              company_id: companyId,
              account_category: "PAYROLL_EXPENSES",
              is_active: true,
            },
            select: { id: true },
            orderBy: { account_code: "asc" },
          }),
        ]);

        const accountMap = new Map(
          mappings.map((mapping) => [mapping.mapping_type, mapping.account_id]),
        );
        const settlementAccount =
          paymentMethod === "bank"
            ? accountMap.get("bank") || accountMap.get("cash")
            : accountMap.get("cash");

        if (!payrollExpenseAccount?.id) {
          throw new Error("حساب مصروف الرواتب غير موجود");
        }

        if (!settlementAccount) {
          throw new Error("حساب السداد النقدي أو البنكي غير موجود");
        }

        const description = `صرف راتب الموظف ${employee.name}`;
        const payment = await tx.financialTransaction.create({
          data: {
            companyId,
            userId: employee.userId ?? undefined,
            branchId: branchId || undefined,
            type: "PAYMENT",
            voucherNumber,
            amount,
            currencyCode: selectedCurrency,
            baseAmount: amount,
            paymentMethod,
            employeeId,
            referenceNumber: referenceNumber || undefined,
            status: "paid",
            notes: notes
              ? `${description} - ${notes}`
              : `${description} (الموظف: ${employee.id})`,
            date: paymentDateValue,
            createdAt: paymentDateValue,
          },
        });

        const entryNumber = `SAL-${new Date().getFullYear()}-${payment.voucherNumber}`;
        await tx.journalHeader.create({
          data: {
            companyId,
            entryNumber,
            description,
            branchId: branchId || undefined,
            referenceType: "سند صرف راتب",
            referenceId: employee.id,
            entryDate: paymentDateValue,
            status: "POSTED",
            createdBy: session.userId,
            lines: {
              create: [
                {
                  companyId,
                  accountId: payrollExpenseAccount.id,
                  debit: amount,
                  credit: 0,
                  currencyCode: selectedCurrency,
                  memo: description,
                },
                {
                  companyId,
                  accountId: settlementAccount,
                  debit: 0,
                  credit: amount,
                  currencyCode: selectedCurrency,
                  memo: `${description} - ${paymentMethod}`,
                },
              ],
            },
          },
        });

        return { payment, voucherNumber };
      },
      {
        timeout: 20000,
        maxWait: 5000,
      },
    );

    await prisma.activityLogs.create({
      data: {
        userId: session.userId,
        companyId,
        action: "صرف راتب موظف",
        details: `تم صرف راتب للموظف ${employee.name} بمبلغ ${amount} ورقم سند ${result.voucherNumber}`,
        userAgent: "",
      },
    });

    revalidatePath("/employee");
    revalidatePath("/voucher");
    revalidatePath("/journal");

    return { success: true, payment: result.payment };
  } catch (error) {
    console.error("Failed to create employee salary payment:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create salary payment",
    };
  }
}
