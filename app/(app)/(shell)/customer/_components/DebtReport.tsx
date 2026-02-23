// "use client";

// import { FetchCustomerDebtReport } from "@/lib/actions/sells";
// import Dailogreuse from "@/components/common/dailogreuse";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import { Button } from "@/components/ui/button";
// import { useFormatter } from "@/hooks/usePrice";
// import { useAuth } from "@/lib/context/AuthContext";
// import { useTranslations } from "next-intl";
// import { useEffect, useState } from "react";
// import { toast } from "sonner";
// import { payOutstandingOnly, updateSalesBulk } from "@/lib/actions/debtSells";
// import {
//   PaymentState,
//   ReusablePayment,
// } from "@/components/common/ReusablePayment";
// import { fetchPayments } from "@/lib/actions/banks";
// import { useCompany } from "@/hooks/useCompany";
// type Account = {
//   id: string;
//   name: string;
//   currency: string | null;
// };
// interface Debt {
//   id: string;
//   date: string;
//   invoiceNo: string;
//   items: string;
//   total: number;
//   paid: number;
//   remaining: number;
// }

// interface DebtReportProps {
//   customerName: string;
//   customerContact?: string;
//   customerID: string;
//   outstandingBalance: number;
// }

// export default function DebtReport({
//   customerName,
//   customerContact,
//   customerID,
//   outstandingBalance,
// }: DebtReportProps) {
//   const { company } = useCompany();
//   const t = useTranslations("debt");
//   const { formatCurrency } = useFormatter();
//   const [debts, setDebts] = useState<Debt[]>([]);
//   const [selectedIds, setSelectedIds] = useState<string[]>([]);
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [accounts, setAccounts] = useState<Account[]>([]);
//   const [payment, setPayment] = useState<PaymentState>({
//     paymentMethod: "cash",
//     accountId: "",
//     selectedCurrency: company?.base_currency ?? "",
//     amountBase: 0,
//   });

//   const { user } = useAuth();
//   if (!user) return;
//   const companyid = user.companyId;

//   /* ───────── Fetch debts ───────── */
//   useEffect(() => {
//     if (!open || !user) return;

//     async function load() {
//       setLoading(true);
//       const sales = await FetchCustomerDebtReport(customerID, companyid);

//       const mapped: Debt[] = sales.map((d: any) => ({
//         id: d.id,
//         date: new Date(d.saleDate).toLocaleDateString(),
//         invoiceNo: d.saleNumber,
//         items: d.saleItems
//           .map((i: any) => `${i.product.name} x${i.quantity}`)
//           .join(", "),
//         total: +d.totalAmount,
//         paid: +d.amountPaid,
//         remaining: +d.amountDue,
//       }));

//       setDebts(mapped);
//       setLoading(false);
//     }

//     load();
//   }, [open]);

//   const allSelected = debts.length > 0 && selectedIds.length === debts.length;

//   const toggleSelectAll = () =>
//     setSelectedIds(allSelected ? [] : debts.map((d) => d.id));

//   const toggleSelect = (id: string) =>
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
//     );

//   const totalRemaining = debts.reduce((s, d) => s + d.remaining, 0);
//   const isForeign = payment.selectedCurrency !== company?.base_currency;
//   /* ───────── Submit selected invoices ───────── */
//   // ALWAYS base amount for backend logic
//   const paymentAmount = payment.amountBase;

//   const onSubmit = async () => {
//     if (!payment.paymentMethod || !payment.accountId) {
//       toast.error("يرجى اختيار طريقة الدفع والحساب");
//       return;
//     }

//     if (payment.amountBase <= 0) {
//       toast.error("يرجى إدخال مبلغ صحيح");
//       return;
//     }

//     if (!selectedIds.length) {
//       toast.error("اختر فاتورة واحدة على الأقل");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       await updateSalesBulk(
//         user.companyId,

//         selectedIds,
//         paymentAmount,
//         user.userId,
//         company?.branches[0].id ?? "",

