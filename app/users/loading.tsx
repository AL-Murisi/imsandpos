// ap
import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="flex flex-col p-3">
      <div className="mb-2 flex gap-2">
        {["userDashboard", "useractivity", "userroles"].map((t) => (
          <Button key={t}>
            {t === "useractivity"
              ? "المستخدمين"
              : t === "userDashboard"
                ? "أدوار المستخدمين"
                : "أنشطة المستخدمين"}
          </Button>
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
