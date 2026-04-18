"use client";
import { useFormStatus } from "react-dom";

export function PlanSubmitButton({
  isCurrentPlan,
}: {
  isCurrentPlan: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || isCurrentPlan}
      className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "جاري التفعيل..." : isCurrentPlan ? "الخطة الحالية" : "تفعيل"}
    </button>
  );
}
