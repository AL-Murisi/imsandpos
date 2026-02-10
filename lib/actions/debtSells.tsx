"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchProductStats } from "./Product";
import { success } from "zod";
import { getActiveFiscalYears } from "@/lib/actions/fiscalYear";
import { TransactionType } from "@prisma/client";
import webpush from "web-push";

type CustomerPayments = Record<string, number>;

async function sendPaymentNotifications(
  companyId: string,
  customerTotals: CustomerPayments,
  label: string,
) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      console.error("VAPID keys are missing in environment variables");
      return;
    }

    const customerIds = Object.keys(customerTotals);
    if (customerIds.length === 0) return;

    const [customers, subscriptions] = await Promise.all([
      prisma.customer.findMany({
        where: { companyId, id: { in: customerIds } },
        select: { id: true, name: true },
      }),
      prisma.pushSubscription.findMany({
        where: { company_id: companyId },
      }),
    ]);

    if (subscriptions.length === 0) return;

    const customerNameMap = new Map(customers.map((c) => [c.id, c.name]));

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payloads = customerIds.map((id) => {
      const name = customerNameMap.get(id) || "عميل";
      const amount = customerTotals[id] || 0;
      return JSON.stringify({
        title: "سداد ديون",
        body: `تم تسديد مبلغ ${amount} من ${name} - ${label}`,
        data: { url: "/", sound: "/sounds/notification.wav" },
      });
    });

    await Promise.all(
      subscriptions.flatMap((sub) =>
        payloads.map(async (payload) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
            );
          } catch (error: any) {
            if (error?.statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
          }
        }),
      ),
    );
  } catch (err) {
    console.error("Failed to send payment notifications:", err);
  }
}
// async function getNextVoucherNumber(
//   companyId: string,
//   type: "RECEIPT" | "PAYMENT",
//   tx: any,
// ): Promise<number> {
//   // Generate a unique lock ID based on companyId and type
//   const lockId = hashToInt(companyId + type);

//   // Acquire advisory lock (automatically released at end of transaction)
//   await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

//   // Now safely get the max voucher number
//   const result = await tx.$queryRaw<Array<{ max_voucher: number | null }>>`
//     SELECT COALESCE(MAX(voucher_number), 0) as max_voucher
//     FROM financial_transactions
//     WHERE company_id = ${companyId}
//       AND type = ${type}::"TransactionType"
//   `;

//   const maxVoucher = result[0]?.max_voucher ?? 0;
//   return maxVoucher + 1;
// }

// // Helper function to convert string to integer for advisory lock
// function hashToInt(str: string): number {
//   let hash = 0;
//   for (let i = 0; i < str.length; i++) {
//     const char = str.charCodeAt(i);
//     hash = (hash << 5) - hash + char;
//     hash = hash & hash; // Convert to 32bit integer
//   }
//   return Math.abs(hash);
// }

