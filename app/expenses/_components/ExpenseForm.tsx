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
import { fetchPayments } from "@/lib/actions/banks";
import { Plus, Trash2, Save } from "lucide-react";
import {
  PaymentState,
  ReusablePayment,
} from "@/components/common/ReusablePayment";
import { useCompany } from "@/hooks/useCompany";

interface ExpenseItem {
  id: string;
  account_id: string;
  description: string;
  amount: string;
  notes?: string;
  payment?: PaymentState;
}

interface Account {
  id: string;
  name: string;
  currency: string | null;
}

interface MultiExpenseFormProps {
  companyId: string;
  userId: string;
  categories: { id: string; name: string }[];
  payment: any;
}

export default function ExpenseForm({
  companyId,
  userId,
  categories,
  payment,
}: MultiExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const { company } = useCompany();
  const { user } = useAuth();

  // ✅ Accounts per expense item
  const [accountsByExpense, setAccountsByExpense] = useState<
    Record<string, Account[]>
  >({});

  // Initialize with one empty expense
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: crypto.randomUUID(),
      account_id: "",
      description: "",
      amount: "",
      notes: "",
      payment: {
        paymentMethod: "",
        accountId: "",
        selectedCurrency: "",
        amountBase: 0,
      },
    },
  ]);

  if (!user) return null;

  // ✅ Load accounts when payment method changes for any expense
  useEffect(() => {
    if (!open) return;

    async function loadAccountsForAll() {
      try {
        const { banks, cashAccounts } = payment;

        const newAccountsByExpense: Record<string, Account[]> = {};

        expenses.forEach((exp) => {
          if (exp.payment?.paymentMethod === "bank") {
            newAccountsByExpense[exp.id] = banks;
          } else if (exp.payment?.paymentMethod === "cash") {
            newAccountsByExpense[exp.id] = cashAccounts;
          } else {
            newAccountsByExpense[exp.id] = [];
          }
        });

        setAccountsByExpense(newAccountsByExpense);
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب الحسابات");
      }
    }

    loadAccountsForAll();
  }, [
    open,
    expenses.map((exp) => `${exp.id}-${exp.payment?.paymentMethod}`).join(","),
  ]);

  // Add new expense row
  const addExpense = () => {
    setExpenses([
      ...expenses,
      {
        id: crypto.randomUUID(),
        account_id: "",
        description: "",
        amount: "",
        notes: "",
        payment: {
          paymentMethod: "",
          accountId: "",
          selectedCurrency: "",
          amountBase: 0,
        },
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
    (sum, exp) => sum + (exp.payment?.amountBase || 0),
    0,
  );
  const isForeign = payment.accountCurrency !== company?.base_currency;
  /* ───────── Submit selected invoices ───────── */
  const paymentAmount = isForeign
    ? (payment.amountFC ?? 0)
    : payment.amountBase;
  // Validate and submit
  const handleSubmit = async () => {
    // Validation`
    const invalidExpenses = expenses.filter(
      (exp) =>
        !exp.account_id ||
        !exp.description ||
        !exp.payment?.amountBase ||
        !exp.payment?.paymentMethod ||
        !exp.payment?.accountId,
    );

    if (invalidExpenses.length > 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة لكل مصروف");
      return;
    }

    // Check amount matches
    // for (const exp of expenses) {
    //   const expAmount = parseFloat(exp.amount);
    //   if (exp.payment && exp.payment.amountBase !== totalAmount) {
    //     toast.error("مبلغ الدفع يجب أن يطابق مبلغ المصروف");
    //     return;
    //   }
    // }

    setIsSubmitting(true);

    try {
      // Prepare expenses data
      const expensesData = expenses.map((exp) => ({
        account_id: exp.account_id,
        description: exp.description,
        amount: Number(exp.payment?.amountBase),
        expense_date: new Date(expenseDate),
        paymentMethod: exp.payment?.paymentMethod || "",
        currency_code: exp.payment?.selectedCurrency || "YER",
        referenceNumber: exp.payment?.transferNumber || undefined,
        bankId: exp.payment?.accountId || undefined,
        baseAmount: exp.payment?.amountBase || 0,
        exchangeRate: exp.payment?.exchangeRate || undefined,
        amountFC: exp.payment?.amountFC || undefined,
        notes: exp.notes || undefined,
        branchId: company?.branches[0].id ?? "",
        basCurrncy: company?.base_currency ?? "",
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
            notes: "",
            payment: {
              paymentMethod: "",
              accountId: "",
              selectedCurrency: "",
              amountBase: 0,
            },
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
      btnLabl="إضافة مصاريف"
      style="sm:max-w-4xl"
      titel="إضافة مصاريف"
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
                  <div className="grid gap-3">
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
                  {/* <div className="space-y-2">
                    <Label>
                      المبلغ <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={expense.amount}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0;
                        updateExpense(expense.id, "amount", e.target.value);
                        // Sync with payment amount
                        if (expense.payment) {
                          updateExpense(expense.id, "payment", {
                            ...expense.payment,
                            amountBase: amount,
                          });
                        }
                      }}
                      placeholder="0.00"
                      className="text-right"
                    />
                  </div> */}

                  {/* Description */}
                  <div className="grid gap-3">
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

                {/* ✅ Reusable Payment Component */}
                <div className="border-t pt-3">
                  <ReusablePayment
                    value={
                      expense.payment || {
                        paymentMethod: "",
                        accountId: "",
                        selectedCurrency: "",
                        amountBase: parseFloat(expense.amount) || 0,
                      }
                    }
                    accounts={accountsByExpense[expense.id] || []}
                    action={(val) => updateExpense(expense.id, "payment", val)}
                  />
                </div>

                {/* Expense Summary */}
                <div className="flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="text-primary font-bold">
                    {expense.payment?.amountBase.toFixed(2)}
                    {expense.payment?.selectedCurrency || ""}
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
