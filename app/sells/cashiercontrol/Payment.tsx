// "use client";
// import React, { useMemo, useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import CustomDialog from "@/components/common/Dailog";
// import { Separator } from "@/components/ui/separator";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { useForm, SubmitHandler } from "react-hook-form"; // Import SubmitHandler
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { CashierItem, CashierSchema, ProductForSale } from "@/lib/zodType";
// import { getAllactiveproductsForSale } from "@/app/actions/createProduct";
// import {
//   addToCart,
//   CartItem,
//   changeSellingUnit,
//   clearCart,
//   removeFromCart,
//   setDiscount,
//   updateQty,
// } from "@/lib/slices/cartSlice";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { updateProductSock } from "@/lib/slices/productsSlice";
// import { Minus, Package2Icon, Plus, Trash2Icon } from "lucide-react";
// import { useAppDispatch, useAppSelector } from "@/lib/store";
// import SearchInput from "@/components/common/searchtest";
// import { selectCartItems, selectCartTotals } from "@/lib/selectors";
// import { useTablePrams } from "@/hooks/useTableParams";
// import { useAuth } from "@/lib/context/AuthContext";
// // Define the type for the form fields based on CashierSchema
// type Cashier = z.infer<typeof CashierSchema>;
// // Payment.tsx
// export interface PaymentProps {
//   users: {
//     id?: string;
//     name?: string;
//     phoneNumber?: string | null;
//     totalDebt?: number;
//   } | null; // ✅ allow null
// }

// export default function Payment({
//   users,
// }: // onSuccess, // ✅ callback

// PaymentProps) {
//   // onSuccess?: () => void; // ✅ declare prop
//   // Define the default values that match CashierFormValues directly.
//   // Ensure 'paidAt' is initialized as a Date object.
//   const { user, hasAnyRole, logout } = useAuth();

//   const {
//     register,
//     handleSubmit,
//     watch,
//     formState: { errors },
//     reset,
//     setValue,
//   } = useForm<Cashier>({
//     resolver: zodResolver(CashierSchema),
//   });
//   const dispatch = useAppDispatch();
//   const itempayment = useAppSelector((s) => s.cart);
//   const items = useAppSelector(selectCartItems);
//   const receivedAmount = watch("receivedAmount");
//   const totalBeforeDiscount = watch("totalBeforeDiscount");

//   const totals = useAppSelector(selectCartTotals);
//   const calculatedChange =
//     receivedAmount >= totals.totalAfter
//       ? receivedAmount - totals.totalAfter
//       : 0;

//   const payment: Cashier = {
//     cart: items,

//     discountValue: itempayment.discountValue,
//     discountType: itempayment.discountType,
//     totalBeforeDiscount: totals.totalBefore,
//     totalDiscount: totals.discount,
//     totalAfterDiscount: totals.totalAfter,
//     cashierId: user?.userId ?? "",
//     customerId: users?.id,
//     saleNumber: `SALE-${Date.now()}`,
//     receivedAmount: receivedAmount,
//     change: calculatedChange,
//     paidAt: new Date(),
//   };

//   const {
//     pagination,
//     sorting,
//     globalFilter,
//     setPagination,
//     setSorting,
//     setGlobalFilter,
//     warehouseId,
//     supplierId,
//     categoryId,
//     setParam,
//   } = useTablePrams();
//   // Ensure the onSubmit function matches SubmitHandler<CashierFormValues>
//   const handelpayment = async () => {
//     console.log(payment);
//     try {
//       const response = await fetch("/api/cashier", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payment),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "خطأ أثناء المعالجة");
//       }
//       setParam("All");
//       const result = await response.json();
//       alert("تم الدفع بنجاح!");
//       console.log("Sale Result:", result);
//       dispatch(clearCart()),
//         dispatch(
//           setDiscount({
//             type: "fixed",
//             value: 0,
//           })
//         );

//       // onSuccess?.();
//     } catch (err: any) {
//       alert(`حدث خطأ: ${err.message}`);
//       console.error("Error during payment:", err);
//     }
//   };

//   const getItemPrice = (item: CashierItem) => {
//     switch (item.sellingUnit) {
//       case "unit":
//         return item.pricePerUnit ?? 0;
//       case "packet":
//         return item.pricePerPacket ?? 0;
//       case "carton":
//         return item.pricePerCarton ?? 0;
//       default:
//         return 0;
//     }
//   };

//   function addtoPayment(): any {
//     throw new Error("Function not implemented.");
//   }

