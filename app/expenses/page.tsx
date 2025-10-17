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
import { DollarSign } from "lucide-react";
// import { getExpensesByCompany } from "../actions/exponses";

export default function ExpensesPage() {
  const [expenseType, setExpenseType] = useState<string>("daily");
  // const [expensesData, categoriesData] = await Promise.all([
  //           getExpensesByCompany(user.companyId, {
  //             pageIndex: pagination.pageIndex,
  //             pageSize: pagination.pageSize,
  //             categoryId: categoryFilter,
  //             status: statusFilter,
  //             from: dateRange.from,
  //             to: dateRange.to,
  //             parsedSort: sorting,
  //           }),
  //           getExpenseCategories(user.companyId),
  //         ]);

  const handleDownloadExpense = () => {
    // Replace with your API call
    alert(`تحميل تقرير المصاريف: ${expenseType}`);
  };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">تقرير المصاريف</h1>

      <div className="space-y-4 rounded-lg border p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <DollarSign className="h-5 w-5" /> المصاريف
        </h2>

        <Select onValueChange={setExpenseType}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="اختر الفترة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">يومي</SelectItem>
            <SelectItem value="monthly">شهري</SelectItem>
            <SelectItem value="yearly">سنوي</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleDownloadExpense}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          تحميل تقرير المصاريف
        </Button>
      </div>
    </div>
  );
}
