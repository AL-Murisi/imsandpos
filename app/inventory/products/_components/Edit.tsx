"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomDialog from "@/components/common/Dailog";

import ProductEditForm from "./formEdit";
import { Button } from "@/components/ui/button";
import { EditIcon } from "lucide-react";

export default function EditProduct({ skuToEdit }: any) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  // State to force re-render and reset the Form component
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) {
      router.back(); // back to list
    }
  }, [open, router]);

  const handleSave = () => {
    console.log("Saved");
    // Increment key to force Form re-render and reset its state
    setFormKey((prevKey) => prevKey + 1);
    setOpen(false); // Close the dialog after saving
  };

  const handleCancel = () => {
    // Increment key to force Form re-render and reset its state
    setFormKey((prevKey) => prevKey + 1);
    setOpen(false); // Close the dialog
  };

  return (
    <CustomDialog
      trigger={
        <Button variant="outline">
          <EditIcon />
        </Button>
      }
      title="إضافة منتج"
      description="أدخل تفاصيل المنتج واحفظه"
    >
      {/* Pass the formKey to force re-render and reset the form */}
      <ProductEditForm sku={skuToEdit} />
    </CustomDialog>
  );
}