export async function updateSales(
  companyId: string,
  saleId: string,
  paymentAmount: number,
  cashierId: string,
) {
  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }
  if (!companyId) return;

  const updatedSale = await prisma.$transaction(async (tx) => {
    // 1️⃣ Fetch current sale
    const sale = await tx.invoice.findUnique({
      where: { id: saleId, cashierId, companyId },
      select: {
        id: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        status: true,
        customerId: true,
      },
    });

    if (!sale) throw new Error(`Sale with ID ${saleId} not found.`);

    const totalAmount = sale.totalAmount.toNumber();
    const currentPaid = sale.amountPaid.toNumber();
    const currentDue = sale.amountDue.toNumber();
    const customerId = sale.customerId;

    // 2️⃣ Compute new values
    let newAmountPaid = currentPaid + paymentAmount;
    let newAmountDue = currentDue - paymentAmount;
    if (newAmountDue < 0) newAmountDue = 0;

    let newPaymentStatus: "paid" | "partial" | "pending";
    if (newAmountPaid >= totalAmount) {
      newPaymentStatus = "paid";
      newAmountDue = 0;
    } else if (newAmountPaid > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "pending";
    }

    // 3️⃣ Update Sale
    const updatedSaleRecord = await tx.invoice.update({
      where: { id: saleId, companyId: companyId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newPaymentStatus,
        invoiceDate: new Date(),
      },
    });

    // 4️⃣ Get next voucher number with locking
    const voucherNumber = await getNextVoucherNumber(companyId, "RECEIPT", tx);

    // 5️⃣ Log Payment
    const payment = await tx.financialTransaction.create({
      data: {
        companyId,
        saleId,
        userId: cashierId ?? "",
        voucherNumber,
        currencyCode: "",
        type: "RECEIPT",
        paymentMethod: "cash",
        amount: paymentAmount,
        status: "completed",
        notes: `Payment for Sale ${saleId}`,
        createdAt: new Date(),
      },
    });

    // 6️⃣ CREATE JOURNAL EVENT
    await tx.journalEvent.create({
      data: {
        companyId: companyId,
        eventType: "payment",
        entityType: "outstanding_payment",
        status: "pending",
        payload: {
          companyId,
          payment: {
            id: payment.id,
            saleId: saleId,
            customerId: customerId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
          },
          cashierId,
        },
        processed: false,
      },
    });

    // 7️⃣ Update Customer balance
    if (customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          outstandingBalance: {
            decrement: paymentAmount,
          },
        },
      });
    }

    // 8️⃣ Return clean serialized sale
    return {
      ...updatedSaleRecord,
      totalAmount: updatedSaleRecord.totalAmount.toString(),
      amountPaid: updatedSaleRecord.amountPaid.toString(),
      amountDue: updatedSaleRecord.amountDue.toString(),
      createdAt: updatedSaleRecord.invoiceDate.toISOString(),
      updatedAt: updatedSaleRecord.invoiceDate.toISOString(),
    };
  });

  revalidatePath("/sells");
  return updatedSale;
}

// export async function updateSalesBulk(
//   companyId: string,
//   saleIds: string[],
//   paymentAmount: number,
//   cashierId: string,
//   branchId: string,
//   paymentDetails: {
//     basCurrncy: string;
//     paymentMethod: string;
//     currencyCode: string;
//     bankId: string;
//     exchange_rate?: number;
//     transferNumber?: string;
//     baseAmount?: number;
//     amountFC?: number;
//   },
// ) {
//   if (paymentAmount <= 0)
//     throw new Error("Payment amount must be greater than zero.");
//   if (!companyId || saleIds.length === 0)
//     throw new Error("Missing company ID or sale IDs.");

//   const result = await prisma.$transaction(
//     async (tx) => {
//       // 1️⃣ Fetch sales
//       const sales = await tx.invoice.findMany({
//         where: { id: { in: saleIds }, companyId },
//         select: {
//           id: true,
//           totalAmount: true,
//           amountPaid: true,
//           amountDue: true,
//           invoiceNumber: true,
//           customerId: true,
//         },
//       });

//       if (sales.length === 0) throw new Error("No matching sales found.");
//       const distributedPayments = []; // مصفوفة لتخزين تفاصيل كل فاتورة للـ Journal Event
//       // 2️⃣ Allocate payments
//       let remaining = paymentAmount;
//       const saleUpdates = [];
//       const customerUpdates: Record<string, number> = {};
//       const paymentsToCreate = [];

//       for (const s of sales) {
//         if (remaining <= 0) break;
//         const due = s.amountDue.toNumber();
//         if (due <= 0) continue;

//         const payNow = Math.min(remaining, due);
//         remaining -= payNow;

//         const newPaid = s.amountPaid.toNumber() + payNow;
//         const newDue = s.totalAmount.toNumber() - newPaid;

//         saleUpdates.push({
//           id: s.id,
//           amountPaid: newPaid,
//           amountDue: Math.max(newDue, 0),
//           paymentStatus: newDue <= 0 ? "paid" : "partial",
//         });

//         paymentsToCreate.push({
//           saleId: s.id,
//           invoiceNumber: s.invoiceNumber,
//           customerId: s.customerId,
//           amount: payNow,
//         });

