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
      action=""
      className="bg-amber- relative flex w-60 flex-col gap-5 md:w-full lg:w-md"
      dir="ltr"
    >
      <Input
        placeholder={placeholder}
        autoComplete="off"
        type="search"
        onChange={handleChange}
        className="border-primary text-foreground w-full border-2 py-4 text-right"
        defaultValue={query}
      />
      <SearchStatus searching={isPending} />
    </form>
  );
}
