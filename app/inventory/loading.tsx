import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="flex flex-col p-3">
      {/* <div className="mb-2 flex gap-2">
        {["inventory", "purchases", "movement"].map((t) => (
          <Button key={t} variant={t === "inventory" ? "default" : "outline"}>
            {t === "inventory"
              ? "المخزون"
              : t === "purchases"
                ? "الطلبات"
                : "حركات المخزون"}
          </Button>
        ))}
      </div> */}
      <TableSkeleton />
    </div>
  );
}
