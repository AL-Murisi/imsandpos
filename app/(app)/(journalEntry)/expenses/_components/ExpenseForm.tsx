"use client";

import { createMultipleExpenses } from "@/lib/actions/exponses";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import {
  PaymentState,
  ReusablePayment,
} from "@/components/common/ReusablePayment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ExpenseAssignmentType = "general" | "employee" | "customer";

interface ExpenseItem {
  id: string;
  account_id: string;
  description: string;
  amount: string;
  notes?: string;
  payment?: PaymentState;
  expenseFor: ExpenseAssignmentType;
  relatedPartyId?: string;
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
  assignmentOptions: {
    employees: { id: string; name: string }[];
    customers: { id: string; name: string }[];
    branch: { id: string; name: string }[];
  };
}

function createEmptyExpense(): ExpenseItem {
  return {
    id: crypto.randomUUID(),
    account_id: "",
    description: "",
    amount: "",
    notes: "",
    expenseFor: "general",
    relatedPartyId: "",
    payment: {
      paymentMethod: "",
      accountId: "",
      selectedCurrency: "",
      amountBase: 0,
    },
  };
}

export default function ExpenseForm({
  companyId,
  userId,
  categories,
  payment,
  assignmentOptions,
}: MultiExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const { company } = useCompany();
  const { user } = useAuth();
  const [accountsByExpense, setAccountsByExpense] = useState<
    Record<string, Account[]>
  >({});
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    createEmptyExpense(),
  ]);

  if (!user) return null;

  useEffect(() => {
    if (!open) return;

    try {
      const { banks, cashAccounts } = payment;
      const nextAccountsByExpense: Record<string, Account[]> = {};

      expenses.forEach((exp) => {
        if (exp.payment?.paymentMethod === "bank") {
          nextAccountsByExpense[exp.id] = banks;
        } else if (exp.payment?.paymentMethod === "cash") {
          nextAccountsByExpense[exp.id] = cashAccounts;
        } else {
          nextAccountsByExpense[exp.id] = [];
        }
      });

      setAccountsByExpense(nextAccountsByExpense);
    } catch (error) {
      console.error(error);
      toast.error("فشل في جلب الحسابات");
    }
  }, [
    open,
    payment,
    expenses.map((exp) => `${exp.id}-${exp.payment?.paymentMethod}`).join(","),
  ]);

  const addExpense = () => {
    setExpenses((current) => [...current, createEmptyExpense()]);
  };

  const removeExpense = (id: string) => {
    if (expenses.length <= 1) {
      toast.error("يجب أن يكون هناك مصروف واحد على الأقل");
      return;
    }

    setExpenses((current) => current.filter((exp) => exp.id !== id));
  };

  const updateExpense = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenses((current) =>
      current.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    );
  };

  const updateExpenseAssignment = (
    id: string,
    expenseFor: ExpenseAssignmentType,
  ) => {
    setExpenses((current) =>
      current.map((exp) =>
        exp.id === id ? { ...exp, expenseFor, relatedPartyId: "" } : exp,
      ),
    );
  };

  const totalAmount = expenses.reduce(
    (sum, exp) => sum + (exp.payment?.amountBase || 0),
    0,
  );

  const handleSubmit = async () => {
    const invalidExpenses = expenses.filter(
      (exp) =>
        !exp.account_id ||
        !exp.description ||
        !exp.payment?.amountBase ||
        !exp.payment?.paymentMethod ||
        !exp.payment?.accountId ||
        ((exp.expenseFor === "employee" || exp.expenseFor === "customer") &&
          !exp.relatedPartyId),
    );

    if (invalidExpenses.length > 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة لكل مصروف");
      return;
    }

    setIsSubmitting(true);

    try {
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
        branchId: company?.branches[0]?.id ?? "",
        basCurrncy: company?.base_currency ?? "",
        employeeId:
          exp.expenseFor === "employee"
            ? exp.relatedPartyId || undefined
            : undefined,
        customerId:
          exp.expenseFor === "customer"
            ? exp.relatedPartyId || undefined
            : undefined,
      }));

      const result = await createMultipleExpenses(
        companyId,
        userId,
        expensesData,
      );

      if (!result.success) {
        toast.error(result.error || "حدث خطأ أثناء إضافة المصاريف");
        return;
      }

      toast.success(
        `تمت إضافة ${result.count} مصروف بنجاح! المبلغ الإجمالي: ${totalAmount.toFixed(2)}`,
      );
      setExpenses([createEmptyExpense()]);
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setOpen(false);
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

          <div className="space-y-4">
            {expenses.map((expense, index) => (
              <div
                key={expense.id}
                className="bg-card space-y-3 rounded-lg border p-4"
              >
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

                <div className="grid gap-3 md:grid-cols-2">
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

                  <div className="grid gap-3">
                    <Label>المصروف على</Label>
                    <SelectField
                      options={[
                        { id: "general", name: "عام" },
                        { id: "employee", name: "موظف" },
                        { id: "customer", name: "عميل" },
                      ]}
                      value={expense.expenseFor}
                      action={(val) =>
                        updateExpenseAssignment(
                          expense.id,
                          val as ExpenseAssignmentType,
                        )
                      }
                      placeholder="اختر الجهة"
                    />
                  </div>

                  {expense.expenseFor === "employee" && (
                    <div className="grid gap-3">
                      <Label>
                        الموظف <span className="text-red-500">*</span>
                      </Label>
                      <SelectField
                        options={assignmentOptions.employees}
                        value={expense.relatedPartyId}
                        action={(val) =>
                          updateExpense(expense.id, "relatedPartyId", val)
                        }
                        placeholder="اختر الموظف"
                      />
                    </div>
                  )}

                  {expense.expenseFor === "customer" && (
                    <div className="grid gap-3">
                      <Label>
                        العميل <span className="text-red-500">*</span>
                      </Label>
                      <SelectField
                        options={assignmentOptions.customers}
                        value={expense.relatedPartyId}
                        action={(val) =>
                          updateExpense(expense.id, "relatedPartyId", val)
                        }
                        placeholder="اختر العميل"
                      />
                    </div>
                  )}

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

                <div className="flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="text-primary font-bold">
                    {(expense.payment?.amountBase || 0).toFixed(2)}
                    {expense.payment?.selectedCurrency || ""}
                  </span>
                </div>
              </div>
            ))}
          </div>

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
