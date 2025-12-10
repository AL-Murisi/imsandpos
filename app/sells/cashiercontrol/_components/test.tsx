"use client";

import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
type Company =
  | {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      logoUrl: string | null;
    }
  | undefined;
interface PrintButtonProps {
  saleNumber: string;
  items: any[];
  totals: any;
  receivedAmount?: number;
  calculatedChange: number;
  userName?: string;
  customerName?: string;
  customerDebt?: number;
  isCash: boolean;
  t: any;
  company: Company;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  saleNumber,
  items,
  totals,
  receivedAmount,
  calculatedChange,
  userName,
  customerName,
  customerDebt,
  isCash,
  t,
  company,
}) => {
  const router = useRouter();
  const [isLoading2, setIsLoading2] = useState(false);

  const handlePrint = () => {
    const query = new URLSearchParams({
      saleNumber,
      items: JSON.stringify(items),
      totals: JSON.stringify(totals),
      receivedAmount: receivedAmount?.toString() ?? "0",
      calculatedChange: calculatedChange.toString(),
      userName: userName ?? "",
      customerName: customerName ?? "",
      customerDebt: customerDebt?.toString() ?? "0",
      isCash: isCash ? "1" : "0",
      company: JSON.stringify(company),
    }).toString();

    router.push(`/sells/receipt?${query}`);
  };

  return (
    <Button
      className="rounded bg-green-600 px-4 py-2 text-white"
      disabled={isLoading2}
      onClick={() => {
        setIsLoading2(true);
        handlePrint(); // call the function
      }}
    >
      {isLoading2 && <Clock className="h-4 w-4 animate-spin" />}
      {isLoading2 ? "جاري الطباعة..." : t("print")}
    </Button>
  );
};