//         if (s.customerId) {
//           customerUpdates[s.customerId] =
//             (customerUpdates[s.customerId] || 0) + payNow;
//         }
//         distributedPayments.push({
//           saleId: s.id,
//         });
//       }

//       // 3️⃣ Update invoices
//       for (const u of saleUpdates) {
//         await tx.invoice.update({
//           where: { id: u.id },
//           data: {
//             amountPaid: u.amountPaid,
//             amountDue: u.amountDue,
//             status: u.paymentStatus,
//             invoiceDate: new Date(),
//           },
//         });
//       }

//       // 4️⃣ Create payments with sequential voucher numbers
//       const createdPayments = [];
//       for (const p of paymentsToCreate) {
//         // Get voucher number with locking for EACH payment
//         const voucherNumber = await getNextVoucherNumber(
//           companyId,
//           TransactionType.RECEIPT,
//           tx,
//         );

//         const payment = await tx.financialTransaction.create({
//           data: {
//             companyId,
//             invoiceId: p.saleId,
//             referenceNumber: paymentDetails.paymentMethod ?? "",
//             customerId: p.customerId,
//             userId: cashierId,
//             branchId,
//             voucherNumber,

//             type: TransactionType.RECEIPT,
//             paymentMethod: paymentDetails.paymentMethod,
//             amount:
//               paymentDetails.currencyCode !== paymentDetails.basCurrncy
//                 ? paymentDetails.amountFC
//                   ? (p.amount / paymentDetails.baseAmount!) *
//                     paymentDetails.amountFC
//                   : p.amount
//                 : p.amount,

//             currencyCode: paymentDetails.currencyCode,
//             exchangeRate: paymentDetails.exchange_rate,

//             status: "completed",
//             notes: `تسديد الدين للفاتورة رقم ${p.invoiceNumber}`,
//             createdAt: new Date(),
//           },
//         });
//         createdPayments.push(payment);

//         // Create journal event
//         await tx.journalEvent.create({
//           data: {
//             companyId,
//             eventType: "payment",
//             entityType: "outstanding_payment",
//             status: "pending",
//             payload: {
//               companyId,
//               payment: {
//                 id: payment.id,
//                 saleId: p.saleId,
//                 customerId: p.customerId,
//                 amount: paymentDetails.baseAmount,
//                 branchId,
//                 paymentDetails: paymentDetails || {},
//               },
//               cashierId,
//             },
//             processed: false,
//           },
//         });
//       }

//       // 5️⃣ Update customer balances
//       for (const [custId, amt] of Object.entries(customerUpdates)) {
//         await tx.customer.update({
//           where: { id: custId },
//           data: { outstandingBalance: { decrement: amt } },
//         });
//       }

//       return {
//         success: true,
//         updatedSales: saleUpdates.length,
//         paymentsCreated: createdPayments.length,
//       };
//     },
//     {
//       maxWait: 10000, // 10 seconds max wait for lock
//       timeout: 30000, // 30 seconds total timeout
//     },
//   );

//   revalidatePath("/customer");
//   return result;
// }

// export async function payOutstandingOnly(
//   companyId: string,
//   customerId: string,
//   paymentAmount: number,
//   cashierId: string,
//   branchId: string,
//   paymentDetails: {
//     basCurrncy: string;
//     paymentMethod: string;
//     currencyCode: string;
//     bankId: string;
//     transferNumber?: string;
//     exchangeRate?: number;
//     baseAmount?: number;
//     amountFC?: number;
//   },
// ) {
//   if (!companyId || !customerId)
//     throw new Error("Missing company or customer ID.");

//   if (paymentAmount <= 0)
//     throw new Error("Payment amount must be greater than zero.");

//   const result = await prisma.$transaction(
//     async (tx) => {
//       // 1️⃣ Get next voucher number with locking
//       const voucherNumber = await getNextVoucherNumber(
//         companyId,
//         TransactionType.RECEIPT,
//         tx,
//       );

