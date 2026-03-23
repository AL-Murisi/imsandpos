import {
  getCompanySubscriptionInfo,
  renewSubscription,
  setSubscriptionPlan,
} from "@/lib/actions/subscription";

export default async function SubscriptionPage() {
  const sub = await getCompanySubscriptionInfo();
  async function renewAction() {
    "use server";
    await renewSubscription(30);
  }

  async function planAction(formData: FormData) {
    "use server";
    const plan = String(formData.get("plan") ?? "");
    await setSubscriptionPlan(plan);
  }

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
      <div className="mt-4 grid gap-3 rounded-xl border p-4">
        <div>الخطة: {sub.plan}</div>
        <div>الحالة: {sub.status}</div>
        <div>من: {new Date(sub.startsAt).toLocaleDateString("ar-EG")}</div>
        <div>
          إلى:{" "}
          {sub.endsAt ? new Date(sub.endsAt).toLocaleDateString("ar-EG") : "—"}
        </div>
        <div>الحد الأقصى للفروع: {sub.maxBranches ?? "غير محدد"}</div>
        <div>الحد الأقصى للكاشير: {sub.maxCashiers ?? "غير محدد"}</div>
        <div>الحد الأقصى للمخازن: {sub.maxWarehouses ?? "غير محدد"}</div>
        <div>الحد الأقصى للمستخدمين: {sub.maxUsers ?? "غير محدد"}</div>
      </div>
      <div className="mt-6" dir="rtl">
        <h2 className="text-xl font-semibold">خطط الاشتراك</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border p-4">
            <div className="text-muted-foreground text-sm">تجربة مجانية</div>
            <div className="text-lg font-bold">TRIAL</div>
            <div className="mt-2 text-sm">7 أيام</div>
            <div className="text-muted-foreground text-xs">
              1 فرع • 1 كاشير • 1 مخزن • 2 مستخدم
            </div>
            <form action={planAction} className="mt-3">
              <input type="hidden" name="plan" value="TRIAL" />
              <button className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs">
                تفعيل
              </button>
            </form>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-muted-foreground text-sm">أساسي</div>
            <div className="text-lg font-bold">BASIC</div>
            <div className="mt-2 text-sm">30 يوم</div>
            <div className="text-muted-foreground text-xs">
              1 فرع • 2 كاشير • 1 مخزن • 5 مستخدم
            </div>
            <form action={planAction} className="mt-3">
              <input type="hidden" name="plan" value="BASIC" />
              <button className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs">
                تفعيل
              </button>
            </form>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-muted-foreground text-sm">متقدم</div>
            <div className="text-lg font-bold">ADVANCE</div>
            <div className="mt-2 text-sm">90 يوم</div>
            <div className="text-muted-foreground text-xs">
              3 فروع • 5 كاشير • 3 مخازن • 15 مستخدم
            </div>
            <form action={planAction} className="mt-3">
              <input type="hidden" name="plan" value="ADVANCE" />
              <button className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs">
                تفعيل
              </button>
            </form>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-muted-foreground text-sm">أكثر تقدماً</div>
            <div className="text-lg font-bold">PRO</div>
            <div className="mt-2 text-sm">180 يوم</div>
            <div className="text-muted-foreground text-xs">
              10 فروع • 20 كاشير • 10 مخازن • 50 مستخدم
            </div>
            <form action={planAction} className="mt-3">
              <input type="hidden" name="plan" value="PRO" />
              <button className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs">
                تفعيل
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
