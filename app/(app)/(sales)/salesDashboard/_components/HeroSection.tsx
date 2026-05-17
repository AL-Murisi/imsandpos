import { CircleDollarSign, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculateCollectionRate } from "@/lib/calculations";

type HeroSectionProps = {
  scope: string;
  salesCount: number;
  returnsCount: number;
  dueSalesCount: number;
  salesTotal: number;
  receiptTotal: number;
  netMovement: number;
};

export function HeroSection({
  scope,
  salesCount,
  returnsCount,
  dueSalesCount,
  salesTotal,
  receiptTotal,
  netMovement,
}: HeroSectionProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 text-white shadow-lg">
      <div className="grid gap-6 p-4 md:p-7 lg:grid-cols-[1.6fr_1fr]">
        <HeroInfo
          scope={scope}
          salesCount={salesCount}
          returnsCount={returnsCount}
          dueSalesCount={dueSalesCount}
        />
        <HeroStats
          salesTotal={salesTotal}
          receiptTotal={receiptTotal}
          netMovement={netMovement}
        />
      </div>
    </section>
  );
}

function HeroInfo({
  scope,
  salesCount,
  returnsCount,
  dueSalesCount,
}: Omit<HeroSectionProps, "salesTotal" | "receiptTotal" | "netMovement">) {
  return (
    <div className="min-w-0 space-y-4">
      <Badge className="w-fit max-w-full bg-white/12 text-white hover:bg-white/12">
        {scope === "company" ? "لوحة الكاشير للشركة" : "لوحة الكاشير"}
      </Badge>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold md:text-3xl">
          ملخص سريع لأداء نقطة البيع
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
          راقب المبيعات والمرتجعات والتحصيلات والمدفوعات اليومية من شاشة واحدة
          وبنظرة واضحة.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm text-slate-100 md:gap-3">
        <StatBadge
          label={`${salesCount.toLocaleString("en-US")} عملية بيع اليوم`}
        />
        <StatBadge
          label={`${returnsCount.toLocaleString("en-US")} عملية مرتجع`}
        />
        <StatBadge
          label={`${dueSalesCount.toLocaleString("en-US")} فواتير بحاجة متابعة`}
        />
      </div>
    </div>
  );
}

function StatBadge({ label }: { label: string }) {
  return (
    <div className="max-w-full rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs sm:text-sm">
      {label}
    </div>
  );
}

function HeroStats({
  salesTotal,
  receiptTotal,
  netMovement,
}: Pick<HeroSectionProps, "salesTotal" | "receiptTotal" | "netMovement">) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <StatCard
        label="نسبة التحصيل"
        value={calculateCollectionRate(salesTotal, receiptTotal)}
        description="نسبة المقبوضات اليوم مقارنة بإجمالي قيمة المبيعات فقط."
        icon={<CircleDollarSign className="h-4 w-4 text-slate-200" />}
      />
      <StatCard
        label="صافي الحركة اليوم"
        value={netMovement.toLocaleString("en-US")}
        description="الفرق بين إجمالي المقبوضات وإجمالي المدفوعات خلال اليوم."
        icon={<Users className="h-4 w-4 text-slate-200" />}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-200">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-semibold">{value}</div>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </div>
  );
}
