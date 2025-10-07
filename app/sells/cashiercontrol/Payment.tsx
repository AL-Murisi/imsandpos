"use client";
import CustomDialog from "@/components/common/Dailog";
import SearchInput from "@/components/common/searchtest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTablePrams } from "@/hooks/useTableParams";
import { useAuth } from "@/lib/context/AuthContext";
import { selectActiveCartItems, selectCartTotals } from "@/lib/selectors";
import {
  changeSellingUnit,
  clearCart,
  removeFromCart,
  setDiscount,
  updateQty,
} from "@/lib/slices/cartSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { CashierItem, CashierSchema } from "@/lib/zod/cashier";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Package2Icon, Plus, Printer, Trash2Icon } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
// import html2pdf from "html2pdf.js";

type Cashier = z.infer<typeof CashierSchema>;

export interface PaymentProps {
  users: {
    id?: string;
    name?: string;
    phoneNumber?: string | null;
    totalDebt?: number;
  } | null;
}

export default function Payment({ users }: PaymentProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectActiveCartItems);
  const totals = useAppSelector(selectCartTotals);
  const cartState = useAppSelector((s) => s.cart);

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<Cashier>({
    resolver: zodResolver(CashierSchema),
  });

  const receivedAmount = watch("receivedAmount");
  const calculatedChange =
    receivedAmount >= totals.totalAfter
      ? receivedAmount - totals.totalAfter
      : 0;
  const paymentType = receivedAmount >= totals.totalAfter ? "نقدي" : "آجل";
  const generateSaleNumber = () => {
    return `SALE-${Date.now().toString().slice(-5)}`;
  };

  const getItemPrice = (item: CashierItem) => {
    switch (item.sellingUnit) {
      case "unit":
        return item.pricePerUnit ?? 0;
      case "packet":
        return item.pricePerPacket ?? 0;
      case "carton":
        return item.pricePerCarton ?? 0;
      default:
        return 0;
    }
  };
  const [saleNumber] = React.useState(
    () => `SALE-${Date.now().toString().slice(-5)}`,
  );
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    warehouseId,
    supplierId,
    categoryId,
    setParam,
  } = useTablePrams();
  const handelpayment = async () => {
    const currenrSalasNum = generateSaleNumber();
    const payment: Cashier = {
      cart: items,
      discountValue: cartState.discountValue,
      discountType: cartState.discountType,
      totalBeforeDiscount: totals.totalBefore,
      totalDiscount: totals.discount,
      totalAfterDiscount: totals.totalAfter,
      cashierId: user?.userId ?? "",
      customerId: users?.id,
      saleNumber: saleNumber,
      receivedAmount,
      change: calculatedChange,
      paidAt: new Date(),
    };
    try {
      const response = await fetch("/api/cashier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      });
      if (!response.ok) throw new Error("خطأ أثناء المعالجة");
      await response.json();

      toast("✅ تم الدفع بنجاح!");
      setParam("categoryId", "");
      dispatch(clearCart());
      dispatch(setDiscount({ type: "fixed", value: 0 }));
    } catch (err: any) {
      alert(`❌ حدث خطأ: ${err.message}`);
    }
  };
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            direction: rtl;
            padding: 10px;
            background: #fff;
            color: #000;
          }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .mb-2 { margin-bottom: 8px; }
          .gap-2 { gap: 8px; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .text-sm { font-size: 12px; }
          .text-lg { font-size: 16px; font-weight: bold; }
          .border { border: 1px solid black; }
          .rounded-2xl { border-radius: 12px; }
          .p-2 { padding: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid black; padding: 4px; text-align: center; font-size: 12px; }
          th { background-color: #f0f0f0; }
          .separator { border-top: 2px solid black; margin: 8px 0; }
          .totals-label { width: 80px; text-align: right; }
          .totals-value { width: 160px; border: 1px solid black; border-radius: 12px; padding: 4px; text-align: right; }
          .badge { display: inline-block; background: #f0f0f0; padding: 2px 6px; border-radius: 8px; margin-right: 4px; }
          .text-center { text-align: center; }
          .text-xs { font-size: 10px; }
          .green { color: green; }
          .grey { color: grey; }
        </style>
      </head>
      <body>
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <span style="font-size:20px;">📦</span>
            <span class="text-lg">اسم الشركة</span>
          </div>
          <span>المتجر الرئيسي</span>
        </div>

        <div class="separator"></div>

        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>📅 التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
          <div>⏰ الوقت: ${new Date().toLocaleTimeString("ar-EG", {
            hour12: false,
          })}</div>
          <div>👨‍💼 الكاشير: ${user?.name ?? "غير معروف"}</div>
          <div>🧾 رقم الفاتورة: ${saleNumber}</div>
          <div>customer: <span class="badge">${users?.name ?? ""}</span></div>
        </div>

        <table class="border-radius: 12px">
          <thead>
            <tr>
            <th>م</th>
              <th>المنتج</th>
              <th>مستودع</th>
              <th>الكمية</th>
              <th>النوع</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.warehousename}</td>
                <td>${item.selectedQty}</td>
                <td>${item.sellingUnit}</td>
                <td>${getItemPrice(item)}</td>
                <td>${(getItemPrice(item) * item.selectedQty).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="separator"></div>

        <div class="flex justify-between">
          <div>
            <div class="flex gap-4 text-sm my-1">
              <span class="totals-label">الإجمالي:</span>
              <span class="totals-value">${totals.totalBefore.toFixed(
                2,
              )} ﷼</span>
            </div>
            <div class="flex gap-4 text-sm my-1">
              <span class="totals-label">الخصم:</span>
              <span class="totals-value">${totals.discount.toFixed(2)} ﷼</span>
            </div>
            <div class="flex gap-4 text-sm my-1">
              <span class="totals-label">المبلغ المستحق:</span>
              <span class="totals-value">${totals.totalAfter.toFixed(
                2,
              )} ﷼</span>
            </div>
            <div class="flex gap-4 text-sm my-1">
              <span class="totals-label">المبلغ المدفوع:</span>
              <span class="totals-value">${
                receivedAmount?.toFixed(2) ?? 0
              } ﷼</span>
            </div>
            <div class="flex gap-4 text-sm my-1 ${
              calculatedChange > 0 ? "green" : "grey"
            }">
              <span class="totals-label">المتبقي للعميل:</span>
              <span class="totals-value">${calculatedChange.toFixed(2)} ﷼</span>
            </div>
          </div>
          <div>
            ${
              users && users.totalDebt && users.totalDebt > 0
                ? `
              <div class="flex gap-2">
                <span>ديون سابقة:</span>
                <span class="totals-value">${users.totalDebt} ﷼</span>
              </div>
            `
                : ""
            }
          </div>
        </div>

        <div class="separator"></div>

        <div class="text-center text-xs mt-4">
          <p>شكرًا لتسوقك معنا!</p>
        </div>
      </body>
      </html>
    `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // const handleDownloadPDF = () => {
  //   const receipt = document.getElementById("receipt-content");
  //   if (receipt) {
  //     html2pdf().from(receipt).set({
  //       margin: 0.5,
  //       filename: `receipt-${payment.saleNumber}.pdf`,
  //       html2canvas: { scale: 2 },
  //       jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
  //     }).save();
  //   }
  // };

  return (
    <CustomDialog
      trigger={
        <Button
          variant="outline"
          className="flex-1 rounded-md border-amber-500 py-3 text-amber-600 shadow-md hover:bg-amber-50"
        >
          ادفع الآن
        </Button>
      }
      title="إيصال البيع"
      description="ملخص الفاتورة"
    >
      <ScrollArea>
        <SearchInput placeholder={"customer بحث "} paramKey="users" />
        <div
          id="receipt-content"
          className="rounded-md bg-white p-4 text-black"
        >
          {/* HEADER */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package2Icon />
              <span className="text-lg font-bold">اسم الشركة</span>
            </div>
            <Label>المتجر الرئيسي</Label>
          </div>
          <Separator className="my-2 bg-black" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Label>📅 التاريخ: {new Date().toLocaleDateString("ar-EG")}</Label>
            <Label>
              ⏰ الوقت:{" "}
              {new Date().toLocaleTimeString("ar-EG", { hour12: false })}
            </Label>
            <Label>👨‍💼 الكاشير: {user?.name ?? "غير معروف"}</Label>
            <Label>🧾 رقم الفاتورة: {saleNumber}</Label>
            <Label>🧾 رقم الفاتورة: {paymentType}</Label>
            <div>
              <Label>
                customer: <Badge>{users?.name ?? ""}</Badge>
              </Label>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <Table className="">
            <TableHeader className="border-amber-300 border-l-red-400">
              <TableRow className="border-amber-300">
                <TableHead className="border-amber-300 text-right">
                  منتج
                </TableHead>
                <TableHead className="border-amber-300 text-right">
                  المنتج
                </TableHead>
                <TableHead className="text-right"> مستودع</TableHead>
                <TableHead className="text-right"> الكمية </TableHead>
                <TableHead className="text-right"> النوع</TableHead>
                <TableHead className="text-right"> السعر</TableHead>
                <TableHead className="text-right"> الإجمالي </TableHead>
                <TableHead className="text-right"> إجراء </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const itemPrice = getItemPrice(item);

                return (
                  <TableRow
                    key={`${item.id}-${item.sellingUnit}`}
                    className="border-amber-300 border-r-amber-300"
                  >
                    <TableCell className="border-l-red-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="border-l-red-400">
                      {item.name}
                    </TableCell>
                    <TableCell> {item.warehousename}</TableCell>
                    <TableCell>
                      {" "}
                      <button
                        disabled={item.selectedQty <= 1}
                        onClick={() => {
                          dispatch(
                            updateQty({
                              id: item.id,
                              sellingUnit: item.sellingUnit,
                              quantity: 1,
                              action: "mins",
                            }),
                          );
                        }}
                        className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        value={item.selectedQty}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value) || 1);
                          dispatch(
                            updateQty({
                              id: item.id,
                              sellingUnit: item.sellingUnit,
                              quantity: 1,
                              action: "",
                            }),
                          );
                        }}
                        className="w-16 rounded border bg-white px-2 py-1 text-center text-black dark:bg-gray-800 dark:text-white"
                        min={1}
                        // max={maxQty}
                      />
                      <button
                        disabled={
                          item.selectedQty >= item.originalStockQuantity
                        }
                        onClick={() => {
                          dispatch(
                            updateQty({
                              id: item.id,
                              sellingUnit: item.sellingUnit,
                              quantity: 1,
                              action: "plus",
                            }),
                          );
                        }}
                        className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
                      >
                        <Plus size={16} />
                      </button>
                    </TableCell>
                    <TableCell>
                      <select
                        value={item.sellingUnit}
                        onChange={(e) =>
                          dispatch(
                            changeSellingUnit({
                              id: item.id,
                              from: item.sellingUnit,
                              to: e.target.value as any,
                              product: {
                                packetsPerCarton: item.packetsPerCarton,
                                unitsPerPacket: item.unitsPerPacket,
                              },
                              qty: item.selectedQty,
                            }),
                          )
                        }
                      >
                        <option value="carton">كرتون</option>
                        <option value="packet">حزمة</option>
                        <option value="unit">وحدة</option>
                      </select>
                    </TableCell>
                    <TableCell className="w-16 text-center text-sm whitespace-nowrap">
                      ${itemPrice}
                    </TableCell>
                    <TableCell className="w-16 text-center text-sm whitespace-nowrap">
                      ${(itemPrice * item.selectedQty).toFixed(2)}
                    </TableCell>
                    <TableCell className="flex w-12 justify-center">
                      <Button
                        onClick={() => {
                          dispatch(removeFromCart(item.id));
                        }}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2Icon color="red" size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Separator className="my-2 bg-black" />
          <div className="flex flex-row justify-between">
            <div className="flex flex-col justify-end px-3">
              <div className="my-1 flex gap-4 text-sm">
                <Label className="w-20">الإجمالي:</Label>
                <Label className="h-10 w-40 rounded-2xl border-2 border-black p-2">
                  {totals.totalBefore.toFixed(2)} ﷼
                </Label>
              </div>
              {/* <Separator className="my-2 w-30 bg-black" /> */}
              <div className="my-1 flex gap-4 text-sm">
                <Label className="w-20">الخصم:</Label>
                <Label className="h-10 w-40 rounded-2xl border-2 border-black p-2">
                  {totals.discount.toFixed(2)} ﷼
                </Label>
              </div>
              {/* <Separator className="my-2 bg-black" /> */}
              <div className="my-1 flex gap-4 text-sm">
                <Label className="w-20">المبلغ المستحق:</Label>
                <Label className="h-10 w-40 rounded-2xl border-2 border-black p-2">
                  {totals.totalAfter.toFixed(2)} ﷼
                </Label>
              </div>
              {/* <Separator className="my-2 bg-black" /> */}
              <div className="my-1 flex gap-4 text-sm">
                <Label className="w-20">المبلغ المدفوع:</Label>
                <Label className="h-10 w-40 rounded-2xl border-2 border-black p-2">
                  {receivedAmount !== undefined && !isNaN(receivedAmount)
                    ? receivedAmount.toFixed(2)
                    : 0}{" "}
                  ﷼
                </Label>
              </div>
              {/* <Separator className="my-2 bg-black" /> */}
              <div
                className="my-1 flex gap-4 text-sm"
                style={{
                  color: calculatedChange > 0 ? "green" : "grey", // dark green or gray
                }}
              >
                <Label className="w-20">المتبقي للعميل:</Label>
                <Label className="h-10 w-40 rounded-2xl border-2 border-black p-2">
                  {calculatedChange.toFixed(2)} ﷼
                </Label>
              </div>
            </div>

            <div className="flex flex-col justify-start">
              {users && users.totalDebt && users.totalDebt > 0 && (
                <div className="flex gap-2">
                  <Label className="">ديون سابقة:</Label>
                  <Label className="h-10 w-40 rounded-2xl border-2 border-black p-2">
                    {users.totalDebt} ﷼
                  </Label>
                </div>
              )}{" "}
            </div>
          </div>
          <Separator className="my-2 bg-black" />
          <div className="mt-4 text-center text-xs">
            <p>شكرًا لتسوقك معنا!</p>
          </div>
        </div>
        <Separator className="my-2 bg-black" />
        <div className="max-w-md space-y-2">
          <Label htmlFor="receivedAmount">المبلغ المستلم:</Label>
          <Input
            id="receivedAmount"
            type="number"
            step="0.01"
            {...register("receivedAmount", { valueAsNumber: true })}
            className={`border-2 ${
              receivedAmount === totals.totalAfter
                ? "border-green-500"
                : "border-gray-300"
            }`}
            placeholder="أدخل المبلغ المستلم"
          />
          {receivedAmount === totals.totalAfter && (
            <p className="text-sm font-semibold text-green-600">
              ✅ المبلغ مطابق تمامًا
            </p>
          )}
          {receivedAmount !== totals.totalAfter && receivedAmount > 0 && (
            <p className="text-sm text-yellow-600">
              ⚠️ تأكد من أن المبلغ المدفوع يساوي المبلغ المستحق
            </p>
          )}
          {errors.receivedAmount && (
            <p className="text-sm text-red-500">
              {errors.receivedAmount.message}
            </p>
          )}

          <Separator className="my-2 bg-black" />
          <p className="text-center text-xs">شكرًا لتسوقك معنا!</p>
        </div>
        {/* FOOTER BUTTONS */}
        <div className="mt-4 flex justify-between gap-3">
          <Button
            disabled={
              (receivedAmount < totals.totalAfter && !users?.name) ||
              // 2. Or received amount <= 0
              receivedAmount <= 0
            }
            onClick={handelpayment}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            تأكيد الدفع
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer size={16} className="mr-2" /> طباعة
          </Button>
          {/* <Button onClick={handleDownloadPDF} variant="outline">
          <FileDown size={16} className="mr-2" /> PDF
        </Button> */}
        </div>
      </ScrollArea>
    </CustomDialog>
  );
}
