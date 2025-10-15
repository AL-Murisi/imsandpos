"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Settings } from "lucide-react";
import ProductPriceInput from "@/components/common/exchnage";
import CurrencySwitcher from "@/components/common/CurrencySwitcher";

export default function ExpensesPage() {
  const [expenseType, setExpenseType] = useState<string>("daily");
  const [currency, setCurrency] = useState<string>("USD");
  const [yerRate, setYerRate] = useState<number>(250); // Default exchange rate

  const handleDownloadExpense = () => {
    alert(
      `تحميل تقرير المصاريف: ${expenseType}\nالعملة: ${currency}\nسعر الصرف لليمني: ${yerRate}`,
    );
    // Replace with your API call
  };

  return (
    <div className="space-y-8 p-6">
      {/* Currency Settings Section */}
      <div className="space-y-4 rounded-lg border p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Settings className="h-5 w-5" /> إعدادات العملة
        </h2>

        <CurrencySwitcher />
        <ProductPriceInput />
      </div>
    </div>
  );
}
