// "use client";

// import { createExpense } from "@/lib/actions/exponses";
// import { SelectField } from "@/components/common/selectproduct";
// import { Button } from "@/components/ui/button";
// import Dailogreuse from "@/components/common/dailogreuse";
// import { Input } from "@/components/ui/input";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Textarea } from "@/components/ui/textarea";
// import { useAuth } from "@/lib/context/AuthContext";
// import { useEffect, useState, useTransition } from "react";
// import { Controller, useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { Fetchbanks } from "@/lib/actions/banks";
// import { Label } from "@/components/ui/label";

// interface ExpenseFormInput {
//   account_id: string;
//   description: string;
//   amount: string;
//   expense_date: string;
//   paymentMethod: string;
//   currency_code: string;
//   referenceNumber?: string;
//   bankId?: string;
//   notes?: string;
// }

// interface ExpenseFormProps {
//   companyId: string;
//   userId: string;
//   categories: { id: string; name: string }[];
// }

// export default function ExpenseForm({
//   companyId,
//   userId,
//   categories,
// }: ExpenseFormProps) {
//   const [isPending, startTransition] = useTransition();
//   const [open, setOpen] = useState(false);
//   const [selectOpen, setSelectOpen] = useState(false);
//   const {
//     register,
//     handleSubmit,
//     reset,
//     control,
//     setValue,
//     watch,
//     formState: { errors },
//     setError,
//   } = useForm<ExpenseFormInput>();
//   const { user } = useAuth();
//   const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
//   const [selectedBankId, setSelectedBankId] = useState("");
//   const [paymentMethod, setPaymentMethod] = useState("");

//   if (!user) return;

//   useEffect(() => {
//     if (paymentMethod !== "bank" || !open) {
//       setBanks([]);
//       setSelectedBankId("");
//       return;
//     }

//     const loadBanks = async () => {
//       try {
//         const result = await Fetchbanks();
//         setBanks(result);
//       } catch (err) {
//         console.error(err);
//         toast.error("فشل في جلب البنوك");
//       }
//     };

//     loadBanks();
//   }, [open, paymentMethod]);

//   const onSubmit = (values: ExpenseFormInput) => {
//     if (!paymentMethod) {
//       toast.error("يرجى اختيار طريقة الدفع.");
//       return;
//     }
//     if (!selectedBankId && paymentMethod === "bank") {
//       toast.error("يرجى اختيار البنك.");
//       return;
//     }
//     if (!values.account_id) {
//       toast.error("يرجى اختيار فئة المصروف.");
//       return;
//     }
//     const parsedAmount = Number(values.amount);

//     if (isNaN(parsedAmount) || parsedAmount <= 0) {
//       setError("amount", {
//         type: "manual",
//         message: "يجب أن يكون المبلغ رقماً أكبر من صفر",
//       });
//       return;
//     }

//     startTransition(async () => {
//       const payload = {
//         ...values,
//         paymentMethod: paymentMethod,
//         amount: parsedAmount,
//         bankId: selectedBankId,
//         expense_date: new Date(),
//       };

//       const res = await createExpense(user.companyId, user.userId, payload);

//       if (res.success) {
//         toast.success(`تمت إضافة المصروف بنجاح (المبلغ: ${parsedAmount})`);
//         setOpen(false);
//         reset();
//       } else {
//         toast.error(res.error || "حدث خطأ أثناء إنشاء المصروف");
//       }
//     });
//   };
//   const account_id = watch("account_id");
//   // ✅ Inside onSubmit: just close dialog on success
//   const paymentMethods = [
//     { id: "cash", name: "نقداً" },
//     { id: "bank", name: "تحويل بنكي" },
//     { id: "check", name: "شيك" },
//     { id: "credit", name: "ائتمان" },
//   ];
//   const currencyOptions = [
//     { name: "الريال اليمني (YER)", id: "YER" },
//     { name: "الدولار الأمريكي (USD)", id: "USD" },
//     { name: "الريال السعودي (SAR)", id: "SAR" },
//     { name: "اليورو (EUR)", id: "EUR" },
//     { name: "الدينار الكويتي (KWD)", id: "KWD" },
//   ];
//   const accountCategories = [
//     {
//       id: "COST_OF_GOODS_SOLD",
//       name: "تكلفة البضاعة المباعة",
//       type: "EXPENSE",
//     },
//     { id: "OPERATING_EXPENSES", name: "مصاريف تشغيلية", type: "EXPENSE" },
//     { id: "PAYROLL_EXPENSES", name: "مصاريف رواتب", type: "EXPENSE" },
//     {
//       id: "ADMINISTRATIVE_EXPENSES",
//       name: "مصاريف إدارية",
//       type: "EXPENSE",
//     },
//     { id: "OTHER_EXPENSES", name: "مصاريف أخرى", type: "EXPENSE" },
//     { id: "HOUSE_EXPENSES", name: "مصاريف منزلية", type: "EXPENSE" },
//   ];
//   // ...
//   return (
//     <Dailogreuse
//       open={open}
//       setOpen={setOpen}
//       btnLabl="إضافة مصروف"
//       style="sm:max-w-md"
//       titel="إضافة مصروف"
//     >
//       <ScrollArea>
//         <form
//           onSubmit={handleSubmit(onSubmit)}
//           className="rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-xl"
//           dir="rtl"
//         >
//           <h2 className="border-b border-gray-700 pb-3 text-2xl font-bold text-gray-100">
//             ➕ إضافة مصروف جديد
//           </h2>