//         {
//           basCurrncy: company?.base_currency ?? "",
//           paymentMethod: payment.paymentMethod,
//           currencyCode: payment.selectedCurrency,
//           bankId: payment.accountId,
//           transferNumber: payment.transferNumber,
//           exchange_rate: payment.exchangeRate,
//           amountFC: payment.amountFC,
//           baseAmount: payment.amountBase,
//         },
//       );
//       //   async function sendWebPush(message: string) {
//       //     if (!message) return alert("Message is empty");
//       //     if (!subscription) return alert("No subscription");

//       //     try {
//       await fetch("/api/web-push/send", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           companyId: user.companyId,
//           role: user.roles, // or "CASHIER"
//           title: "سداد ديون",
//           body: `تم تسديد مبلغ ${formatCurrency(paymentAmount)} من ${customerName}`,
//         }),
//       });

//       //       // alert("Push sent 🚀");
//       //     } catch (err) {
//       //       console.error(err);
//       //       alert("Failed to send push");
//       //     }
//       //   }
//       toast.success("تم السداد بنجاح");
//       setOpen(false);
//       setSelectedIds([]);
//       setPayment({
//         paymentMethod: "",
//         accountId: "",
//         selectedCurrency: company?.base_currency ?? "",
//         amountBase: 0,
//       });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };
//   useEffect(() => {
//     if (!open || !payment.paymentMethod) return;

//     async function load() {
//       try {
//         const { banks, cashAccounts } = await fetchPayments();
//         setAccounts(payment.paymentMethod === "bank" ? banks : cashAccounts);
//       } catch {
//         toast.error("فشل تحميل الحسابات");
//       }
//     }
//     load();
//   }, [open, payment.paymentMethod]);
//   /* ───────── Outstanding only ───────── */
//   const onSubmitOutstandingOnly = async () => {
//     if (payment.amountBase <= 0) {
//       toast.error("يرجى إدخال مبلغ صحيح");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       await payOutstandingOnly(
//         user.companyId,
//         customerID,
//         paymentAmount,
//         user.userId,
//         company?.branches[0].id ?? "",

//         {
//           basCurrncy: company?.base_currency ?? "",
//           paymentMethod: payment.paymentMethod,
//           currencyCode: payment.selectedCurrency,
//           bankId: payment.accountId,
//           transferNumber: payment.transferNumber,
//           exchangeRate: payment.exchangeRate,
//           baseAmount: payment.amountBase,
//           amountFC: payment.amountFC,
//         },
//       );

//       toast.success("تم تسديد الرصيد");
//       setOpen(false);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <Dailogreuse
//       open={open}
//       setOpen={setOpen}
//       btnLabl="سند قبض"
//       style="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl"
//     >
//       <ScrollArea dir="rtl" className="h-[70vh] space-y-4">
//         {/* Header */}
//         <h2 className="text-center text-xl font-bold">{t("debtReport")}</h2>
//         {payment.selectedCurrency}
//         {/* Table */}
//         <div className="w-80 p-3 sm:w-[480px] md:w-3xl lg:w-full">
//           <ScrollArea className="h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
//             <Table className="w-full">
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>
//                     <input
//                       type="checkbox"
//                       checked={allSelected}
//                       onChange={toggleSelectAll}
//                     />
//                   </TableHead>
//                   <TableHead>التاريخ</TableHead>
//                   <TableHead>الفاتورة</TableHead>
//                   <TableHead>الإجمالي</TableHead>
//                   <TableHead>المدفوع</TableHead>
//                   <TableHead>المتبقي</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {debts.map((d) => (
//                   <TableRow key={d.id}>
//                     <TableCell>
//                       <input
//                         type="checkbox"
//                         checked={selectedIds.includes(d.id)}
//                         onChange={() => toggleSelect(d.id)}
//                       />
//                     </TableCell>
//                     <TableCell>{d.date}</TableCell>
//                     <TableCell>{d.invoiceNo}</TableCell>
//                     <TableCell>{formatCurrency(d.total)}</TableCell>
//                     <TableCell>{formatCurrency(d.paid)}</TableCell>
//                     <TableCell>{formatCurrency(d.remaining)}</TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//             <ScrollBar orientation="horizontal" />
//           </ScrollArea>
//         </div>
//         <p className="text-muted-foreground text-sm">
//           الرصيد الإجمالي غير المرتبط بفواتير:
//           <span className="mr-2 font-semibold text-red-600">
//             {formatCurrency(outstandingBalance)}
//           </span>
//         </p>
//         <p className="font-bold">
//           الإجمالي المتبقي: {formatCurrency(totalRemaining)}
//         </p>

