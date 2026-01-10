// "use client";

// import { FetchCustomerDebtReport } from "@/lib/actions/sells";
// import Dailogreuse from "@/components/common/dailogreuse";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { useFormatter } from "@/hooks/usePrice";
// import { useAuth } from "@/lib/context/AuthContext";
// import { useTranslations } from "next-intl";
// import { useEffect, useState } from "react";
// import { toast } from "sonner";
// import { payOutstandingOnly, updateSalesBulk } from "@/lib/actions/debtSells";
// import { Label } from "@/components/ui/label";
// import { SelectField } from "@/components/common/selectproduct";
// import { fetchPayments } from "@/lib/actions/banks";
// import {
//   PaymentState,
//   ReusablePayment,
// } from "@/components/common/ReusablePayment";

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
// interface bankcash {
//   id: string;
//   name: string;
//   currency: string | null;
// }
// export default function DebtReport({
//   customerName,
//   customerContact,
//   customerID,
//   outstandingBalance,
// }: DebtReportProps) {
//   const [debts, setDebts] = useState<Debt[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [paymentAmount, setPaymentAmount] = useState<number>(0);
//   const [selectedIds, setSelectedIds] = useState<string[]>([]);
//   const [open, setOpen] = useState(false);
//   const [paymentMethod, setPaymentMethod] = useState("");
//   const t = useTranslations("debt");
//   const { user } = useAuth();
//   const { formatCurrency } = useFormatter();
//   const [transferNumber, setTransferNumber] = useState("");
//   const [exchangeRate, setExchangeRate] = useState<number>(0);
//   const [amountFC, setAmountFC] = useState<number>(0);
//   const [payment, setPayment] = useState<PaymentState>({
//     paymentMethod: "",
//     accountId: "",
//     accountCurrency: "YER",
//     amountBase: 0,
//   });

//   const [isSubmitting, setIsSubmitting] = useState(false);
//   if (!user) return null;
//   const [banks, setBanks] = useState<bankcash[]>([]);
//   const [selectedBankId, setSelectedBankId] = useState("");
//   const selectedBank = banks.find((b) => b.id === selectedBankId);
//   const isUsdAccount =
//     selectedBank?.currency && selectedBank.currency !== "YER";
//   const currencyCode = banks.find((b) => b.id === selectedBankId)?.currency;
//   useEffect(() => {
//     if (!open || !paymentMethod) {
//       setBanks([]);
//       setSelectedBankId("");
//       return;
//     }

//     const loadAccounts = async () => {
//       try {
//         const { banks, cashAccounts } = await fetchPayments();
//         // Automatically choose accounts based on payment method
//         if (paymentMethod === "bank") setBanks(banks);
//         if (paymentMethod === "cash") setBanks(cashAccounts);
//       } catch (err) {
//         console.error(err);
//         toast.error("فشل في جلب الحسابات");
//       }
//     };

//     loadAccounts();
//   }, [open, paymentMethod]);

//   useEffect(() => {
//     if (!open) return;
//     const handleFetch = async () => {
//       setLoading(true);
//       const sales = await FetchCustomerDebtReport(customerID, user.companyId);

//       if (!Array.isArray(sales)) {
//         console.error("INVALID RESPONSE:", sales);
//         setDebts([]);
//         setLoading(false);
//         return;
//       }

//       const mapped: Debt[] = sales.map((d: any) => ({
//         id: d.id,
//         date: new Date(d.saleDate).toLocaleDateString(),
//         invoiceNo: d.saleNumber,
//         items: d.saleItems
//           .map((i: any) => `${i.product.name} x${i.quantity}`)
//           .join(", "),
//         total: parseFloat(d.totalAmount),
//         paid: parseFloat(d.amountPaid),
//         remaining: parseFloat(d.amountDue),
//       }));

