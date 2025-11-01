"use client";

import { FetchCustomerDebtReport } from "@/app/actions/sells"; // server action
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
import { useFormatter } from "@/hooks/usePrice";
import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

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
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const t = useTranslations("debt");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return;
  const { formatCurrency, formatPriceK, formatQty } = useFormatter();
  useEffect(() => {
    if (!customerName) return;
    const handleFetch = async () => {
      setLoading(true);
      const sales = await FetchCustomerDebtReport(customerID, user.companyId);

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

  const totalRemaining = debts.reduce((sum, d) => sum + d.remaining, 0);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={`عرض الفاتورة`}
      style="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl"
    >
      <div id="receipt-content" className="rounded-md" dir="rtl">
        {" "}
        {/* Header */}
        <div className="mb-6 border-b pb-4 text-center print:mb-4 print:pb-2">
          <h1 className="text-2xl font-bold print:text-lg">
            {t("debtReport") || "Debt Report"}
          </h1>
          <p className="text-lg print:text-sm">My Shop / Business Name</p>
          <p className="print:text-sm">
            {t("date") || `Date: ${new Date().toLocaleDateString()}`}
          </p>
        </div>
        {/* Customer Info */}
        <div className="mb-6 print:mb-4">
          <p className="print:text-sm">
            <strong>{t("customer") || "Customer"}:</strong> {customerName}
          </p>
          {customerContact && (
            <p className="print:text-sm">
              <strong>{t("contact") || "Contact"}:</strong> {customerContact}
            </p>
          )}
        </div>
        {/* Table */}
        <div className="w-80 sm:w-[480px] md:w-3xl lg:w-full">
          <ScrollArea className="top-3 h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
            <Table className="w-full">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="border-amber-300">
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
                {debts.map((debt) => {
                  return (
                    <TableRow key={debt.id}>
                      <TableCell>{debt.date}</TableCell>
                      <TableCell>{debt.invoiceNo}</TableCell>
                      {/* <TableCell>
                    {isExpanded
                      ? itemList.map((item, i) => (
                          <div key={i} className="text-sm print:text-xs">
                            {item}
                          </div>
                        ))
                      : itemList.slice(0, 2).map((item, i) => (
                          <div key={i} className="text-sm print:text-xs">
                            {item}
                          </div>
                        ))}
                    {itemList.length > 2 && (
                      <button
                        className="mt-1 text-sm text-blue-500 print:hidden"
                        onClick={() => toggleRow(debt.id)}
                      >
                        {isExpanded
                          ? t("showLess") || "Show less"
                          : t("showMore") || "Show more"}
                      </button>
                    )}
                  </TableCell> */}
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
                  );
                })}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        {/* Footer */}
        <div className="mt-6 flex items-center justify-between print:mt-4">
          <p className="text-lg font-bold print:text-sm">
            {t("totalOutstanding") || "Total Outstanding"}:{" "}
            {totalRemaining.toFixed(2)}
          </p>
          <div className="text-right print:text-sm">
            {user?.name}
            <p>________________________</p>
            <p>{t("issuedBy") || "Issued By"}</p>
          </div>
        </div>
      </div>
    </Dailogreuse>
  );
}