//         {/* ✅ Reusable payment */}
//         <div className="p-3">
//           <ReusablePayment
//             value={payment}
//             action={setPayment}
//             accounts={accounts}
//           />
//         </div>
//         {/* Actions */}
//         <div className="grid grid-cols-2 gap-2 py-3">
//           <Button onClick={onSubmit} disabled={isSubmitting || loading}>
//             تسديد الفواتير
//           </Button>

//           <Button
//             variant="secondary"
//             onClick={onSubmitOutstandingOnly}
//             disabled={isSubmitting || outstandingBalance <= 0}
//           >
//             تسديد الرصيد فقط
//           </Button>
//         </div>
//       </ScrollArea>
//     </Dailogreuse>
//   );
// }
"use client";

import { FetchCustomerDebtReport } from "@/lib/actions/sells";
import Dailogreuse from "@/components/common/dailogreuse";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useFormatter } from "@/hooks/usePrice";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { payOutstandingOnly, updateSalesBulk } from "@/lib/actions/debtSells";
import {
  PaymentState,
  ReusablePayment,
} from "@/components/common/ReusablePayment";
import { fetchPayments } from "@/lib/actions/banks";
import { useCompany } from "@/hooks/useCompany";

type Account = {
  id: string;
  name: string;
  currency: string | null;
};

interface Debt {
  id: string;
  date: string;
  invoiceNo: string;
  items: string;
  total: number;
  paid: number;
  remaining: number;
}

interface DebtReportProps {
  customerName: string;
  customerContact?: string;
  customerID: string;
  outstandingBalance: number;
}

