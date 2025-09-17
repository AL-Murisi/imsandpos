"use client";
import CustomDialog from "../../../components/common/Dailog";
import { Button } from "../../../components/ui/button";
import { Plus } from "lucide-react";

import Form from "./form";

export default function Userroles() {
  return (
    <CustomDialog
      trigger={
        <Button>
          <Plus />
          add role
        </Button>
      }
      title="إضافة user جديدة"
      description="أدخل تفاصيل user واحفظه"
    >
      <Form close={close} />
    </CustomDialog>
  );
}
