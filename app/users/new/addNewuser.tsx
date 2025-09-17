"use client";

import CustomDialog from "../../../components/common/Dailog";
import { Button } from "../../../components/ui/button";

import UserForm from "./form";
import { Plus } from "lucide-react";

export default function AddNewuser() {
  // When dialog closes, return to main products page

  return (
    <CustomDialog
      trigger={
        <Button>
          <Plus />
          add userr
        </Button>
      }
      title="إضافة user جديدة"
      description="أدخل تفاصيل user واحفظه"
    >
      <UserForm />
    </CustomDialog>
  );
}