//           {/* Category */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-200">
//               فئة المصروف
//             </label>
//             <SelectField
//               options={categories}
//               value={account_id}
//               action={(val) => {
//                 setValue("account_id", val, { shouldValidate: true }); // Trigger validation on change
//               }}
//               placeholder="اختر الفئة"
//             />

//             {errors.account_id && (
//               <p className="mt-1 text-xs text-red-400">
//                 {errors.account_id.message}
//               </p>
//             )}
//           </div>

//           {/* Description */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-200">
//               الوصف
//             </label>
//             <Input
//               type="text"
//               placeholder="أدخل وصف المصروف"
//               {...register("description", { required: "يرجى إدخال الوصف" })}
//               className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//             />
//             {errors.description && (
//               <p className="mt-1 text-xs text-red-400">
//                 {errors.description.message}
//               </p>
//             )}
//           </div>

//           {/* Amount */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-200">
//               المبلغ
//             </label>
//             <Input
//               type="number"
//               placeholder="أدخل المبلغ"
//               {...register("amount", {
//                 required: "يرجى إدخال المبلغ",
//               })}
//               className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//             />
//             {errors.amount && (
//               <p className="mt-1 text-xs text-red-400">
//                 {errors.amount.message}
//               </p>
//             )}
//           </div>

//           {/* Expense Date */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-200">
//               تاريخ المصروف
//             </label>
//             <Input
//               type="date"
//               defaultValue={new Date().toISOString().split("T")[0]} // "YYYY-MM-DD"
//               {...register("expense_date", {
//                 required: "يرجى تحديد تاريخ المصروف",
//               })}
//               className="border-gray-700 bg-gray-800 text-gray-100"
//             />
//             {errors.expense_date && (
//               <p className="mt-1 text-xs text-red-400">
//                 {errors.expense_date.message}
//               </p>
//             )}
//           </div>

//           {/* Payment Method */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-200">
//               طريقة الدفع
//             </label>

//             <SelectField
//               options={paymentMethods}
//               value={paymentMethod}
//               action={(val) => setPaymentMethod(val)}
//               placeholder="اختر طريقة الدفع"
//             />
//           </div>
//           <div className="grid gap-2">
//             <Label htmlFor="currency_code">العملة </Label>
//             <SelectField
//               options={currencyOptions}
//               value={watch("currency_code")}
//               action={(value: string) =>
//                 setValue(
//                   "currency_code",
//                   value as "YER" | "USD" | "SAR" | "EUR" | "KWD",
//                 )
//               }
//               placeholder="اختر العملة"
//             />
//           </div>
//           {paymentMethod === "bank" && (
//             <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//               <div className="grid gap-3">
//                 <Label>البنك</Label>
//                 <SelectField
//                   options={banks}
//                   value={selectedBankId}
//                   action={(val) => {
//                     setSelectedBankId(val);
//                     // If you want to track bankId in the form state:
//                     setValue("bankId", val, { shouldValidate: true });
//                   }}
//                   placeholder="اختر البنك"
//                 />
//               </div>
//               <div className="grid gap-3">
//                 <label className="mb-2 block text-sm font-medium text-gray-200">
//                   رقم المرجع (رقم الفاتورة)
//                 </label>
//                 <Input
//                   type="text"
//                   placeholder="أدخل رقم الفاتورة أو المرجع"
//                   {...register("referenceNumber", {
//                     // CONDITIONAL VALIDATION: Required only if paymentMethod is "bank"
//                     required:
//                       paymentMethod === "bank"
//                         ? "يرجى إدخال رقم المرجع للحوالة البنكية"
//                         : false,
//                   })}
//                   className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//                 />
//               </div>{" "}
//             </div>
//           )}
//           {/* Notes */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-200">
//               ملاحظات (اختياري)
//             </label>
//             <Textarea
//               rows={3}
//               placeholder="أدخل أي ملاحظات إضافية"
//               {...register("notes")}
//               className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//             />
//           </div>

