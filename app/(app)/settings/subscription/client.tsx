import { PlanSubmitButton } from "./PlanSubmitButton"; // Import the button from above

type sub = {
  status: string;
  plan: string;
  maxBranches: number | null;
  maxCashiers: number | null;
  startsAt: Date;
  endsAt: Date | null;
  maxWarehouses: number | null;
  maxUsers: number | null;
} | null;

// The plans data defined as a constant to keep the JSX clean
const PLANS = [
  {
    key: "TRIAL",
    label: "تجربة مجانية",
    days: "7 أيام",
    features: "1 فرع • 1 كاشير • 1 مخزن • 2 مستخدم",
  },
  {
    key: "BASIC",
    label: "أساسي",
    days: "30 يوم",
    features: "1 فرع • 2 كاشير • 1 مخزن • 5 مستخدم",
  },
  {
    key: "ADVANCE",
    label: "متقدم",
    days: "90 يوم",
    features: "3 فروع • 5 كاشير • 3 مخازن • 15 مستخدم",
  },
  {
    key: "PRO",
    label: "أكثر تقدماً",
    days: "180 يوم",
    features: "10 فروع • 20 كاشير • 10 مخازن • 50 مستخدم",
  },
];

export default function Sub({
  sub,
  planAction,
}: {
  sub: sub;
  planAction: (formData: FormData) => void;
}) {
  if (!sub) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">الاشتراك</h1>
        <p className="text-muted-foreground text-sm">لا يوجد اشتراك مسجل.</p>
      </div>
    );
  }

  return (
    <div className="p-4" dir="rtl">
      <h1 className="text-2xl font-bold">الاشتراك</h1>

      {/* Current Subscription Details */}
      <div className="bg-card mt-4 grid gap-3 rounded-xl border p-4">
        <div>
          الخطة: <span className="font-bold">{sub.plan}</span>
        </div>
        <div>
          الحالة:{" "}
          <span className="font-medium text-green-600">{sub.status}</span>
        </div>
        <div>من: {new Date(sub.startsAt).toLocaleDateString("ar-EG")}</div>
        <div>
          إلى:{" "}
          {sub.endsAt ? new Date(sub.endsAt).toLocaleDateString("ar-EG") : "—"}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2 text-sm opacity-80 md:grid-cols-4">
          <div>الفروع: {sub.maxBranches ?? "∞"}</div>
          <div>الكاشير: {sub.maxCashiers ?? "∞"}</div>
          <div>المخازن: {sub.maxWarehouses ?? "∞"}</div>
          <div>المستخدمين: {sub.maxUsers ?? "∞"}</div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">خطط الاشتراك</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="hover:border-primary flex flex-col justify-between rounded-xl border p-4 transition-colors"
            >
              <div>
                <div className="text-muted-foreground text-sm">
                  {plan.label}
                </div>
                <div className="text-lg font-bold">{plan.key}</div>
                <div className="mt-2 text-sm font-medium">{plan.days}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {plan.features}
                </div>
              </div>

              <form action={planAction} className="mt-4">
                <input type="hidden" name="plan" value={plan.key} />
                <PlanSubmitButton isCurrentPlan={sub.plan === plan.key} />
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
