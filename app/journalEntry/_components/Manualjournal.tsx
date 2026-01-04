"use client";

import Dialogreuse from "@/components/common/dailogreuse";
import ManualJournalEntryForm from "@/components/forms/Manualjornal";
import { useAuth } from "@/lib/context/AuthContext";
import { useState } from "react";

interface JournalEntryDetailsDialogProps {
  account: {
    id: string;
    name: string;
    currency?: string | null;
    account_type?: string;
  }[];
  customers?:
    | {
        id?: string;
        name?: string;
        phoneNumber?: string | null;
        totalDebt?: number;
      }[]
    | null;
  suppliers?: { id: string; name: string }[];
}

export default function ManualJournalEntry({
  account,
  customers = [],
  suppliers = [],
}: JournalEntryDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  if (!user) return;
  const handleSuccess = () => {
    // Close dialog after successful creation
    setOpen(false);
    // You can add additional logic here like refreshing the journal entries list
  };

  return (
    <Dialogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"إضافة قيد يدوي"}
      titel="إضافة قيد محاسبي يدوي"
      description="قم بإنشاء قيد محاسبي يدوي مع تحديد الحسابات المدينة والدائنة والعملاء والموردين"
      style={""}
    >
      <ManualJournalEntryForm
        accounts={account}
        customers={customers}
        suppliers={suppliers}
        companyId={user.companyId}
        userId={user.userId}
        onSuccess={handleSuccess}
      />
    </Dialogreuse>
  );
}
