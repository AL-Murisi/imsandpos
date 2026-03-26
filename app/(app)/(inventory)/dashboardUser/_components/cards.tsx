import { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "sky" | "emerald" | "amber" | "violet";

type CardItem = {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
};

const toneStyles: Record<Tone, { shell: string; iconWrap: string; icon: string }> = {
  sky: {
    shell: "border-sky-100 bg-linear-to-br from-white to-sky-50/80",
    iconWrap: "bg-sky-100",
    icon: "text-sky-700",
  },
  emerald: {
    shell: "border-emerald-100 bg-linear-to-br from-white to-emerald-50/80",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-700",
  },
  amber: {
    shell: "border-amber-100 bg-linear-to-br from-white to-amber-50/80",
    iconWrap: "bg-amber-100",
    icon: "text-amber-700",
  },
  violet: {
    shell: "border-violet-100 bg-linear-to-br from-white to-violet-50/80",
    iconWrap: "bg-violet-100",
    icon: "text-violet-700",
  },
};

interface CardsProps {
  items: CardItem[];
}

export default function Cards({ items }: CardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const tone = toneStyles[item.tone];

        return (
          <Card
            key={item.title}
            className={cn("gap-0 border shadow-sm", tone.shell)}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardDescription className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {item.title}
                </CardDescription>
                <CardTitle className="text-3xl font-semibold text-slate-900">
                  {item.value}
                </CardTitle>
              </div>
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl",
                  tone.iconWrap,
                )}
              >
                <Icon className={cn("h-5 w-5", tone.icon)} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm leading-6 text-slate-600">{item.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
