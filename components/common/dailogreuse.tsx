import React, { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";

type prop = {
  open: boolean;
  setOpen: (open: boolean) => void;
  btnLabl: string | ReactNode;
  titel?: string | ReactNode;
  description?: string;
  children: ReactNode;
  style: any;
  disabled?: boolean;
};
export default function Dailogreuse({
  open,
  setOpen,
  btnLabl,
  titel,
  description,
  children,
  style,
  disabled = false,
}: prop) {
  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {btnLabl}
        </Button>
      </DialogTrigger>
      <DialogContent className={`${style}`} dir="rtl">
        <DialogHeader>
          <DialogTitle>{titel} </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
