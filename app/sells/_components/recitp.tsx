"use client";

import { fetchReceipt } from "@/app/actions/sells";
import { Receipt } from "@/components/common/recipt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package2Icon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type Props = {
  id: string;
};

export default function Recitp({ id }: Props) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const t = useTranslations("payment");

  const handleFetch = async () => {
    try {
      setLoading(true);
      const debt = await fetchReceipt(id);
      setData(debt);
      toast.success("تم جلب بيانات الفاتورة بنجاح");
    } catch (error) {
      console.error(error);
      toast.error("فشل في جلب بيانات الفاتورة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button onClick={handleFetch} disabled={loading}>
          {loading ? "جاري التحميل..." : "عرض الفاتورة"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl">
        {!data ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            {loading ? "جاري تحميل بيانات الفاتورة..." : "لا توجد بيانات بعد"}
          </div>
        ) : (
          <div id="receipt-content" className="rounded-md text-amber-50">
            {/* Header */}
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
                      <TableHead>{t("action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items?.length > 0 ? (
                      data.items.map((item: any, index: number) => (
                        <TableRow key={`${item.id}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.warehousename}</TableCell>
                          <TableCell>{item.selectedQty}</TableCell>
                          <TableCell>{item.sellingUnit}</TableCell>
                          <TableCell>
                            {item.pricePerUnit ||
                              item.pricePerPacket ||
                              item.pricePerCarton ||
                              0}
                          </TableCell>
                          <TableCell>
                            {(
                              (item.pricePerUnit ||
                                item.pricePerPacket ||
                                item.pricePerCarton ||
                                0) * item.selectedQty
                            ).toFixed(2)}{" "}
                            ﷼
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <Trash2Icon color="red" size={18} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
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
                {/* Totals */}
                <div
                  className="flex flex-col justify-between gap-4 text-sm sm:flex-row"
                  dir="rtl"
                >
                  <Label>
                    {t("total_before")}: {data?.totalBefore?.toFixed(2)} ﷼
                  </Label>
                  <Label>
                    {t("discount")}: {data?.discount?.toFixed(2)} ﷼
                  </Label>
                  <Label>
                    {t("total_after")}: {data?.totalAfter?.toFixed(2)} ﷼
                  </Label>

                  {data?.customerDebt && data?.customerDebt > 0 && (
                    <div className="flex flex-col justify-start">
                      <Label>
                        {t("previous_debts")}: {data?.customerDebt} ﷼
                      </Label>
                    </div>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </div>
        )}
        {/* Print Button */}
        <div className="mt-3 flex justify-center">
          <Receipt
            saleNumber={data?.saleNumber ?? ""}
            items={data?.items ?? []}
            totals={{
              totalBefore: data?.totalBefore ?? 0,
              discount: data?.discount ?? 0,
              totalAfter: data?.totalAfter ?? 0,
            }}
            receivedAmount={data?.receivedAmount}
            calculatedChange={data?.calculatedChange ?? 0}
            userName={data?.userName}
            customerName={data?.customerName}
            customerDebt={data?.customerDebt}
            isCash={data?.isCash ?? true}
            t={t}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
