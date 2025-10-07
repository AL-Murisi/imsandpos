// app/login/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        router.push("/");
        toast("logging successfully ✅ ");
      } else {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }
    } catch (err) {
      setError("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  // Quick login buttons for testing
  const quickLogin = async (userType: string) => {
    const credentials = {
      admin: { email: "admin@example.com", password: "admin123" },
      worker: { email: "worker@example.com", password: "worker123" },
      customer: { email: "customer@example.com", password: "customer123" },
      supplier: { email: "supplier@example.com", password: "supplier123" },
    };

    const cred = credentials[userType as keyof typeof credentials];
    if (cred) {
      setEmail(cred.email);
      setPassword(cred.password);
      setError("");
      setLoading(true);

      try {
        const success = await login(cred.email, cred.password);
        if (success) {
          // router.push("/");
        } else {
          setError("فشل في تسجيل الدخول");
        }
      } catch (err) {
        setError("حدث خطأ أثناء تسجيل الدخول");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل بياناتك للوصول إلى نظام إدارة المخزون
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <Label className="p-3 text-red-600">{error}</Label>
              </div>
            </div>
            <div className="space-y-2 p-3">
              <p className="text-center text-sm text-gray-500">
                تسجيل دخول سريع للاختبار:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin("admin")}
                  disabled={loading}
                >
                  مدير
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin("worker")}
                  disabled={loading}
                >
                  عامل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin("customer")}
                  disabled={loading}
                >
                  عميل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin("supplier")}
                  disabled={loading}
                >
                  مورد
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="top-4 flex flex-col space-y-4">
            <Button
              type="submit"
              className="p-x-5 p-y-5 w-full"
              disabled={loading}
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
