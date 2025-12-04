"use client";

import { Button } from "@/components/ui/button";
// استبدل بالمسار الصحيح
import { useState } from "react";
import { toast } from "sonner";
import { UpateJournalEntriesPosting } from "@/lib/actions/Journal Entry";
import { setRowSelection } from "@/lib/slices/table";
import { useAppDispatch } from "@/lib/store";

interface BulkPostButtonProps {
  selectedEntries: { entry_number: string }[];
  onSuccess?: () => void;
}

export function BulkPostButton({
  selectedEntries,
  onSuccess,
}: BulkPostButtonProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBulkPost = async () => {
    if (selectedEntries.length === 0) {
      toast("الرجاء تحديد قيد واحد على الأقل");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    const entryNumbers = selectedEntries.map((e) => e.entry_number);
    const result = await UpateJournalEntriesPosting(entryNumbers, true);

    if (result.success) {
      toast(`تم ترحيل ${selectedEntries.length} قيود بنجاح ✅`);
      setIsSubmitting(false);
      dispatch(setRowSelection({}));
      onSuccess?.();
    } else {
      setIsSubmitting(false);
      toast("فشل ترحيل القيود ❌");
    }
  };

  return (
    <Button
      onClick={handleBulkPost}
      disabled={isSubmitting || selectedEntries.length === 0}
      variant="default"
      className="p-x-4 bg-green-600 text-white hover:bg-green-700"
    >
      {isSubmitting ? "جاري الترحيل..." : "ترحيل المحدد"}
    </Button>
  );
}
