"use client";

import { useEffect, useState } from "react";
import { createCompany } from "@/lib/actions/createcompnayacc";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function CreateCompanyAfterGoogle() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [statusText, setStatusText] = useState("Checking Google account...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    const run = async () => {
      try {
        if (status !== "authenticated" || !session?.user?.email) {
          router.replace("/login?error=google_session");
          return;
        }

        const pending = localStorage.getItem("pendingCompany");

        if (pending) {
          setStatusText("Creating company and linking your account...");
          const companyData = JSON.parse(pending);

          const result = await createCompany({
            ...companyData,
            adminEmail: companyData.adminEmail || session.user.email || "",
            adminName:
              companyData.adminName ||
              session.user.name ||
              session.user.email ||
              "Admin",
            adminPassword: companyData.adminPassword || undefined,
            plan: companyData.plan || "TRIAL",
          });

          if (!result.success) {
            setError(result.message || "Failed to create company");
            return;
          }

          localStorage.removeItem("pendingCompany");
          setStatusText("Company created. Please sign in again...");
          await signOut({ redirect: false });
          router.replace("/login");
          return;
        }

        router.replace("/");
      } catch (e) {
        console.error("Google completion error:", e);
        setError("Error completing Google sign-in");
      }
    };

    void run();
  }, [router, session, status]);

  return (
    <div className="mt-20 text-center">
      {error ? <p className="text-red-600">{error}</p> : <p>{statusText}</p>}
    </div>
  );
}
