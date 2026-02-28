// ap
import TableSkeleton from "@/components/skeleton/table";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="h-[68vh] overflow-hidden p-3">
      <TableSkeleton rows={20} columns={10} />
    </div>
  );
}
