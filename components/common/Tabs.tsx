// "use client";
// import {
//   useTransition,
//   useState,
//   ReactNode,
//   useEffect,
//   useOptimistic,
// } from "react";
// import { Button } from "@/components/ui/button";
// import { Loader2 } from "lucide-react";

// type TabItem = {
//   value: string;
//   label: string;
//   content: ReactNode;
// };

// type ReusableTabsProps = {
//   /** List of tab items with label and content */
//   tabs: TabItem[];

//   /** Optional default active tab value */
//   defaultTab?: string;

//   /** Optional flag to disable transitions (for instant tab changes) */
//   disableTransition?: boolean;

//   /** Optional custom loader to show during transition */
//   loader?: ReactNode;
// };
// export default function DashboardTabs({
//   tabs,
//   defaultTab,
//   disableTransition = false,
//   loader,
// }: ReusableTabsProps) {
//   const [tab, setTab] = useState<string>(defaultTab || tabs[0]?.value);
//   const [isPending, startTransition] = useTransition();
//   const [optimisticTab, setOptimisticTab] = useOptimistic(tab);
//   useEffect(() => {
//     if (!tab && tabs.length > 0) {
//       setTab(defaultTab || tabs[0].value);
//     }
//   }, [tabs, defaultTab, tab]);

//   const handleTabChange = (nextTab: string) => {
//     if (nextTab === tab) return;

//     // Optimistically switch UI instantly

//     // Defer real state update (simulate async transition)
//     startTransition(() => {
//       setOptimisticTab(nextTab);
//       setTab(nextTab); // optional delay for realism
//     });
//   };
//   const currentContent = tabs.find((t) => t.value === tab)?.content;

//   return (
//     <div className="p-2">
//       {/* --- Tab Buttons --- */}
//       <div className="mb-3 flex flex-wrap gap-2">
//         {tabs.map((t) => (
//           <Button
//             className="rounded-lg shadow-xl/20 shadow-gray-900"
//             key={t.value}
//             onClick={() => handleTabChange(t.value)}
//             variant={optimisticTab === t.value ? "default" : "outline"}
//             disabled={isPending}
//           >
//             {t.label}
//           </Button>
//         ))}
//       </div>

//       {/* --- Loader --- */}
//       {isPending &&
//         (loader || (
//           <div className="flex justify-center py-6">
//             <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
//           </div>
//         ))}

//       {/* --- Tab Content --- */}
//       <div
//         className={`transition-opacity ${
//           disableTransition ? "" : "duration-300"
//         } ${isPending ? "opacity-0" : "opacity-100"}`}
//       >
//         {!isPending && currentContent}
//       </div>
//     </div>
//   );
// }
"use client";
import {
  useTransition,
  useState,
  ReactNode,
  useEffect,
  useOptimistic,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type TabItem = {
  value: string;
  label: string;
  content: ReactNode;
};

type ReusableTabsProps = {
  tabs: TabItem[];
  defaultTab?: string;
  disableTransition?: boolean;
  loader?: ReactNode;
  /** Optional query param key (default = "tab") */
  paramKey?: string;
};

export default function DashboardTabs({
  tabs,
  defaultTab,
  disableTransition = false,
  loader,
  paramKey = "tab",
}: ReusableTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get(paramKey);
  const [tab, setTab] = useState<string>(
    tabFromUrl || defaultTab || tabs[0]?.value,
  );
  const [isPending, startTransition] = useTransition();
  const [optimisticTab, setOptimisticTab] = useOptimistic(tab);

  // Keep tab in sync with URL changes (e.g., back/forward navigation)
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl, tab]);

  const handleTabChange = (nextTab: string) => {
    if (nextTab === tab) return;

    startTransition(() => {
      setOptimisticTab(nextTab);
      setTab(nextTab);

      const newParams = new URLSearchParams();
      newParams.set(paramKey, nextTab); // usually paramKey = "tab"

      router.push(`?${newParams.toString()}`, { scroll: false });
    });
  };

  const currentContent = tabs.find((t) => t.value === tab)?.content;

  return (
    <div className="p-2">
      {/* --- Tab Buttons --- */}
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            variant={optimisticTab === t.value ? "default" : "outline"}
            disabled={isPending}
            className="rounded-lg shadow-md"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* --- Loader --- */}
      {isPending &&
        (loader || (
          <div className="flex justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ))}

      {/* --- Tab Content --- */}
      <div
        className={`transition-opacity ${
          disableTransition ? "" : "duration-300"
        } ${isPending ? "opacity-0" : "opacity-100"}`}
      >
        {!isPending && currentContent}
      </div>
    </div>
  );
}
