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

    { id: "debt", name: "دين" },
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
      btnLabl="إضافة مصاريف "
      style="sm:max-w-4xl"
      titel="إضافة مصاريف "
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