//   return (
//     <>
//       <CustomDialog
//         trigger={
//           <Button
//             variant="outline"
//             className="flex-1 py-3 rounded-md shadow-md hover:shadow-lg transition-shadow border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900"
//           >
//             ادفع الآن
//           </Button>
//         }
//         title="نظام إدارة المخزون"
//         description="إيصال بيع"
//       >
//         <div className="text-mdfont-mono text-right w-full p-4 rounded-md ">
//           <SearchInput placeholder={"customer بحث "} paramKey="users" />
//           {/* <SearchInput placeholder={"بحث "} paramKey="productr" /> */}

//           <div className="text-md font-mono text-right w-full  mx-auto p-4 rounded-md bg-white  text-black border border-gray-300 dark:border-gray-700">
//             <div className="w-full  overflow-auto border border-amber-300  rounded-2xl pb-2.5">
//               <div className="flex justify-between items-center text-lg mb-1 px-2">
//                 {/* اسم المتجر */}
//                 <div className="flex items-center gap-2">
//                   {/* <img
//                     src="/logo.png" // ضع مسار شعار شركتك هنا
//                     alt="شعار الشركة"
//                     className="w-10 h-10 object-contain"
//                   /> */}
//                   <Package2Icon />
//                   <span className="font-bold text-lg">اسم الشركة هنا</span>
//                 </div>

//                 {/* عنوان الإيصال أو المتجر */}
//                 <Label>اسم المتجر</Label>
//               </div>

//               <Separator className="my-2 bg-black" />
//               <div className="flex justify-between mb-1">
//                 <Label>التاريخ:</Label>
//                 <Label>{new Date().toLocaleDateString("ar-EG")}</Label>
//               </div>
//               <div className="flex justify-between mb-2">
//                 <Label>الوقت:</Label>
//                 <Label>
//                   {new Date().toLocaleTimeString("ar-EG", { hour12: false })}
//                 </Label>
//               </div>
//               <div>
//                 <Label>
//                   الكاشير: <Badge>محمد</Badge>
//                 </Label>
//               </div>

//               <div className="mt-1">
//                 <Label>
//                   رقم الفاتورة: <Badge>{payment.saleNumber}</Badge>
//                 </Label>
//               </div>

//               <Separator className="my-2 bg-amber-300" />
//               {/* Totals */}

//           <Separator className="my-2" />

