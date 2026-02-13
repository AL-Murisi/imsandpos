"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createCompany } from "@/lib/actions/createcompnayacc";
import { useRouter } from "next/navigation";

export default function CreateCompanyAfterGoogle() {
  const router = useRouter();
  const [status, setStatus] = useState("جاري التحقق من بيانات جوجل...");
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user || !session.access_token) {
          router.replace("/login?error=google_session");
          return;
        }

        const user = session.user;
        const pending = localStorage.getItem("pendingCompany");

        if (pending) {
          setStatus("جاري إنشاء الشركة وربط حسابك...");
          const companyData = JSON.parse(pending);

          const result = await createCompany({
            ...companyData,
            adminEmail: companyData.adminEmail || user.email || "",
            adminName:
              companyData.adminName ||
              user.user_metadata?.full_name ||
              user.email ||
              "Admin",
            adminPassword: companyData.adminPassword || undefined,
            supabaseId: user.id,
          });

          if (!result.success) {
            setError(result.message || "فشل في إنشاء الشركة");
            return;
          }

          localStorage.removeItem("pendingCompany");
        }

        setStatus("جاري تسجيل الدخول...");
        const loginResponse = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token }),
        });

        if (!loginResponse.ok) {
          const payload = await loginResponse.json().catch(() => null);
          setError(payload?.error || "تعذر إنشاء جلسة تسجيل الدخول");
          return;
        }

        router.replace("/");
      } catch (e) {
        console.error("Google completion error:", e);
        setError("حدث خطأ أثناء إكمال تسجيل الدخول بجوجل");
      }
    };

    run();
  }, [router]);

  return (
    <div className="mt-20 text-center">
      {error ? <p className="text-red-600">{error}</p> : <p>{status}</p>}
    </div>
  );
}