//       setDebts(mapped);
//       setLoading(false);
//     };
//     handleFetch();
//   }, [open]);
//   // Add a derived state for "all selected"
//   const allSelected = debts.length > 0 && selectedIds.length === debts.length;
//   useEffect(() => {
//     if (isUsdAccount && exchangeRate > 0) {
//       setPaymentAmount(amountFC * exchangeRate);
//     }
//   }, [amountFC, exchangeRate]);
//   useEffect(() => {
//     if (isUsdAccount && exchangeRate > 0) {
//       setAmountFC(paymentAmount / exchangeRate);
//     }
//   }, [paymentAmount]);

//   const toggleSelectAll = () => {
//     if (allSelected) {
//       setSelectedIds([]); // unselect all
//     } else {
//       setSelectedIds(debts.map((d) => d.id)); // select all
//     }
//   };

//   const totalRemaining = debts.reduce((sum, d) => sum + d.remaining, 0);

//   const toggleSelect = (id: string) => {
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
//     );
//   };
//   const onSubmitOutstandingOnly = async () => {
//     setIsSubmitting(true);

//     if (paymentAmount <= 0) {
//       toast.error("يرجى إدخال مبلغ دفع صحيح.");
//       setIsSubmitting(false);
//       return;
//     }

//     if (!paymentMethod) {
//       toast.error("يرجى اختيار طريقة الدفع.");
//       setIsSubmitting(false);
//       return;
//     }

//     try {
//       const currencyCode = banks.find((b) => b.id === selectedBankId)?.currency;

//       await payOutstandingOnly(
//         user.companyId,
//         customerID,
//         paymentAmount,
//         user.userId,
//         paymentMethod,
//         currencyCode ?? "",
//         {
//           bankId: selectedBankId,
//           transferNumber,
//         },
//       );

//       toast.success("تم سداد الرصيد المستحق بنجاح!");
//       setPaymentAmount(0);
//       setSelectedIds([]);
//       setIsSubmitting(false);
//       setOpen(false);
//     } catch (error) {
//       console.error("Outstanding payment error:", error);
//       toast.error("فشل في سداد الرصيد المستحق.");
//       setIsSubmitting(false);
//     }
//   };

//   const onSubmit = async () => {
//     setIsSubmitting(true);
//     if (paymentAmount <= 0) {
//       toast.error("يرجى إدخال مبلغ دفع صحيح.");
//       setIsSubmitting(false);
//       return;
//     }

//     if (selectedIds.length === 0) {
//       toast.error("يرجى اختيار فاتورة واحدة على الأقل للسداد.");
//       setIsSubmitting(false);
//       return;
//     }

//     if (!paymentMethod) {
//       toast.error("يرجى اختيار طريقة الدفع.");
//       setIsSubmitting(false);
//       return;
//     }
//     if (paymentMethod === "bank" && !selectedBankId) {
//       toast.error("يرجى اختيار البنك");
//       setIsSubmitting(false);
//       return;
//     }

//     try {
//       // Get the currency of the selected account
//       const currencyCode = banks.find((b) => b.id === selectedBankId)?.currency;

//       await updateSalesBulk(
//         user.companyId,
//         selectedIds,
//         paymentAmount,
//         user.userId,
//         paymentMethod,
//         currencyCode ?? "",
//         {
//           bankId: selectedBankId,
//           transferNumber,
//         },
//       );
//       toast.success("تم تطبيق الدفعة بنجاح!");
//       setPaymentAmount(0);
//       setSelectedIds([]);
//       setIsSubmitting(false);
//       setOpen(false);
//     } catch (error) {
//       console.error("Error updating debt sales:", error);
//       setIsSubmitting(false);
//       toast.error("فشل في تطبيق الدفعة. الرجاء المحاولة مرة أخرى.");
//     }
//   };

//   const paymentmethods = [
//     { id: "cash", name: "نقداً" },
//     { id: "bank", name: "تحويل بنكي" },

