"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CustomDialog from "../../../components/common/Dailog";
import { Button } from "../../../components/ui/button";

import { Separator } from "@/components/ui/separator";
import SearchInput from "../../../components/common/SearchInput";

export default function Addtouserrecod({}: {}) {
  const [search, setSearch] = useState();
  const [showDialog, setShowDialog] = useState(false);
  const onSearchChange = () => {};
  const router = useRouter();
  useEffect(() => {
    if (!open) {
      router.push("/users");
    }
  }, [open, router]);

  return (
    <div>
      <CustomDialog
        trigger={
          <Button
            onClick={() => setShowDialog(true)}
            className="flex-1 py-3 rounded-md shadow-md hover:shadow-lg transition-shadow"
          >
            دين
          </Button>
        }
        title="ابحث عن العميل"
        description="أدخل تفاصيل user واحفظه"
        submitText="حفظ"
        cancelText="إلغاء"
      >
        <SearchInput
          placeholder={"رقم الهاتف أو اسم العميل"}
          value={search}
          onSearchChange={onSearchChange}
        />{" "}
        <Separator className="my-2" />
        <div className="grid grid-cols-2 justify-between">
          <Button variant="outline">إلغاء</Button>
          <Button
            className="bg-popover-foreground text-background"
            type="submit"
          >
            تأكيد الدفع
          </Button>
        </div>
      </CustomDialog>
    </div>
  );
}
