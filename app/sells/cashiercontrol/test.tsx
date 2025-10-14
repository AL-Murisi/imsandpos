"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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
}) => {
  const router = useRouter();

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
    }).toString();

    router.push(`/sells/receipt?${query}`);
  };

  return (
    <Button
      className="rounded bg-green-600 px-4 py-2 text-white"
      onClick={handlePrint}
    >
      {t("print")}
    </Button>
  );
};
