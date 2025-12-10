"use client";

import { FetchCustomerDebtReport } from "@/lib/actions/sells";
import Dailogreuse from "@/components/common/dailogreuse";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFormatter } from "@/hooks/usePrice";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateSalesBulk } from "@/lib/actions/debtSells";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/common/selectproduct";

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
}

export default function DebtReport({
  customerName,
  customerContact,
  customerID,
}: DebtReportProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const t = useTranslations("debt");
  const { user } = useAuth();
  const { formatCurrency } = useFormatter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!user) return null;

  useEffect(() => {
    if (!open) return;
    const handleFetch = async () => {
      setLoading(true);
      const sales = await FetchCustomerDebtReport(customerID, user.companyId);

      if (!Array.isArray(sales)) {
        console.error("INVALID RESPONSE:", sales);
        setDebts([]);
        setLoading(false);
        return;
      }

      const mapped: Debt[] = sales.map((d: any) => ({
        id: d.id,
        date: new Date(d.saleDate).toLocaleDateString(),
        invoiceNo: d.saleNumber,
        items: d.saleItems
          .map((i: any) => `${i.product.name} x${i.quantity}`)
          .join(", "),
        total: parseFloat(d.totalAmount),
        paid: parseFloat(d.amountPaid),
        remaining: parseFloat(d.amountDue),
      }));

      setDebts(mapped);
      setLoading(false);
    };
    handleFetch();
  }, [open]);
  // Add a derived state for "all selected"
  const allSelected = debts.length > 0 && selectedIds.length === debts.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]); // unselect all
    } else {
      setSelectedIds(debts.map((d) => d.id)); // select all
    }
  };

  const totalRemaining = debts.reduce((sum, d) => sum + d.remaining, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    if (paymentAmount <= 0) {
      toast.error("يرجى إدخال مبلغ دفع صحيح.");
      setIsSubmitting(false);
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("يرجى اختيار فاتورة واحدة على الأقل للسداد.");
      setIsSubmitting(false);
      return;
    }

    if (!paymentMethod) {
      toast.error("يرجى اختيار طريقة الدفع.");
      setIsSubmitting(false);
      return;
    }

    try {
      await updateSalesBulk(
        user.companyId,
        selectedIds,
        paymentAmount,
        user.userId,
        paymentMethod,
      );
      toast.success("تم تطبيق الدفعة بنجاح!");
      setPaymentAmount(0);
      setSelectedIds([]);
      setIsSubmitting(false);
      setOpen(false);
    } catch (error) {
      console.error("Error updating debt sales:", error);
      setIsSubmitting(false);
      toast.error("فشل في تطبيق الدفعة. الرجاء المحاولة مرة أخرى.");
    }
  };
  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },
    { id: "check", name: "شيك" },
    { id: "credit", name: "ائتمان" },
  ];
  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="عرض الفاتورة"
      style="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl"
    >
      <div id="receipt-content" className="rounded-md" dir="rtl">
        {/* Header */}
        <div className="mb-6 border-b pb-4 text-center">
          <h1 className="text-2xl font-bold">
            {t("debtReport") || "Debt Report"}
          </h1>
          <p className="text-lg">My Shop / Business Name</p>
          <p>{t("date") || `Date: ${new Date().toLocaleDateString()}`}</p>
        </div>

        {/* Customer Info */}
        <div className="mb-6">
          <p>
            <strong>{t("customer") || "Customer"}:</strong> {customerName}
          </p>
          {customerContact && (
            <p>
              <strong>{t("contact") || "Contact"}:</strong> {customerContact}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="w-80 sm:w-[480px] md:w-3xl lg:w-full">
          <ScrollArea className="h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-amber-300">
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>

                  <TableHead>{t("date") || "Date"}</TableHead>
                  <TableHead>{t("invoiceNo") || "Invoice #"}</TableHead>
                  <TableHead className="text-right">
                    {t("total") || "Total"}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("paid") || "Paid"}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("remaining") || "Remaining"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(debt.id)}
                        onChange={() => toggleSelect(debt.id)}
                      />
                    </TableCell>
                    <TableCell>{debt.date}</TableCell>
                    <TableCell>{debt.invoiceNo}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(debt.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(debt.paid)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(debt.remaining)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-bold">
            {t("totalOutstanding") || "Total Outstanding"}:{" "}
            {formatCurrency(totalRemaining)}
          </p>
          <div className="grid gap-2">
            <Label>طريقة الدفع</Label>
            <SelectField
              options={paymentMethods}
              value={paymentMethod || ""}
              placeholder="اختر الطريقة"
              action={(val) => setPaymentMethod(val)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="المبلغ المدفوع"
              value={paymentAmount}
              onChange={(e) =>
                setPaymentAmount(parseFloat(e.target.value) || 0)
              }
              className="w-32"
            />
            <Button
              onClick={onSubmit}
              type="submit"
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? "جاري الحفظ..." : " تأكيد الدفع"}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-right">
          <p>{user?.name}</p>
          <p>________________________</p>
          <p>{t("issuedBy") || "Issued By"}</p>
        </div>
      </div>
    </Dailogreuse>
  );
}
