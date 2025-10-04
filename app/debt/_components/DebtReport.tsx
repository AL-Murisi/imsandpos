"use client";

import { useEffect, useState } from "react";
import { FetchCustomerDebtReport } from "@/app/actions/sells"; // server action
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";

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
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const t = useTranslations("debt");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const sales = await FetchCustomerDebtReport(customerID);

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
    }

    load();
  }, [customerID]);

  const totalRemaining = debts.reduce((sum, d) => sum + d.remaining, 0);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="mx-auto w-[900px] bg-white p-10 text-black print:w-full print:p-4 print:text-sm print:leading-tight">
      {/* Header */}
      <div className="mb-6 border-b pb-4 text-center print:mb-4 print:pb-2">
        <h1 className="text-2xl font-bold print:text-lg">
          {t("title") || "Debt Report"}
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
      <div className="overflow-hidden rounded-md border print:border print:border-black">
        <Table className="print:text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>{t("date") || "Date"}</TableHead>
              <TableHead>{t("invoice") || "Invoice #"}</TableHead>
              <TableHead>{t("items") || "Items"}</TableHead>
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
              const itemList = debt.items.split(", ");
              const isExpanded = expandedRows.includes(debt.id);
              return (
                <TableRow key={debt.id}>
                  <TableCell>{debt.date}</TableCell>
                  <TableCell>{debt.invoiceNo}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right">
                    {debt.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {debt.paid.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {debt.remaining.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between print:mt-4">
        <p className="text-lg font-bold print:text-sm">
          {t("totalOutstanding") || "Total Outstanding"}:{" "}
          {totalRemaining.toFixed(2)}
        </p>
        <div className="text-right print:text-sm">
          <p>________________________</p>
          <p>{t("issuedBy") || "Issued By"}</p>
        </div>
      </div>
    </div>
  );
}
