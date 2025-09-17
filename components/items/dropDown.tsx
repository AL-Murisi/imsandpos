"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ChevronDown, Star } from "lucide-react";
import { useState } from "react";

const items = [
  "All Items",
  "Active Items",
  "Inactive Items",
  "Ungrouped Items",
  "Low Stock Items",
  "Sales",
  "Purchases",
  "Zoho CRM",
  "Inventory Items",
  "Another Category",
];

export default function ItemDropdown() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("All Items");

  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="rounded-md text-base font-semibold"
        >
          {selected}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 p-2">
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />

        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredItems.map((item) => (
            <div
              key={item}
              className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer text-sm"
              onClick={() => {
                setSelected(item);
              }}
            >
              <span>{item}</span>
              <Star className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
