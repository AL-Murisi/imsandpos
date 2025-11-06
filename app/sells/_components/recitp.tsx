"use client";

import React, { useEffect, useState } from "react";
import { fetchReceipt } from "@/app/actions/sells";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { PrintButton } from "./test";
import { Receipt } from "@/components/common/receipt";
import { useAuth } from "@/lib/context/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import Dailogreuse from "@/components/common/dailogreuse";

type Props = {
  id: string;
};
type company =
  | {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      logoUrl: string | null;
    }
  | undefined;
export default function Recitp({ id }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const t = useTranslations("payment");
  const { user } = useAuth();
  const { company } = useCompany();
  const userAgent =
    typeof window !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );
  if (!user) return;

  const handleFetch = async () => {
    try {
      setLoading(true);
      const res = await fetchReceipt(id, user.companyId);
      setData(res);
      toast.success("تم جلب بيانات الفاتورة بنجاح");
    } catch (error) {
      console.error(error);
      toast.error("فشل في جلب بيانات الفاتورة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={<button onClick={handleFetch}>عرض الفاتورة</button>}
      style="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl"
      description="  قم بإدخال المبلغ الجديد لتسديد جزء أو كل الدين."
    >
      {!data ? (
        <div className="text-muted-foreground p-6 text-center text-sm">
          {loading ? "جاري تحميل بيانات الفاتورة..." : "لا توجد بيانات بعد"}
        </div>
      ) : (
        <div
          id="receipt-content"
          className="rounded-md text-amber-50"
          dir="rtl"
        >
          {/* Header Info */}
          <div className="mb-2 flex flex-col items-center justify-center text-center text-amber-50">
            <h2 className="text-lg font-bold">
              فاتورة رقم: {data.sale_number}
            </h2>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span>العميل: {data.customer_name || "بدون"}</span>
              <span>الكاشير: {data.user_name || "غير محدد"}</span>
              <span>طريقة الدفع: {data.is_cash ? "نقدي" : "آجل / دين"}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="w-80 sm:w-[480px] md:w-3xl lg:w-full">
            <ScrollArea className="top-3 h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
              <Table className="w-full">
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="border-amber-300">
                    <TableHead>م</TableHead>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("warehouse")}</TableHead>
                    <TableHead>{t("quantity")}</TableHead>
                    <TableHead>{t("unit_type")}</TableHead>
                    <TableHead>{t("price")}</TableHead>
                    <TableHead>{t("total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items?.length > 0 ? (
                    data.items.map((item: any, index: number) => {
                      const unitPrice =
                        item.pricePerUnit ||
                        item.pricePerPacket ||
                        item.pricePerCarton ||
                        0;
                      const total = unitPrice * item.selectedQty;

                      return (
                        <TableRow key={`${item.id}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.warehousename}</TableCell>
                          <TableCell>{item.selectedQty}</TableCell>
                          <TableCell>{item.sellingUnit}</TableCell>
                          <TableCell>{unitPrice.toFixed(2)}</TableCell>
                          <TableCell>{total.toFixed(2)} ﷼</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        لا توجد منتجات في هذه الفاتورة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Separator className="my-2 bg-black" />

              {/* Totals Section */}
              <div className="flex flex-col justify-between gap-4 text-sm sm:flex-row">
                <Label>
                  {t("discount")}:{" "}
                  {data.discount_amount ? Number(data.discount_amount) : "0.00"}{" "}
                  ﷼
                </Label>
                <Label>
                  {t("total_before")}: {data.total_before ?? 0} ﷼
                </Label>
                <Label>
                  {t("total_after")}: {data.total_after ?? 0} ﷼
                </Label>
                <Label>
                  {t("received_amount")}: {data.received_amount ?? 0} ﷼
                </Label>
                <Label
                  className={
                    Number(data.calculated_change) < 0
                      ? "text-red-500"
                      : "text-green-600"
                  }
                >
                  {Number(data.calculated_change) < 0
                    ? `على الزبون: ${Math.abs(Number(data.calculated_change))} ﷼`
                    : `له: ${data.calculated_change ?? 0} ﷼`}
                </Label>
              </div>

              {/* Previous Debts */}
              {data.customer_debt > 0 && (
                <div className="mt-2 flex flex-col text-sm" dir="rtl">
                  <Label>
                    {t("previous_debts")}: {data.customer_debt} ﷼
                  </Label>
                </div>
              )}

              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Print Button */}
      {data && (
        <div className="mt-3 flex justify-center">
          {isMobileUA ? (
            <PrintButton
              saleNumber={data.sale_number ?? ""}
              items={data.items ?? []}
              totals={{
                totalBefore: Number(data.total_before ?? 0),
                discount: Number(data.discount_amount ?? 0),
                totalAfter: Number(data.total_after ?? 0),
              }}
              receivedAmount={Number(data.received_amount ?? 0)}
              calculatedChange={Number(data.calculated_change ?? 0)}
              userName={data.user_name ?? ""}
              customerName={data.customer_name ?? ""}
              customerDebt={Number(data.customer_debt ?? 0)}
              isCash={Boolean(data.is_cash)}
              t={t}
              company={company}
            />
          ) : (
            <Receipt
              saleNumber={data.sale_number ?? ""}
              items={data.items ?? []}
              totals={{
                totalBefore: Number(data.total_before ?? 0),
                discount: Number(data.discount_amount ?? 0),
                totalAfter: Number(data.total_after ?? 0),
              }}
              receivedAmount={Number(data.received_amount ?? 0)}
              calculatedChange={Number(data.calculated_change ?? 0)}
              userName={data.user_name ?? ""}
              customerName={data.customer_name ?? ""}
              customerDebt={Number(data.customer_debt ?? 0)}
              isCash={Boolean(data.is_cash)}
              t={t}
              company={company}
            />
          )}
        </div>
      )}
    </Dailogreuse>
  );
}
