import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SummaryCards({ cards }: any) {
  return (
    <section className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-5">
      {cards.map((item: any) => (
        <SummaryCard key={item.title} item={item} />
      ))}
    </section>
  );
}

function SummaryCard({ item }: { item: any }) {
  const Icon = item.icon;
  return (
    <Card
      className={`min-w-0 gap-0 border bg-linear-to-br ${item.tone} shadow-sm`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
        <div className="min-w-0 space-y-1">
          <div className="text-xs tracking-[0.08em] text-slate-500">
            {item.title}
          </div>
          <CardTitle className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            {item.value}
          </CardTitle>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm leading-6 break-words text-slate-600">
          {item.subtitle}
        </p>
      </CardContent>
    </Card>
  );
}
