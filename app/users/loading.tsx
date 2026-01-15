// ap
import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="flex flex-col p-3">
      {/* <div className="mb-2 flex flex-wrap gap-2">
        {["userDashboard", "useractivity", "userroles", "companyinfo"].map(
          (t) => (
            <Button
              key={t}
              variant={t === "userDashboard" ? "default" : "outline"}
            >
              {t === "useractivity"
                ? "المستخدمين"
                : t === "userDashboard"
                  ? "أدوار المستخدمين"
                  : t === "companyinfo"
                    ? " بيانات الشركة"
                    : "أنشطة المستخدمين"}
            </Button>
          ),
        )}
      </div> */}
      <TableSkeleton />
    </div>
  );
}
