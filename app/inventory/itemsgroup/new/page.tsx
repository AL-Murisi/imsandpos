"use client";

import CustomDialog from "../../../../components/common/Dailog";
import { Button } from "../../../../components/ui/button";
import { Label } from "../../../../components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Form from "./form";
import { Plus } from "lucide-react";

export default function AddNewItemPage() {
  const [open, setOpen] = useState(false); // Dialog opens automatically
  const router = useRouter();

  // When dialog closes, return to main products page
  useEffect(() => {
    if (!open) {
      router.push("/inventory/itemsgroup");
    }
  }, [open, router]);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        add
      </Button>
      <CustomDialog
        title="إضافة فئة جديدة"
        description="أدخل تفاصيل فئة واحفظه"
        trigger={undefined}
      >
        <Form />
      </CustomDialog>
    </div>
  );
}
