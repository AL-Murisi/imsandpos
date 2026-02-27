// ap
import TableSkeleton from "@/components/skeleton/table";

export default function Loading() {
  return (
    <div className="flex h-[89vh] flex-col overflow-hidden p-3">
      <TableSkeleton rows={10} columns={10} />
    </div>
  );
}