//     { id: "debt", name: "دين" },
//   ];
//   return (
//     <Dailogreuse
//       open={open}
//       setOpen={setOpen}
//       btnLabl="عرض الفاتورة"
//       style="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl"
//     >
//       <div id="receipt-content" className="rounded-md" dir="rtl">
//         {/* Header */}
//         <div className="mb-6 border-b pb-4 text-center">
//           <h1 className="text-2xl font-bold">
//             {t("debtReport") || "Debt Report"}
//           </h1>{" "}
//           {currencyCode}
//           <p className="text-lg">My Shop / Business Name</p>
//           <p>{t("date") || `Date: ${new Date().toLocaleDateString()}`}</p>
//         </div>

//         {/* Customer Info */}
//         <div className="mb-6">
//           <p>
//             <strong>{t("customer") || "Customer"}:</strong> {customerName}
//           </p>
//           {customerContact && (
//             <p>
//               <strong>{t("contact") || "Contact"}:</strong> {customerContact}
//             </p>
//           )}
//         </div>

//         {/* Table */}
//         <div className="w-80 sm:w-[480px] md:w-3xl lg:w-full">
//           <ScrollArea className="h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
//             <Table className="w-full">
//               <TableHeader>
//                 <TableRow className="border-amber-300">
//                   <TableHead>
//                     <input
//                       type="checkbox"
//                       checked={allSelected}
//                       onChange={toggleSelectAll}
//                     />
//                   </TableHead>

//                   <TableHead>{t("date") || "Date"}</TableHead>
//                   <TableHead>{t("invoiceNo") || "Invoice #"}</TableHead>
//                   <TableHead className="text-right">
//                     {t("total") || "Total"}
//                   </TableHead>
//                   <TableHead className="text-right">
//                     {t("paid") || "Paid"}
//                   </TableHead>
//                   <TableHead className="text-right">
//                     {t("remaining") || "Remaining"}
//                   </TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {debts.map((debt) => (
//                   <TableRow key={debt.id}>
//                     <TableCell>
//                       <input
//                         type="checkbox"
//                         checked={selectedIds.includes(debt.id)}
//                         onChange={() => toggleSelect(debt.id)}
//                       />
//                     </TableCell>
//                     <TableCell>{debt.date}</TableCell>
//                     <TableCell>{debt.invoiceNo}</TableCell>
//                     <TableCell className="text-right">
//                       {formatCurrency(debt.total)}
//                     </TableCell>
//                     <TableCell className="text-right">
//                       {formatCurrency(debt.paid)}
//                     </TableCell>
//                     <TableCell className="text-right font-semibold">
//                       {formatCurrency(debt.remaining)}
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//             <ScrollBar orientation="horizontal" />
//           </ScrollArea>
//         </div>
//         <p className="text-lg font-bold">
//           {t("totalOutstanding") || "Total Outstanding"}:{" "}
//           {formatCurrency(totalRemaining)}
//         </p>
//         <p className="text-muted-foreground text-sm">
//           الرصيد الإجمالي غير المرتبط بفواتير:
//           <span className="mr-2 font-semibold text-red-600">
//             {formatCurrency(outstandingBalance)}
//           </span>
//         </p>
//         {/* Footer */}
//         <div className="mt-6 grid grid-cols-1 gap-4 sm:items-center sm:justify-between md:grid-cols-2">
//           <div className="grid gap-2">
//             <Label>طريقة الدفع</Label>
//             <SelectField
//               options={paymentmethods}
//               value={paymentMethod || ""}
//               placeholder="اختر الطريقة"
//               action={(val) => setPaymentMethod(val)}
//             />
//           </div>