export default function DebtReport({
  customerName,
  customerContact,
  customerID,
  outstandingBalance,
}: DebtReportProps) {
  const { company } = useCompany();
  const t = useTranslations("debt");
  const { formatCurrency } = useFormatter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payment, setPayment] = useState<PaymentState>({
    paymentMethod: "cash",
    accountId: "",
    selectedCurrency: company?.base_currency ?? "",
    amountBase: 0,
  });

  const { user } = useAuth();
  if (!user) return null;

  const companyid = user.companyId;

  /* ───────── Fetch debts ───────── */
  useEffect(() => {
    if (!open || !user) return;

    async function load() {
      setLoading(true);
      const sales = await FetchCustomerDebtReport(customerID, companyid);

      const mapped: Debt[] = sales.map((d: any) => ({
        id: d.id,
        date: new Date(d.saleDate).toLocaleDateString(),
        invoiceNo: d.saleNumber,
        items: d.saleItems
          .map((i: any) => `${i.product.name} x${i.quantity}`)
          .join(", "),
        total: +d.totalAmount,
        paid: +d.amountPaid,
        remaining: +d.amountDue,
      }));

      setDebts(mapped);
      setLoading(false);
    }

    load();
  }, [open, customerID, companyid, user]);

  const allSelected = debts.length > 0 && selectedIds.length === debts.length;

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : debts.map((d) => d.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const totalRemaining = debts.reduce((s, d) => s + d.remaining, 0);

  /* ───────── Submit selected invoices ───────── */
  const paymentAmount = payment.amountBase;

  // async function sendNotification(amount: number, type: string) {
  //   if (!user) return alert("No subscription");
  //   try {
  //     const response = await fetch("/api/web-push/send", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         companyId: user.companyId,
  //         title: "سداد ديون",
  //         body: `تم تسديد مبلغ ${formatCurrency(amount)} من ${customerName} - ${type}`,
  //       }),
  //     });

  //     const result = await response.json();
  //     console.log("Notification result:", result);
  //   } catch (err) {
  //     console.error("Failed to send notification:", err);
  //     // Don't show error to user - notification is optional
  //   }
  // }

  const onSubmit = async () => {
    if (!payment.paymentMethod || !payment.accountId) {
      toast.error("يرجى اختيار طريقة الدفع والحساب");
      return;
    }

    if (payment.amountBase <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (!selectedIds.length) {
      toast.error("اختر فاتورة واحدة على الأقل");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateSalesBulk(
        user.companyId,
        selectedIds,
        paymentAmount,
        user.userId,
        company?.branches[0].id ?? "",
        {
          basCurrncy: company?.base_currency ?? "",
          paymentMethod: payment.paymentMethod,
          currencyCode: payment.selectedCurrency,
          bankId: payment.accountId,
          transferNumber: payment.transferNumber,
          exchange_rate: payment.exchangeRate,
          amountFC: payment.amountFC,
          baseAmount: payment.amountBase,
        },
      );

      // Send notification after successful payment
      // await sendNotification(paymentAmount, "تسديد فواتير");

      toast.success("تم السداد بنجاح");
      setOpen(false);
      setSelectedIds([]);
      setPayment({
        paymentMethod: "",
        accountId: "",
        selectedCurrency: company?.base_currency ?? "",
        amountBase: 0,
      });
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error("فشل السداد");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open || !payment.paymentMethod) return;

    async function load() {
      try {
        const { banks, cashAccounts } = await fetchPayments();
        setAccounts(payment.paymentMethod === "bank" ? banks : cashAccounts);
      } catch {
        toast.error("فشل تحميل الحسابات");
      }
    }
    load();
  }, [open, payment.paymentMethod]);

  /* ───────── Outstanding only ───────── */
  const onSubmitOutstandingOnly = async () => {
    if (payment.amountBase <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setIsSubmitting(true);

    try {
      await payOutstandingOnly(
        user.companyId,
        customerID,
        paymentAmount,
        user.userId,
        company?.branches[0].id ?? "",
        {
          basCurrncy: company?.base_currency ?? "",
          paymentMethod: payment.paymentMethod,
          currencyCode: payment.selectedCurrency,
          bankId: payment.accountId,
          transferNumber: payment.transferNumber,
          exchangeRate: payment.exchangeRate,
          baseAmount: payment.amountBase,
          amountFC: payment.amountFC,
        },
      );

      // Send notification after successful payment
      // await sendNotification(paymentAmount, "تسديد رصيد");

      toast.success("تم تسديد الرصيد");
      setOpen(false);
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error("فشل السداد");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="سند قبض"
      style="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl"
    >
      <ScrollArea dir="rtl" className="h-[70vh] space-y-4">
        {/* Header */}
        <h2 className="text-center text-xl font-bold">{t("debtReport")}</h2>

        {/* Table */}
        <div className="w-80 p-3 sm:w-[480px] md:w-3xl lg:w-full">
          <ScrollArea className="h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الفاتورة</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(d.id)}
                        onChange={() => toggleSelect(d.id)}
                      />
                    </TableCell>
                    <TableCell>{d.date}</TableCell>
                    <TableCell>{d.invoiceNo}</TableCell>
                    <TableCell>{formatCurrency(d.total)}</TableCell>
                    <TableCell>{formatCurrency(d.paid)}</TableCell>
                    <TableCell>{formatCurrency(d.remaining)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <p className="text-muted-foreground text-sm">
          الرصيد الإجمالي غير المرتبط بفواتير:
          <span className="mr-2 font-semibold text-red-600">
            {formatCurrency(outstandingBalance)}
          </span>
        </p>
        <p className="font-bold">
          الإجمالي المتبقي: {formatCurrency(totalRemaining)}
        </p>

        {/* ✅ Reusable payment */}
        <div className="p-3">
          <ReusablePayment
            value={payment}
            action={setPayment}
            accounts={accounts}
          />
        </div>
        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 py-3">
          <Button onClick={onSubmit} disabled={isSubmitting || loading}>
            تسديد الفواتير
          </Button>

          <Button
            variant="secondary"
            onClick={onSubmitOutstandingOnly}
            disabled={isSubmitting || outstandingBalance <= 0}
          >
            تسديد الرصيد فقط
          </Button>
        </div>
      </ScrollArea>
    </Dailogreuse>
  );
}