//       // 2️⃣ Create payment
//       const payment = await tx.financialTransaction.create({
//         data: {
//           companyId,
//           customerId,
//           saleId: null,
//           userId: cashierId,
//           voucherNumber,
//           type: "RECEIPT",
//           currencyCode: paymentDetails.currencyCode || "",
//           paymentMethod: paymentDetails.paymentMethod,
//           amount: paymentAmount,
//           status: "paid",
//           notes: "تسديد رصيد مستحق غير مرتبط بفاتورة",
//           createdAt: new Date(),
//         },
//       });

//       // 3️⃣ Update customer outstanding balance

//       // 4️⃣ Create journal event
//       await tx.journalEvent.create({
//         data: {
//           companyId,
//           eventType: "payment-outstanding",
//           entityType: "outstanding",
//           status: "pending",
//           processed: false,
//           payload: {
//             companyId,
//             payment: {
//               id: payment.id,
//               saleId: null,
//               customerId,
//               amount: paymentDetails.baseAmount,
//               branchId,
//               paymentDetails: paymentDetails || {},
//             },
//             cashierId,
//           },
//         },
//       });

//       return {
//         success: true,
//         paymentId: payment.id,
//         amountPaid: payment.amount,
//       };
//     },
//     {
//       maxWait: 10000, // Time to wait for a connection (10s)
//       timeout: 20000, // Time to complete the transaction (20s)
//     },
//   );

//   revalidatePath("/customer");
//   return result;
// }
// ============================================
// OPTIMIZED getNextVoucherNumber
// ============================================
export async function getNextVoucherNumber(
  companyId: string,
  type: "RECEIPT" | "PAYMENT",
  tx: any,
): Promise<number> {
  const lockId = hashToInt(companyId + type);

  // Acquire advisory lock
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

  // Get max voucher number
  const result = await tx.$queryRaw<Array<{ max_voucher: number | null }>>`
    SELECT COALESCE(MAX(voucher_number), 0) as max_voucher
    FROM financial_transactions
    WHERE company_id = ${companyId}
      AND type = ${type}::"TransactionType"
  `;

  const maxVoucher = result[0]?.max_voucher ?? 0;
  return maxVoucher + 1;
}

// ============================================
// NEW: Get MULTIPLE voucher numbers in ONE call
// ============================================
export async function getNextVoucherNumbers(
  companyId: string,
  type: "RECEIPT" | "PAYMENT",
  count: number,
  tx: any,
): Promise<number[]> {
  const lockId = hashToInt(companyId + type);

  // Acquire advisory lock ONCE
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

  // Get max voucher number ONCE
  const result = await tx.$queryRaw<Array<{ max_voucher: number | null }>>`
    SELECT COALESCE(MAX(voucher_number), 0) as max_voucher
    FROM financial_transactions
    WHERE company_id = ${companyId}
      AND type = ${type}::"TransactionType"
  `;

  const maxVoucher = result[0]?.max_voucher ?? 0;

  // Generate sequential numbers
  const voucherNumbers: number[] = [];
  for (let i = 1; i <= count; i++) {
    voucherNumbers.push(maxVoucher + i);
  }

  return voucherNumbers;
}

function hashToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ============================================
// FIXED: updateSalesBulk
// ============================================

