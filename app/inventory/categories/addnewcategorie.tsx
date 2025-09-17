"use client";

import CustomDialog from "@/components/common/Dailog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Form from "./form";
import { Plus } from "lucide-react";

export default function Addnewcategorie() {
  const [open, setOpen] = useState(false); // Dialog opens automatically
  const router = useRouter();

  // When dialog closes, return to main products page
  useEffect(() => {
    if (!open) {
      router.push("/inventory/categories");
    }
  }, [open, router]);

  return (
    <div>
      <CustomDialog
        trigger={
          <Button>
            <Plus />
            add
          </Button>
        }
      >
        <Form />
      </CustomDialog>
    </div>
  );
}