//           {paymentMethod === "cash" && (
//             <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//               <div className="grid gap-3">
//                 <Label>كاش</Label>
//                 <SelectField
//                   options={banks}
//                   value={selectedBankId}
//                   placeholder="اختر الصندوق"
//                   action={(val) => setSelectedBankId(val)}
//                 />
//               </div>
//             </div>
//           )}
//           {paymentMethod === "bank" && (
//             <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//               <div className="grid gap-3">
//                 <Label>البنك</Label>
//                 <SelectField
//                   options={banks}
//                   value={selectedBankId}
//                   placeholder="اختر البنك"
//                   action={(val) => setSelectedBankId(val)}
//                 />
//               </div>
//               <div className="grid gap-3">
//                 <Label>رقم الحوالة / التحويل</Label>
//                 <Input
//                   value={transferNumber}
//                   onChange={(e) => setTransferNumber(e.target.value)}
//                   placeholder="مثال: TRX-458796"
//                 />
//               </div>
//             </div>
//           )}
//         </div>
//         <div className="grid grid-cols-1 gap-2 py-3 md:grid-cols-2">
//           <Input
//             type="number"
//             placeholder="المبلغ المدفوع"
//             value={paymentAmount}
//             onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
//             className="w-32"
//           />
//           {isUsdAccount && (
//             <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//               <div className="grid gap-2">
//                 <Label>سعر الصرف ({selectedBank?.currency} → YER)</Label>
//                 <Input
//                   type="number"
//                   placeholder="مثال: 1500"
//                   value={exchangeRate}
//                   onChange={(e) =>
//                     setExchangeRate(parseFloat(e.target.value) || 0)
//                   }
//                 />
//               </div>

//               <div className="grid gap-2">
//                 <Label>المبلغ بـ {selectedBank?.currency}</Label>
//                 <Input
//                   type="number"
//                   placeholder="مثال: 100"
//                   value={amountFC}
//                   onChange={(e) => setAmountFC(parseFloat(e.target.value) || 0)}
//                 />
//               </div>
//             </div>
//           )}
//           <ReusablePayment value={payment} action={setPayment} />

//           <div className="grid grid-cols-2 gap-2">
//             {/* Pay selected invoices */}
//             <Button
//               onClick={onSubmit}
//               disabled={isSubmitting || loading || selectedIds.length === 0}
//             >
//               تسديد الفواتير المحددة
//             </Button>

//             {/* Pay outstanding without invoice */}
//             <Button
//               variant="secondary"
//               onClick={onSubmitOutstandingOnly}
//               disabled={isSubmitting || loading || outstandingBalance <= 0}
//             >
//               تسديد الرصيد فقط
//             </Button>
//           </div>
//         </div>
//       </div>
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
    accountCurrency: "",
    amountBase: 0,
  });
  const { user } = useAuth();
  if (!user) return;
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
  }, [open]);

  const allSelected = debts.length > 0 && selectedIds.length === debts.length;

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : debts.map((d) => d.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const totalRemaining = debts.reduce((s, d) => s + d.remaining, 0);

  /* ───────── Submit selected invoices ───────── */
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
        payment.amountBase,
        user.userId,

        {
          paymentMethod: payment.paymentMethod,
          currencyCode: payment.accountCurrency,
          bankId: payment.accountId,
          transferNumber: payment.transferNumber,
          exchange_rate: payment.exchangeRate,
          amountFC: payment.amountFC,
          baseAmount: payment.amountBase,
        },
      );

      toast.success("تم السداد بنجاح");
      setOpen(false);
      setSelectedIds([]);
      setPayment({
        paymentMethod: "",
        accountId: "",
        accountCurrency: "YER",
        amountBase: 0,
      });
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
        payment.amountBase,
        user.userId,

        {
          paymentMethod: payment.paymentMethod,
          currencyCode: payment.accountCurrency,
          bankId: payment.accountId,
          transferNumber: payment.transferNumber,
          exchangeRate: payment.exchangeRate,
          baseAmount: payment.amountBase,
          amountFC: payment.amountFC,
        },
      );

      toast.success("تم تسديد الرصيد");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="عرض الفاتورة"
      style="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl"
    >
      <ScrollArea dir="rtl" className="h-[70vh] space-y-4">
        {/* Header */}
        <h2 className="text-center text-xl font-bold">{t("debtReport")}</h2>
        {payment.accountCurrency}
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