//           <Button
//             type="submit"
//             disabled={isPending}
//             className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-600"
//           >
//             {isPending ? "جارٍ الحفظ..." : "💾 حفظ المصروف"}
//           </Button>
//         </form>
//       </ScrollArea>
//     </Dailogreuse>
//   );
// }
"use client";

import { createMultipleExpenses } from "@/lib/actions/exponses";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import Dailogreuse from "@/components/common/dailogreuse";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Fetchbanks } from "@/lib/actions/banks";
import { Plus, Trash2, Save } from "lucide-react";

interface ExpenseItem {
  id: string;
  account_id: string;
  description: string;
  amount: string;
  paymentMethod: string;
  currency_code: string;
  referenceNumber?: string;
  bankId?: string;
  notes?: string;
}

interface MultiExpenseFormProps {
  companyId: string;
  userId: string;
  categories: { id: string; name: string }[];
}

export default function ExpenseForm({
  companyId,
  userId,
  categories,
}: MultiExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const { user } = useAuth();
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);

  // Initialize with one empty expense
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: crypto.randomUUID(),
      account_id: "",
      description: "",
      amount: "",
      paymentMethod: "",
      currency_code: "YER",
      referenceNumber: "",
      bankId: "",
      notes: "",
    },
  ]);

  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },
    { id: "check", name: "شيك" },
    { id: "credit", name: "ائتمان" },
  ];

  const currencyOptions = [
    { name: "الريال اليمني (YER)", id: "YER" },
    { name: "الدولار الأمريكي (USD)", id: "USD" },
    { name: "الريال السعودي (SAR)", id: "SAR" },
    { name: "اليورو (EUR)", id: "EUR" },
    { name: "الدينار الكويتي (KWD)", id: "KWD" },
  ];

  if (!user) return null;

  // Load banks when dialog opens
  useEffect(() => {
    if (!open) {
      setBanks([]);
      return;
    }

    const loadBanks = async () => {
      try {
        const result = await Fetchbanks();
        setBanks(result);
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب البنوك");
      }
    };

    loadBanks();
  }, [open]);

  // Add new expense row
  const addExpense = () => {
    setExpenses([
      ...expenses,
      {
        id: crypto.randomUUID(),
        account_id: "",
        description: "",
        amount: "",
        paymentMethod: "",
        currency_code: "YER",
        referenceNumber: "",
        bankId: "",
        notes: "",
      },
    ]);
  };

  // Remove expense row
  const removeExpense = (id: string) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((exp) => exp.id !== id));
    } else {
      toast.error("يجب أن يكون هناك مصروف واحد على الأقل");
    }
  };

  // Update expense field
  const updateExpense = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenses(
      expenses.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    );
  };

  // Calculate total
  const totalAmount = expenses.reduce(
    (sum, exp) => sum + (parseFloat(exp.amount) || 0),
    0,
  );

  // Validate and submit
  const handleSubmit = async () => {
    // Validation
    const invalidExpenses = expenses.filter(
      (exp) =>
        !exp.account_id ||
        !exp.description ||
        !exp.amount ||
        parseFloat(exp.amount) <= 0 ||
        !exp.paymentMethod ||
        !exp.currency_code,
    );

    if (invalidExpenses.length > 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة لكل مصروف");
      return;
    }

    // Check bank selection for bank payments
    for (const exp of expenses) {
      if (exp.paymentMethod === "bank" && !exp.bankId) {
        toast.error("يرجى اختيار البنك للمصاريف البنكية");
        return;
      }
      if (exp.paymentMethod === "bank" && !exp.referenceNumber) {
        toast.error("يرجى إدخال رقم المرجع للمصاريف البنكية");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare expenses data
      const expensesData = expenses.map((exp) => ({
        account_id: exp.account_id,
        description: exp.description,
        amount: parseFloat(exp.amount),
        expense_date: new Date(expenseDate),
        paymentMethod: exp.paymentMethod,
        currency_code: exp.currency_code,
        referenceNumber: exp.referenceNumber || undefined,
        bankId: exp.bankId || undefined,
        notes: exp.notes || undefined,
      }));

      const result = await createMultipleExpenses(
        user.companyId,
        user.userId,
        expensesData,
      );

      if (result.success) {
        toast.success(
          `تمت إضافة ${result.count} مصروف بنجاح! المبلغ الإجمالي: ${totalAmount.toFixed(2)}`,
        );

        // Reset form
        setExpenses([
          {
            id: crypto.randomUUID(),
            account_id: "",
            description: "",
            amount: "",
            paymentMethod: "",
            currency_code: "YER",
            referenceNumber: "",
            bankId: "",
            notes: "",
          },
        ]);
        setExpenseDate(new Date().toISOString().split("T")[0]);
        setOpen(false);
      } else {
        toast.error(result.error || "حدث خطأ أثناء إضافة المصاريف");
      }
    } catch (error) {
      console.error("Error creating expenses:", error);
      toast.error("حدث خطأ أثناء إضافة المصاريف");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إضافة مصاريف متعددة"
      style="sm:max-w-4xl"
      titel="إضافة مصاريف متعددة"
    >
      <ScrollArea className="h-[70vh] w-full pr-4">
        <div className="space-y-4" dir="rtl">
          {/* Header with Date and Total */}
          <div className="bg-card sticky top-0 z-10 rounded-lg border p-4 shadow-md">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>تاريخ المصاريف</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>المبلغ الإجمالي</Label>
                <div className="bg-muted flex h-10 items-center rounded-md border px-3">
                  <span className="text-primary text-xl font-bold">
                    {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-between">
              <Button onClick={addExpense} size="sm" variant="outline">
                <Plus className="ml-2 h-4 w-4" />
                إضافة مصروف آخر
              </Button>
              <span className="text-muted-foreground text-sm">
                عدد المصاريف: {expenses.length}
              </span>
            </div>
          </div>

          {/* Expense Items */}
          <div className="space-y-4">
            {expenses.map((expense, index) => (
              <div
                key={expense.id}
                className="bg-card space-y-3 rounded-lg border p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-semibold">المصروف {index + 1}</h3>
                  {expenses.length > 1 && (
                    <Button
                      onClick={() => removeExpense(expense.id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Category */}
                  <div className="space-y-2">
                    <Label>
                      فئة المصروف <span className="text-red-500">*</span>
                    </Label>
                    <SelectField
                      options={categories}
                      value={expense.account_id}
                      action={(val) =>
                        updateExpense(expense.id, "account_id", val)
                      }
                      placeholder="اختر الفئة"
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>
                      المبلغ <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={expense.amount}
                      onChange={(e) =>
                        updateExpense(expense.id, "amount", e.target.value)
                      }
                      placeholder="0.00"
                      className="text-right"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>
                      الوصف <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={expense.description}
                      onChange={(e) =>
                        updateExpense(expense.id, "description", e.target.value)
                      }
                      placeholder="أدخل وصف المصروف"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label>
                      طريقة الدفع <span className="text-red-500">*</span>
                    </Label>
                    <SelectField
                      options={paymentMethods}
                      value={expense.paymentMethod}
                      action={(val) =>
                        updateExpense(expense.id, "paymentMethod", val)
                      }
                      placeholder="اختر طريقة الدفع"
                    />
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label>
                      العملة <span className="text-red-500">*</span>
                    </Label>
                    <SelectField
                      options={currencyOptions}
                      value={expense.currency_code}
                      action={(val) =>
                        updateExpense(expense.id, "currency_code", val)
                      }
                      placeholder="اختر العملة"
                    />
                  </div>

                  {/* Bank & Reference (conditional) */}
                  {expense.paymentMethod === "bank" && (
                    <>
                      <div className="space-y-2">
                        <Label>
                          البنك <span className="text-red-500">*</span>
                        </Label>
                        <SelectField
                          options={banks}
                          value={expense.bankId || ""}
                          action={(val) =>
                            updateExpense(expense.id, "bankId", val)
                          }
                          placeholder="اختر البنك"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          رقم المرجع <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          value={expense.referenceNumber || ""}
                          onChange={(e) =>
                            updateExpense(
                              expense.id,
                              "referenceNumber",
                              e.target.value,
                            )
                          }
                          placeholder="أدخل رقم المرجع"
                        />
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>ملاحظات (اختياري)</Label>
                    <Textarea
                      rows={2}
                      value={expense.notes || ""}
                      onChange={(e) =>
                        updateExpense(expense.id, "notes", e.target.value)
                      }
                      placeholder="أدخل أي ملاحظات إضافية"
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Expense Summary */}
                <div className="flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="text-primary font-bold">
                    {parseFloat(expense.amount || "0").toFixed(2)}{" "}
                    {expense.currency_code}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="bg-card sticky bottom-0 rounded-lg border p-4 shadow-lg">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || expenses.length === 0}
              className="w-full"
              size="lg"
            >
              <Save className="ml-2 h-5 w-5" />
              {isSubmitting
                ? "جاري الحفظ..."
                : `حفظ ${expenses.length} مصروف - المجموع: ${totalAmount.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </Dailogreuse>
  );
}