export async function updateSalesBulk(
  companyId: string,
  saleIds: string[],
  paymentAmount: number,
  cashierId: string,
  branchId: string,
  paymentDetails: {
    basCurrncy: string;
    paymentMethod: string;
    currencyCode: string;
    bankId: string;
    exchange_rate?: number;
    transferNumber?: string;
    baseAmount?: number;
    amountFC?: number;
  },
) {
  if (paymentAmount <= 0)
    throw new Error("Payment amount must be greater than zero.");
  if (!companyId || saleIds.length === 0)
    throw new Error("Missing company ID or sale IDs.");

  const result = await prisma.$transaction(
    async (tx) => {
      // 1️⃣ Fetch sales
      const sales = await tx.invoice.findMany({
        where: { id: { in: saleIds }, companyId },
        select: {
          id: true,
          totalAmount: true,
          amountPaid: true,
          amountDue: true,
          invoiceNumber: true,
          customerId: true,
        },
      });

      if (sales.length === 0) throw new Error("No matching sales found.");

      // 2️⃣ Allocate payments
      let remaining = paymentAmount;
      const saleUpdates = [];
      const customerUpdates: Record<string, number> = {};
      const paymentsToCreate = [];

      for (const s of sales) {
        if (remaining <= 0) break;
        const due = s.amountDue.toNumber();
        if (due <= 0) continue;

        const payNow = Math.min(remaining, due);
        remaining -= payNow;

        const newPaid = s.amountPaid.toNumber() + payNow;
        const newDue = s.totalAmount.toNumber() - newPaid;

        saleUpdates.push({
          id: s.id,
          amountPaid: newPaid,
          amountDue: Math.max(newDue, 0),
          paymentStatus: newDue <= 0 ? "paid" : "partial",
        });

        paymentsToCreate.push({
          saleId: s.id,
          invoiceNumber: s.invoiceNumber,
          customerId: s.customerId,
          amount: payNow,
        });

        if (s.customerId) {
          customerUpdates[s.customerId] =
            (customerUpdates[s.customerId] || 0) + payNow;
        }
      }

      // 3️⃣ Update invoices
      await Promise.all(
        saleUpdates.map((u) =>
          tx.invoice.update({
            where: { id: u.id },
            data: {
              amountPaid: u.amountPaid,
              amountDue: u.amountDue,
              status: u.paymentStatus,
              invoiceDate: new Date(),
            },
          }),
        ),
      );

      // 4️⃣ Get ALL voucher numbers in ONE call (FIX HERE!)
      const voucherNumbers = await getNextVoucherNumbers(
        companyId,
        TransactionType.RECEIPT,
        paymentsToCreate.length,
        tx,
      );

      // 5️⃣ Create ALL payments with pre-allocated voucher numbers
      const createdPayments = [];
      for (let i = 0; i < paymentsToCreate.length; i++) {
        const p = paymentsToCreate[i];
        const voucherNumber = voucherNumbers[i];

        const payment = await tx.financialTransaction.create({
          data: {
            companyId,
            invoiceId: p.saleId,
            referenceNumber: paymentDetails.paymentMethod ?? "",
            customerId: p.customerId,
            userId: cashierId,
            branchId,
            voucherNumber,
            type: TransactionType.RECEIPT,
            paymentMethod: paymentDetails.paymentMethod,
            amount:
              paymentDetails.currencyCode !== paymentDetails.basCurrncy
                ? paymentDetails.amountFC
                  ? (p.amount / paymentDetails.baseAmount!) *
                    paymentDetails.amountFC
                  : p.amount
                : p.amount,
            currencyCode: paymentDetails.currencyCode,
            exchangeRate: paymentDetails.exchange_rate,
            status: "completed",
            notes: `تسديد الدين للفاتورة رقم ${p.invoiceNumber}`,
            createdAt: new Date(),
          },
        });
        createdPayments.push(payment);

        // Create journal event
        await tx.journalEvent.create({
          data: {
            companyId,
            eventType: "payment",
            entityType: "outstanding_payment",
            status: "pending",
            payload: {
              companyId,
              payment: {
                id: payment.id,
                saleId: p.saleId,
                customerId: p.customerId,
                amount: paymentDetails.baseAmount,
                branchId,
                paymentDetails: paymentDetails || {},
              },
              cashierId,
            },
            processed: false,
          },
        });
      }

      // 6️⃣ Update customer balances
      await Promise.all(
        Object.entries(customerUpdates).map(([custId, amt]) =>
          tx.customer.update({
            where: { id: custId },
            data: { outstandingBalance: { decrement: amt } },
          }),
        ),
      );

      return {
        success: true,
        updatedSales: saleUpdates.length,
        paymentsCreated: createdPayments.length,
        customerUpdates,
      };
    },
    {
      maxWait: 10000,
      timeout: 45000, // Increased timeout for bulk operations
    },
  );

  if (result?.customerUpdates) {
    await sendPaymentNotifications(
      companyId,
      result.customerUpdates,
      "تسديد فواتير",
    );
  }

  revalidatePath("/customer");
  return result;
}