//           <div className="grid grid-cols-2 gap-4">
//             <Button
//               onClick={handelpayment}
//               className={`bg-popover-foreground text-background ${
//                 receivedAmount >= totals.totalAfter
//                   ? "hover:bg-green-600"
//                   : "opacity-50 cursor-not-allowed"
//               }`}
//               type="submit"
//             >
//               تأكيد الدفع
//             </Button>
//           </div>
//         </div>
//       </CustomDialog>
//     </>
//   );
// }
"use client";
import CustomDialog from "@/components/common/Dailog";
import SearchInput from "@/components/common/searchtest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CashierItem, CashierSchema } from "@/lib/zodType";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Package2Icon, Plus, Printer, Trash2Icon } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
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
    () => `SALE-${Date.now().toString().slice(-5)}`
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
      alert("✅ تم الدفع بنجاح!");

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
          <div>الكاشير: <span class="badge">${
            users?.name ?? "غير معروف"
          }</span></div>
        </div>

        <table>
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
            `
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
                2
              )} ﷼</span>
            </div>
            <div class="flex gap-4 text-sm my-1">
              <span class="totals-label">الخصم:</span>
              <span class="totals-value">${totals.discount.toFixed(2)} ﷼</span>
            </div>
            <div class="flex gap-4 text-sm my-1">
              <span class="totals-label">المبلغ المستحق:</span>
              <span class="totals-value">${totals.totalAfter.toFixed(
                2
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
          className="flex-1 py-3 rounded-md shadow-md border-amber-500 text-amber-600 hover:bg-amber-50"
        >
          ادفع الآن
        </Button>
      }
      title="إيصال البيع"
      description="ملخص الفاتورة"
    >
      {" "}
      <SearchInput placeholder={"customer بحث "} paramKey="users" />
      <div id="receipt-content" className="bg-white text-black p-4 rounded-md">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Package2Icon />
            <span className="font-bold text-lg">اسم الشركة</span>
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
              customer: <Badge>{users?.name ?? "غير معروف"}</Badge>
            </Label>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <Table className="">
          <TableHeader className="border-amber-300 border-l-red-400">
            <TableRow className="border-amber-300">
              <TableHead className="text-right border-amber-300">
                منتج
              </TableHead>
              <TableHead className="text-right border-amber-300">
                المنتج
              </TableHead>
              <TableHead className="text-right "> مستودع</TableHead>
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
                          })
                        );
                      }}
                      className="p-1 rounded bg-primary text-background disabled:bg-gray-400"
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
                          })
                        );
                      }}
                      className="w-12 px-2 py-1 text-center border rounded text-black dark:text-white bg-white dark:bg-gray-800"
                      min={1}
                      // max={maxQty}
                    />
                    <button
                      disabled={item.selectedQty >= item.originalStockQuantity}
                      onClick={() => {
                        dispatch(
                          updateQty({
                            id: item.id,
                            sellingUnit: item.sellingUnit,
                            quantity: 1,
                            action: "plus",
                          })
                        );
                      }}
                      className="p-1 bg-primary text-background rounded disabled:bg-gray-400"
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
                          })
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
                  <TableCell className="w-12 flex justify-center">
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
        <div className="flex flex-row justify-between  ">
          <div className="flex  flex-col justify-end px-3 ">
            <div className="flex gap-4 text-sm my-1">
              <Label className="w-20">الإجمالي:</Label>
              <Label className="border-2 border-black  h-10 w-40 rounded-2xl  p-2">
                {totals.totalBefore.toFixed(2)} ﷼
              </Label>
            </div>
            {/* <Separator className="my-2 w-30 bg-black" /> */}
            <div className="flex gap-4 text-sm my-1">
              <Label className="w-20">الخصم:</Label>
              <Label className="border-2 border-black  h-10 w-40 rounded-2xl  p-2">
                {totals.discount.toFixed(2)} ﷼
              </Label>
            </div>
            {/* <Separator className="my-2 bg-black" /> */}
            <div className="flex gap-4 text-sm my-1">
              <Label className="w-20">المبلغ المستحق:</Label>
              <Label className="border-2 border-black  h-10 w-40 rounded-2xl  p-2 ">
                {totals.totalAfter.toFixed(2)} ﷼
              </Label>
            </div>
            {/* <Separator className="my-2 bg-black" /> */}
            <div className="flex gap-4 text-sm my-1">
              <Label className="w-20">المبلغ المدفوع:</Label>
              <Label className="border-2 border-black  h-10 w-40 rounded-2xl p-2">
                {receivedAmount !== undefined && !isNaN(receivedAmount)
                  ? receivedAmount.toFixed(2)
                  : 0}{" "}
                ﷼
              </Label>
            </div>
            {/* <Separator className="my-2 bg-black" /> */}
            <div
              className="flex gap-4 text-sm my-1"
              style={{
                color: calculatedChange > 0 ? "green" : "grey", // dark green or gray
              }}
            >
              <Label className="w-20">المتبقي للعميل:</Label>
              <Label className="border-2 border-black h-10 w-40 rounded-2xl  p-2">
                {calculatedChange.toFixed(2)} ﷼
              </Label>
            </div>
          </div>

          <div className="flex flex-col justify-start ">
            {users && users.totalDebt && users.totalDebt > 0 && (
              <div className="flex gap-2">
                <Label className="">ديون سابقة:</Label>
                <Label className="border-2 border-black h-10 w-40 rounded-2xl  p-2">
                  {users.totalDebt} ﷼
                </Label>
              </div>
            )}{" "}
          </div>
        </div>
        <Separator className="my-2 bg-black" />
        <div className="text-center text-xs mt-4">
          <p>شكرًا لتسوقك معنا!</p>
        </div>
      </div>
      <Separator className="my-2 bg-black" />
      <div className="space-y-2 max-w-md">
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
          <p className="text-green-600 text-sm font-semibold">
            ✅ المبلغ مطابق تمامًا
          </p>
        )}
        {receivedAmount !== totals.totalAfter && receivedAmount > 0 && (
          <p className="text-yellow-600 text-sm">
            ⚠️ تأكد من أن المبلغ المدفوع يساوي المبلغ المستحق
          </p>
        )}
        {errors.receivedAmount && (
          <p className="text-red-500 text-sm">
            {errors.receivedAmount.message}
          </p>
        )}

        <Separator className="my-2 bg-black" />
        <p className="text-center text-xs">شكرًا لتسوقك معنا!</p>
      </div>
      {/* FOOTER BUTTONS */}
      <div className="flex gap-3 mt-4 justify-between">
        <Button
          onClick={handelpayment}
          className="bg-green-600 hover:bg-green-700 text-white"
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
    </CustomDialog>
  );
}
