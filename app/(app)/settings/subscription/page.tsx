import {
  getCompanySubscriptionInfo,
  renewSubscription,
  setSubscriptionPlan,
} from "@/lib/actions/subscription";
import Sub from "./client";

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

  return <Sub sub={sub} planAction={planAction} />;
}
