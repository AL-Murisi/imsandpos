"use client";

import React, { useTransition } from "react";
import { Input } from "../ui/input";
import { parseAsString } from "nuqs";
import { useQueryState } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import SearchStatus from "./SearchStatus";

type InputProps = {
  placeholder: string;
  paramKey: string;
};

export default function SearchInput({ placeholder, paramKey }: InputProps) {
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useQueryState(
    `${paramKey}query`,
    parseAsString.withDefault("").withOptions({
      shallow: false,
      startTransition,
    }),
  );

  // Debounce the URL param update
  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    setQuery(value);
  }, 300); // debounce delay in ms

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetQuery(e.target.value);
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()} // 🧠 Prevent page reload
      className="relative flex w-60 flex-col gap-2 md:w-full lg:w-md"
      dir="rtl"
    >
      <div className="relative w-full">
        <Input
          placeholder={placeholder}
          autoComplete="off"
          type="search"
          onChange={handleChange}
          className="border-primary text-foreground w-full border-2 py-4 pr-12 text-right"
          defaultValue={query}
        />

        <div className="absolute top-1/2 right-10 -translate-y-1/2">
          <SearchStatus searching={isPending} />
        </div>
      </div>
    </form>
  );
}
