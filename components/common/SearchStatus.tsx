// components/ui/SearchStatus.tsx

import React from "react";
// Import the necessary icons from lucide-react
import { Search, Loader2 } from "lucide-react";

type SearchStatusProps = {
  searching: boolean;
};

export default function SearchStatus({ searching }: SearchStatusProps) {
  // Common Tailwind classes for the icon/loader
  const iconClasses = "h-4 w-4";

  return (
    // Positioning remains the same: absolute, centered vertically on the left
    <div className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
      {searching ? (
        // 1. Use the Loader2 icon from lucide-react when searching is true
        // The 'animate-spin' class from Tailwind makes it spin
        <Loader2 className={`${iconClasses} animate-spin`} />
      ) : (
        // 2. Use the Search icon from lucide-react when not searching
        <Search className={iconClasses} />
      )}
    </div>
  );
}