// ============================================
// FIXED: payOutstandingOnly
// ============================================
export async function payOutstandingOnly(
  companyId: string,
  customerId: string,
  paymentAmount: number,
  cashierId: string,
  branchId: string,
  paymentDetails: {
    basCurrncy: string;
    paymentMethod: string;
    currencyCode: string;
    bankId: string;
    transferNumber?: string;
    exchangeRate?: number;
    baseAmount?: number;
    amountFC?: number;
  },
) {
  if (!companyId || !customerId)
    throw new Error("Missing company or customer ID.");

  if (paymentAmount <= 0)
    throw new Error("Payment amount must be greater than zero.");

  const result = await prisma.$transaction(
    async (tx) => {
      // 1️⃣ Get next voucher number (only ONE call - this is fine)
      const voucherNumber = await getNextVoucherNumber(
        companyId,
        TransactionType.RECEIPT,
        tx,
      );

      // 2️⃣ Create payment
      const payment = await tx.financialTransaction.create({
        data: {
          companyId,
          customerId,
          invoiceId: null,
          userId: cashierId,
          branchId,
          voucherNumber,
          type: "RECEIPT",
          currencyCode: paymentDetails.currencyCode || "",
          paymentMethod: paymentDetails.paymentMethod,
          amount: paymentAmount,
          exchangeRate: paymentDetails.exchangeRate,
          status: "completed",
          notes: "تسديد رصيد مستحق غير مرتبط بفاتورة",
          createdAt: new Date(),
        },
      });

      // 3️⃣ Update customer outstanding balance
      await tx.customer.update({
        where: { id: customerId },
        data: {
          outstandingBalance: {
            decrement: paymentDetails.baseAmount || paymentAmount,
          },
        },
      });

      // 4️⃣ Create journal event
      await tx.journalEvent.create({
        data: {
          companyId,
          eventType: "payment-outstanding",
          entityType: "outstanding",
          status: "pending",
          processed: false,
          payload: {
            companyId,
            payment: {
              id: payment.id,
              saleId: null,
              customerId,
              amount: paymentDetails.baseAmount,
              branchId,
              paymentDetails: paymentDetails || {},
            },
            cashierId,
          },
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        amountPaid: payment.amount,
        customerId,
        paymentBaseAmount: paymentDetails.baseAmount || paymentAmount,
      };
    },
    {
      maxWait: 5000,
      timeout: 15000,
    },
  );

  if (result?.customerId && result?.paymentBaseAmount) {
    await sendPaymentNotifications(
      companyId,
      { [result.customerId]: result.paymentBaseAmount },
      "تسديد رصيد",
    );
  }

  revalidatePath("/customer");
  return result;
}

// ============================================
// PERFORMANCE TIPS
// ============================================
/*
KEY FIXES APPLIED:

1. ✅ Batch Voucher Number Generation
   - Instead of calling getNextVoucherNumber() in a loop
   - Call getNextVoucherNumbers() ONCE to get all numbers
   - Eliminates multiple lock acquisitions

2. ✅ Parallel Updates
   - Changed sequential updates to Promise.all()
   - Invoice updates now run in parallel
   - Customer updates now run in parallel

3. ✅ Proper Timeout Configuration
   - Increased timeout for bulk operations (45s)
   - Kept shorter timeout for single operations (15s)
   - Added appropriate maxWait times

4. ✅ Transaction Scope Optimization
   - Reduced number of database round-trips
   - Minimized time holding advisory locks
   - Better error handling

ADDITIONAL RECOMMENDATIONS:

1. Database Indexes (if not already present):
   CREATE INDEX idx_financial_transactions_company_type_voucher 
   ON financial_transactions(company_id, type, voucher_number);

2. Consider Moving Journal Events Outside Transaction:
   - Journal events can be created after main transaction
   - Reduces transaction time
   - Use a queue/background job if needed

3. Monitor Transaction Times:
   - Log how long transactions take
   - Alert if approaching timeout limits
   - Adjust timeouts based on real-world usage

4. Batch Size Limits:
   - Consider limiting bulk payment batches to 50-100 invoices
   - Split larger batches into multiple transactions
*/
