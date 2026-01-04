"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { createManualJournalEntry } from "@/lib/actions/manualJournalEntry";
import { Plus, Save, Trash2, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SelectField } from "../common/selectproduct";
import {
  PaymentState,
  ReusablePayment,
} from "@/components/common/ReusablePayment";
import { fetchPayments } from "@/lib/actions/banks";

interface Account {
  id: string;
  name: string;
  account_type?: string;
  currency?: string | null;
}

interface bankcash {
  id: string;
  name: string;
  currency: string | null;
}
interface Customer {
  id?: string;
  name?: string;
  phoneNumber?: string | null;
  outstandingBalance?: number;
  creditLimit?: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface JournalEntryLine {
  id: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  customerId?: string;
  supplierId?: string;
}

interface ManualJournalEntryFormProps {
  accounts: Account[];
  customers?: Customer[] | null;
  suppliers?: Supplier[];
  companyId: string;
  userId: string;
  onSuccess?: () => void;
}

export default function ManualJournalEntryForm({
  accounts,
  customers = [],
  suppliers = [],
  companyId,
  userId,
  onSuccess,
}: ManualJournalEntryFormProps) {
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [generalDescription, setGeneralDescription] = useState("");
  const [lines, setLines] = useState<JournalEntryLine[]>([
    {
      id: crypto.randomUUID(),
      accountId: "",
      description: "",
      debit: 0,
      credit: 0,
      customerId: "",
      supplierId: "",
    },
    {
      id: crypto.randomUUID(),
      accountId: "",
      description: "",
      debit: 0,
      credit: 0,
      customerId: "",
      supplierId: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Payment tracking (optional - for cash/bank entries)
  const [includePayment, setIncludePayment] = useState(false);
  const [payment, setPayment] = useState<PaymentState>({
    paymentMethod: "",
    accountId: "",
    accountCurrency: "",
    amountBase: 0,
  });
  const [accountsForPayment, setAccountsForPayment] = useState<bankcash[]>([]);

  // ✅ Load accounts for payment component
  useEffect(() => {
    if (!includePayment || !payment.paymentMethod) {
      setAccountsForPayment([]);
      return;
    }

    async function loadAccounts() {
      try {
        const { banks, cashAccounts } = await fetchPayments();
        setAccountsForPayment(
          payment.paymentMethod === "bank" ? banks : cashAccounts,
        );
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب الحسابات");
      }
    }

    loadAccounts();
  }, [includePayment, payment.paymentMethod]);

  // Calculate totals
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  // Check if account is AR or AP
  const isAccountsReceivable = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    return (
      account?.account_type?.toLowerCase().includes("receivable") ||
      account?.name?.toLowerCase().includes("مدينون") ||
      account?.name?.toLowerCase().includes("ذمم مدينة")
    );
  };

  const isAccountsPayable = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    return (
      account?.account_type?.toLowerCase().includes("payable") ||
      account?.name?.toLowerCase().includes("دائنون") ||
      account?.name?.toLowerCase().includes("ذمم دائنة")
    );
  };

  // Check if any line uses cash/bank account
  const hasCashOrBankAccount = () => {
    return lines.some((line) => {
      const account = accounts.find((a) => a.id === line.accountId);
      return (
        account?.account_type?.toLowerCase().includes("cash") ||
        account?.account_type?.toLowerCase().includes("bank") ||
        account?.name?.toLowerCase().includes("نقدية") ||
        account?.name?.toLowerCase().includes("بنك")
      );
    });
  };

  // Add new line
  const addLine = () => {
    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        accountId: "",
        description: "",
        debit: 0,
        credit: 0,
        customerId: "",
        supplierId: "",
      },
    ]);
  };

  // Remove line
  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter((line) => line.id !== id));
    } else {
      toast.error("يجب أن يحتوي القيد على سطرين على الأقل");
    }
  };

  // Update line
  const updateLine = (
    id: string,
    field: keyof JournalEntryLine,
    value: any,
  ) => {
    setLines(
      lines.map((line) => {
        if (line.id === id) {
          const updatedLine = { ...line, [field]: value };

          // Clear customer/supplier when account changes
          if (field === "accountId") {
            updatedLine.customerId = "";
            updatedLine.supplierId = "";
          }

          return updatedLine;
        }
        return line;
      }),
    );
  };

  // Generate entry number
  const generateEntryNumber = () => {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(Math.random() * 100000);
    const timestamp = Date.now().toString().slice(-6);
    return `JE-${year}-MANUAL-${timestamp}-${randomSuffix}`;
  };

  // Submit form
  const handleSubmit = async () => {
    // Validation
    if (!generalDescription.trim()) {
      toast.error("الرجاء إدخال وصف عام للقيد");
      return;
    }

    if (!isBalanced) {
      toast.error("القيد غير متوازن! يجب أن يتساوى إجمالي المدين والدائن");
      return;
    }

    // Check all lines have accounts
    const invalidLines = lines.filter((line) => !line.accountId);
    if (invalidLines.length > 0) {
      toast.error("الرجاء تحديد حساب لجميع السطور");
      return;
    }

    // Check all lines have either debit or credit
    const emptyLines = lines.filter(
      (line) => line.debit === 0 && line.credit === 0,
    );
    if (emptyLines.length > 0) {
      toast.error("الرجاء إدخال قيمة مدين أو دائن لجميع السطور");
      return;
    }

    // Validate AR/AP lines have customer/supplier
    for (const line of lines) {
      if (isAccountsReceivable(line.accountId) && !line.customerId) {
        toast.error("يجب تحديد عميل لحساب الذمم المدينة");
        return;
      }
      if (isAccountsPayable(line.accountId) && !line.supplierId) {
        toast.error("يجب تحديد مورد لحساب الذمم الدائنة");
        return;
      }
    }

    // Validate payment if included
    if (includePayment) {
      if (!payment.paymentMethod || !payment.accountId) {
        toast.error("الرجاء إكمال معلومات الدفع");
        return;
      }
      if (payment.amountBase <= 0) {
        toast.error("الرجاء إدخال مبلغ الدفع");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const entryNumber = generateEntryNumber();

      // Prepare journal entries
      const entries = lines.map((line, index) => {
        // Determine reference_id based on account type and debit/credit
        let referenceId = entryNumber;
        let referenceType = "قيد يدوي";

        if (isAccountsReceivable(line.accountId) && line.customerId) {
          if (line.debit > 0) {
            referenceType = "مديونية على عميل";
          } else if (line.credit > 0) {
            referenceType = "تحصيل من عميل";
          }
          referenceId = line.customerId;
        } else if (isAccountsPayable(line.accountId) && line.supplierId) {
          if (line.credit > 0) {
            referenceType = "مديونية لمورد";
          } else if (line.debit > 0) {
            referenceType = "دفع لمورد";
          }
          referenceId = line.supplierId;
        }

        return {
          company_id: companyId,
          entry_number: `${entryNumber}-${index + 1}`,
          account_id: line.accountId,
          description: line.description || generalDescription,
          debit: line.debit || 0,
          credit: line.credit || 0,
          entry_date: new Date(entryDate),
          reference_type: referenceType,
          reference_id: referenceId,
          created_by: userId,
          is_automated: false,
          customer_id: line.customerId,
          supplier_id: line.supplierId,
        };
      });

      // Call server action
      const result = await createManualJournalEntry({
        entries,
        generalDescription,
        companyId,
        // ✅ Include payment details if provided
        paymentDetails: includePayment
          ? {
              paymentMethod: payment.paymentMethod ?? "",
              accountId: payment.accountId ?? "",
              accountCurrency: payment.accountCurrency ?? "",
              amountBase: payment.amountBase ?? 0,
              transferNumber:
                typeof payment.transferNumber === "string"
                  ? parseFloat(payment.transferNumber) || 0
                  : (payment.transferNumber ?? 0),
              exchangeRate: payment.exchangeRate ?? 1, // Default to 1 if undefined
              amountFC: payment.amountFC ?? 0,
            }
          : undefined,
      });

      if (result.success) {
        toast.success("تم إضافة القيد المحاسبي اليدوي بنجاح ✅");

        // Reset form
        setGeneralDescription("");
        setIncludePayment(false);
        setPayment({
          paymentMethod: "",
          accountId: "",
          accountCurrency: "",
          amountBase: 0,
        });
        setLines([
          {
            id: crypto.randomUUID(),
            accountId: "",
            description: "",
            debit: 0,
            credit: 0,
            customerId: "",
            supplierId: "",
          },
          {
            id: crypto.randomUUID(),
            accountId: "",
            description: "",
            debit: 0,
            credit: 0,
            customerId: "",
            supplierId: "",
          },
        ]);

        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || "حدث خطأ أثناء إضافة القيد المحاسبي ❌");
      }
    } catch (error) {
      console.error("Error creating manual journal entry:", error);
      toast.error("حدث خطأ أثناء إضافة القيد المحاسبي ❌");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-[70vh] w-full pr-4">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-card space-y-4 rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entry-date">تاريخ القيد</Label>
              <Input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>حالة التوازن</Label>
              <div className="flex h-10 items-center">
                {isBalanced ? (
                  <span className="text-sm font-medium text-green-600">
                    ✓ القيد متوازن
                  </span>
                ) : (
                  <span className="text-sm font-medium text-red-600">
                    ✗ القيد غير متوازن
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="general-description">الوصف العام للقيد</Label>
            <Textarea
              id="general-description"
              value={generalDescription}
              onChange={(e) => setGeneralDescription(e.target.value)}
              placeholder="مثال: قيد تسوية، قيد افتتاحي، قيد تصحيحي..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* ✅ Payment Section Toggle */}
          {hasCashOrBankAccount() && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include-payment"
                  checked={includePayment}
                  onChange={(e) => setIncludePayment(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="include-payment" className="cursor-pointer">
                  إضافة تفاصيل الدفع (للقيود النقدية/البنكية)
                </Label>
                <Info className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* ✅ Payment Details (conditional) */}
        {includePayment && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-blue-900">
              تفاصيل الدفع
            </h3>
            <ReusablePayment
              value={payment}
              action={setPayment}
              accounts={accountsForPayment}
            />
          </div>
        )}

        {/* Entry Lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">سطور القيد</h3>
            <Button onClick={addLine} size="sm" variant="outline">
              <Plus className="ml-2 h-4 w-4" />
              إضافة سطر
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const showCustomerSelect = isAccountsReceivable(line.accountId);
              const showSupplierSelect = isAccountsPayable(line.accountId);

              return (
                <div
                  key={line.id}
                  className="bg-card space-y-3 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm font-medium">
                      السطر {index + 1}
                    </span>
                    {lines.length > 2 && (
                      <Button
                        onClick={() => removeLine(line.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>الحساب</Label>
                      <SelectField
                        options={accounts}
                        value={line.accountId}
                        action={(val) => updateLine(line.id, "accountId", val)}
                        placeholder="اختر الحساب"
                      />
                    </div>

                    {showCustomerSelect && (
                      <div className="space-y-2">
                        <Label>
                          العميل <span className="text-red-500">*</span>
                        </Label>
                        <SelectField
                          options={customers as { id: string; name: string }[]}
                          value={line.customerId}
                          action={(val) =>
                            updateLine(line.id, "customerId", val)
                          }
                          placeholder="اختر العميل"
                        />
                        <p className="text-muted-foreground text-xs">
                          {line.debit > 0 && "مدين = لنا عند العميل"}
                          {line.credit > 0 && "دائن = تحصيل من العميل"}
                        </p>
                      </div>
                    )}

                    {showSupplierSelect && (
                      <div className="space-y-2">
                        <Label>
                          المورد <span className="text-red-500">*</span>
                        </Label>
                        <SelectField
                          options={suppliers}
                          value={line.supplierId}
                          action={(val) =>
                            updateLine(line.id, "supplierId", val)
                          }
                          placeholder="اختر المورد"
                        />
                        <p className="text-muted-foreground text-xs">
                          {line.credit > 0 && "دائن = لنا على المورد"}
                          {line.debit > 0 && "مدين = دفع للمورد"}
                        </p>
                      </div>
                    )}

                    {!showCustomerSelect && !showSupplierSelect && (
                      <div className="space-y-2">
                        <Label>الوصف (اختياري)</Label>
                        <Input
                          value={line.description}
                          onChange={(e) =>
                            updateLine(line.id, "description", e.target.value)
                          }
                          placeholder="وصف تفصيلي للسطر"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>المدين</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit || ""}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "debit",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        onFocus={(e) => {
                          if (line.credit > 0) {
                            toast.info("لا يمكن إدخال مدين ودائن في نفس السطر");
                          }
                        }}
                        disabled={line.credit > 0}
                        placeholder="0.00"
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>الدائن</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit || ""}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "credit",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        onFocus={(e) => {
                          if (line.debit > 0) {
                            toast.info("لا يمكن إدخال مدين ودائن في نفس السطر");
                          }
                        }}
                        disabled={line.debit > 0}
                        placeholder="0.00"
                        className="text-right"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-muted/50 rounded-lg border p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">إجمالي المدين</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalDebit.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">إجمالي الدائن</p>
              <p className="text-2xl font-bold text-green-600">
                {totalCredit.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">الفرق</p>
              <p
                className={`text-2xl font-bold ${
                  isBalanced ? "text-green-600" : "text-red-600"
                }`}
              >
                {Math.abs(totalDebit - totalCredit).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isBalanced || isSubmitting}
          className="w-full"
          size="lg"
        >
          <Save className="ml-2 h-5 w-5" />
          {isSubmitting ? "جاري الحفظ..." : "حفظ القيد المحاسبي"}
        </Button>
      </div>
    </ScrollArea>
  );
}
