import React from "react";
import { Input } from "../ui/input";

type input = {
  placeholder: string;
  value: any;
  onSearchChange: (value: any) => void;
};

export default function SearchInput({
  value,
  onSearchChange,
  placeholder,
}: input) {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      type="search"
      onChange={onSearchChange} // ✅ this is correct
      className=" border-2 border-primary text-foreground"
    />
  );
}
