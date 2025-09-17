"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar } from "../ui/calendar";

type Item = {
  label: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
};

type Props = {
  items: Item[];
  action: (updatedItems: Item[]) => void;
  label?: string;
  triggerText?: string;
};

export default function MultiCheckboxDropdown({
  items,
  action,
  label = "الخيارات",
  triggerText = "تحديد",
}: Props) {
  const handleToggle = (value: string) => {
    const updated = items.map((item) =>
      item.value === value ? { ...item, checked: !item.checked } : item,
    );
    action(updated);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="تحديد" variant="outline">
          {triggerText}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.value}
            checked={item.checked}
            // FIX: Changed onChange to onCheckedChange
            onCheckedChange={() => handleToggle(item.value)}
            disabled={item.disabled}
          >
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
