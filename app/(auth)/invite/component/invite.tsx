"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true); // New state for initial check

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("رابط غير صالح");
        setIsValidating(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/invite/validate?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "هذا الرابط لم يعد صالحاً");
          router.push("./login");
        } else {
          setEmail(data.email); // Pre-fill the email from the database
        }
      } catch (err) {
        router.push("./login");

        setError("حدث خطأ في الاتصال");
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid invite link");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter the invited email address");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (confirmPassword !== password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password, confirmPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invite failed");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1200);
    } catch (_err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] px-4 text-white">
        جاري التحقق من الرابط...
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827]/80 p-6 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold"> قبول دعوه الانضمام</h1>
        <p className="mb-6 text-sm text-gray-400">
          اكتب البريد المدعو وكلمه السر مرتين من اجل تنشيط حسابك بشكل امن
        </p>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {success && (
              <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                Password set. Redirecting...
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الالكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمه السر</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمه السر</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "حفظ..." : "تنشيط حسابك "}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
