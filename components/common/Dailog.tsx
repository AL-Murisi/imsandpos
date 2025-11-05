"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Children, ReactNode, useState } from "react";

interface CustomDialogProps {
  title?: string;
  description?: string;
  children?: ReactNode;

  showActions?: boolean;
  submitText?: string;
  trigger: ReactNode;
  cancelText?: string;
}

export default function CustomDialog({
  title = "",
  description = "",
  children,
  trigger,
}: CustomDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="bg-popover h-[90vh] w-2xs overflow-y-auto md:w-md lg:w-full"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  );
}
