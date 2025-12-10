// app/dashboard/userroles/loading.tsx
import DashboardTabs from "@/components/common/Tabs";

import TableSkeleton from "@/components/common/TableSkeleton";
import SearchInput from "@/components/common/searchtest";
import { SelectField } from "@/components/common/selectproduct";
import CustomDialog from "@/components/common/Dailog";
import { Calendar22 } from "@/components/common/DatePicker";
import { Plus } from "lucide-react";

import CustomerForm from "./_components/Newcustomer";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="bg-accent flex flex-col p-3" dir="rtl">
      {/* Add dir="rtl" for proper RTL layout */}

      <TableSkeleton />
    </div>
  );
}
