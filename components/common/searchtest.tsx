// "use client";
// import React, { useEffect, useState } from "react";
// import { Input } from "../ui/input";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";

// type input = {
//   placeholder: string;
//   paramKey: string;
// };

// export default function SearchInput({ placeholder, paramKey }: input) {
//   const searchParam = useSearchParams();
//   const pathname = usePathname();
//   const { replace } = useRouter();
//   const defaultValue = searchParam.get(`${paramKey}query`) ?? "";
//   const [inputValue, setInputvalue] = useState(defaultValue);
//   useEffect(() => {
//     setInputvalue(defaultValue);
//   }, [defaultValue]);
//   useEffect(() => {
//     const debounce = setTimeout(() => {
//       if (inputValue !== defaultValue) {
//         const param = new URLSearchParams(searchParam);
//         if (inputValue) {
//           param.set(`${paramKey}query`, inputValue);
//         } else {
//           param.delete(`${paramKey}query`);
//         }
//         replace(`${pathname}?${param.toString()}`);
//       }
//     }, 300);
//     return () => clearTimeout(debounce);
//   }, [inputValue, replace, searchParam.toString(), pathname, paramKey]);
//   return (
//     // <div></div>
//     <Input
//       placeholder={placeholder}
//       type="search"
//       value={inputValue}
//       onChange={(e) => setInputvalue(e.target.value)} // ✅ this is correct
//       className="md:w-60 w-fit py-4 border-2 border-primary text-foreground  text-right" // Add padding-right
//     />
//   );
// }
"use client";
import React, { useEffect, useState, useTransition } from "react";
import { Input } from "../ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type InputProps = {
  placeholder: string;
  paramKey: string;
};

export default function SearchInput({ placeholder, paramKey }: InputProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const defaultValue = searchParams.get(`${paramKey}query`) ?? "";

  const [inputValue, setInputValue] = useState(defaultValue);

  // useTransition for non-urgent URL updates
  const [isPending, startTransition] = useTransition();

  // Sync input with default value from URL
  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  // Update URL whenever inputValue changes
  useEffect(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (inputValue) {
        params.set(`${paramKey}query`, inputValue);
      } else {
        params.delete(`${paramKey}query`);
      }
      if (params.toString() !== searchParams.toString()) {
        replace(`${pathname}?${params.toString()}`);
      }
    });
  }, [inputValue, replace, searchParams.toString(), pathname, paramKey]);

  return (
    <Input
      placeholder={placeholder}
      type="search"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      className="md:w-60 w-fit py-4 border-2 border-primary text-foreground text-right"
    />
  );
}
