import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="flex flex-col p-3">
      <div className="mb-2 flex gap-2">
        {["suppliers", "purchases", "payments"].map((t) => (
          <Button key={t}>
            {t === "suppliers"
              ? "المورّدون"
              : t === "purchases"
                ? "الطلبات"
                : "الدفعات"}
          </Button>
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
