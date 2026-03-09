// "use client";

// import React, { useMemo, useState, useTransition } from "react";
// import { useDebouncedCallback } from "use-debounce";
// import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
// } from "../ui/command";
// import { ScrollArea } from "../ui/scroll-area";
// import SearchStatus from "./SearchStatus";
// import { parseAsString, useQueryState } from "nuqs";
// import { ChevronDown } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { Button } from "../ui/button";

// interface UserOption {
//   id?: string;
//   name?: string;
//   phoneNumber?: string | null;
//   outstandingBalance?: number;
// }

// type SearchInputProps = {
//   placeholder: string;
//   paramKey: string;
//   value?: string;
//   options: UserOption[];
//   action: (users: UserOption) => void;
// };

// export default function SearchInput({
//   placeholder,
//   paramKey,
//   value,
//   options,
//   action,
// }: SearchInputProps) {
//   const [isPending, startTransition] = useTransition();
//   const [open, setOpen] = useState(false);

//   const [query, setQuery] = useQueryState(
//     `${paramKey}query`,
//     parseAsString.withDefault("").withOptions({
//       shallow: false,
//       startTransition,
//     }),
//   );

//   const debouncedServerQuery = useDebouncedCallback((value: string) => {
//     setQuery(value);
//   }, 400);

//   // filter only names that START with the query
//   const filteredOptions = useMemo(() => {
//     if (!query) return options;

//     const q = query.toLowerCase();

//     return options.filter((opt) => opt.name?.toLowerCase().startsWith(q));
//   }, [options, query]);

//   const nameSet = useMemo(
//     () => new Set(options.map((o) => o.name?.toLowerCase())),
//     [options],
//   );

//   return (
//     <Popover open={open} onOpenChange={setOpen}>
//       <PopoverTrigger asChild>
//         <div className="relative w-full">
//           <Button
//             variant="outline"
//             type="button"
//             className={cn(
//               "border-primary flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm",
//             )}
//           >
//             {/* show typing even if not selected */}
//             {query || value ? (
//               <span>{query || value}</span>
//             ) : (
//               <span>{placeholder}</span>
//             )}

//             <ChevronDown className="text-muted-foreground h-4 w-4" />
//           </Button>
//         </div>
//       </PopoverTrigger>

//       <PopoverContent className="p-0" align="end">
//         <Command>
//           <div className="relative w-full">
//             <CommandInput
//               placeholder="ابحث..."
//               autoComplete="off"
//               value={query}
//               onValueChange={(value: string) => {
//                 const trimmed = value.trim();

//                 // allow deleting
//                 setQuery(trimmed);

//                 if (!trimmed) {
//                   setOpen(false);
//                   return;
//                 }

//                 const exists = nameSet.has(trimmed.toLowerCase());

//                 // only search server if not local
//                 if (!exists) {
//                   debouncedServerQuery(trimmed);
//                 }

//                 setOpen(true);
//               }}
//             />

//             <div className="absolute top-1/2 right-10 -translate-y-1/2">
//               <button
//                 onClick={() => {
//                   setQuery("");
//                   setOpen(false);
//                 }}
//               >
//                 <SearchStatus searching={isPending} />
//               </button>
//             </div>
//           </div>

//           <ScrollArea className="h-36">
//             <CommandEmpty>لا توجد نتائج</CommandEmpty>

//             <CommandGroup>
//               {filteredOptions.map((opt) => (
//                 <CommandItem
//                   key={opt.id}
//                   value={opt.name}
//                   onSelect={() => {
//                     action(opt);
//                     setQuery(opt.name ?? "");
//                     setOpen(false);
//                   }}
//                 >
//                   {opt.name}
//                 </CommandItem>
//               ))}
//             </CommandGroup>
//           </ScrollArea>
//         </Command>
//       </PopoverContent>
//     </Popover>
//   );
// }
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { ScrollArea } from "../ui/scroll-area";
import SearchStatus from "./SearchStatus";
import { parseAsString, useQueryState } from "nuqs";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface UserOption {
  id?: string;
  name?: string;
  phoneNumber?: string | null;
  outstandingBalance?: number;
}

type SearchInputProps = {
  placeholder: string;
  paramKey: string;
  value?: string;
  options: UserOption[];
  action: (users: UserOption) => void;
};

export default function SearchInput({
  placeholder,
  paramKey,
  value,
  options,
  action,
}: SearchInputProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Local UI state for typing to prevent jumping
  const [localSearch, setLocalSearch] = useState("");

  const [query, setQuery] = useQueryState(
    `${paramKey}query`,
    parseAsString.withDefault("").withOptions({
      shallow: false,
      startTransition,
    }),
  );

  const debouncedServerQuery = useDebouncedCallback((val: string) => {
    setQuery(val);
  }, 400);

  // 1. Grouping Logic by First Letter
  const groupedOptions = useMemo(() => {
    const q = localSearch.toLowerCase();
    const filtered = options.filter((opt) =>
      opt.name?.toLowerCase().includes(q),
    );

    const groups: Record<string, UserOption[]> = {};
    filtered.forEach((opt) => {
      const firstLetter = opt.name?.charAt(0).toUpperCase() || "#";
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(opt);
    });

    // Sort keys alphabetically
    return Object.keys(groups)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = groups[key];
          return acc;
        },
        {} as Record<string, UserOption[]>,
      );
  }, [options, localSearch]);

  const nameSet = useMemo(
    () => new Set(options.map((o) => o.name?.toLowerCase())),
    [options],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Button
            variant="outline"
            type="button"
            className={cn(
              "border-primary flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm",
            )}
          >
            <span>{localSearch || query || value || placeholder}</span>
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>

      <PopoverContent className="p-0" align="end">
        <Command>
          <div className="relative w-full">
            <CommandInput
              placeholder="ابحث..."
              autoComplete="off"
              value={localSearch}
              onValueChange={(val: string) => {
                setLocalSearch(val);
                const trimmed = val.trim().toLowerCase();

                if (!trimmed) {
                  setQuery(null); // Clear URL params if empty
                  return;
                }

                // 2. logic: If exists in local list, don't update URL param
                const existsLocally = nameSet.has(trimmed);

                if (!existsLocally) {
                  debouncedServerQuery(val);
                } else {
                  // If it exists locally, we clear the server query to stop extra fetching
                  setQuery(null);
                }
              }}
            />

            <div className="absolute top-1/2 right-10 -translate-y-1/2">
              <SearchStatus searching={isPending} />
            </div>
          </div>

          <ScrollArea className="h-64">
            <CommandEmpty>لا توجد نتائج</CommandEmpty>

            {/* 3. Render Grouped Alphabetical Sections */}
            {Object.entries(groupedOptions).map(([letter, items]) => (
              <CommandGroup key={letter} heading={letter}>
                {items.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.name}
                    onSelect={() => {
                      action(opt);
                      setLocalSearch(opt.name ?? "");
                      setQuery(null); // Clean up URL on select
                      setOpen(false);
                    }}
                  >
                    {opt.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
