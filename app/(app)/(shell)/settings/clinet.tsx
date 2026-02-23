"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExchangeRate } from "@/lib/actions/banks";
import { SelectField } from "@/components/common/selectproduct";
import { fr } from "zod/v4/locales";
import { useAuth } from "@/lib/context/AuthContext";
import Dailogreuse from "@/components/common/dailogreuse";

const CURRENCIES = [
  { id: "USD", name: "دولارامريكي" },
  { id: "SAR", name: "ريال سعودي" },
  { id: "EUR", name: "يورو" },
  { id: "YER", name: "ريال يمني" },
];

export default function ExchangeRatesPage() {
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("YER");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rate, setRate] = useState<number>(0);
  const { user } = useAuth();
  if (!user) return null;
  const companyId = user.companyId; // get from session

  async function handleSave() {
    if (!rate || rate <= 0) {
      alert("أدخل سعر صرف صحيح");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    await createExchangeRate({
      companyId,
      fromCurrency,
      toCurrency,
      rate,
    });

    alert("تم حفظ سعر الصرف بنجاح");
    setRate(0);
  }

  return (
    <Dailogreuse open={open} setOpen={setOpen} btnLabl="تعديل الصرف  " style="">
      <div className="space-y-6 p-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Settings className="h-5 w-5" />
          إدارة أسعار الصرف
        </h1>

        <div className="max-w-md space-y-4 rounded-lg border p-4 shadow-sm">
          {/* From Currency */}
          <div className="space-y-2">
            <Label>من العملة</Label>
            <SelectField
              options={CURRENCIES}
              action={(value) => setFromCurrency(value)}
              value={fromCurrency}
              placeholder="اختر العملة"
            />
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <Label>إلى العملة</Label>
            <SelectField
              options={CURRENCIES}
              action={(value) => setToCurrency(value)}
              value={toCurrency}
              placeholder="اختر العملة"
            />
          </div>

          {/* Exchange Rate */}
          <div className="space-y-2">
            <Label>سعر الصرف</Label>
            <Input
              type="number"
              step="0.000001"
              placeholder="مثال: 1500"
              value={rate || ""}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-sm">
              1 {fromCurrency} = ? {toCurrency}
            </p>
          </div>

          <Button
            disabled={isSubmitting}
            className="w-full"
            onClick={handleSave}
          >
            {isSubmitting ? "جاري الحفظ..." : `حفظ `}
          </Button>
        </div>
      </div>
    </Dailogreuse>
  );
}
