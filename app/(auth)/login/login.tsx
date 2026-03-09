"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
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
import svg from "../../../public/googleicon.svg";

import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Package,
  ShoppingCart,
  BarChart3,
  Boxes,
  Wallet,
  Receipt,
  Truck, // أضفتها لتعزيز ثيم المستودعات
  PackageSearch,
  Users,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("تم تسجيل الدخول بنجاح");
        window.location.replace(result.redirectPath ?? "/salesDashboard");
      } else {
        setError("بيانات الاعتماد غير صحيحة");
        setLoading(false);
      }
    } catch {
      setError("حدث خطأ ما، يرجى المحاولة لاحقاً");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn("google", {
      callbackUrl: "/",
    });
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1d]"
      dir="rtl"
    >
      {/* --- طبقة الخلفية التفاعلية --- */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]">
        <Package className="absolute top-10 left-10 h-32 w-32 rotate-12" />
        <ShoppingCart className="absolute right-20 bottom-20 h-40 w-40 -rotate-12" />
        <BarChart3 className="absolute top-1/4 right-1/4 h-24 w-24 rotate-45" />
        <Wallet className="absolute bottom-1/4 left-1/4 h-28 w-28 -rotate-6" />
        <PackageSearch className="absolute top-1/2 left-10 h-20 w-20" />
        <Receipt className="absolute bottom-10 left-1/2 h-24 w-24 rotate-12" />
        <Users className="absolute top-20 left-1/3 h-16 w-16" />
        <Building2 className="absolute right-10 bottom-1/3 h-32 w-32 opacity-20" />
      </div>
      {/* --- الكارت الرئيسي --- */}
      <Card className="z-10 w-full max-w-md border-gray-800 bg-[#111827]/80 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mb-2 flex justify-center">
            <div className="relative h-24 w-24 rounded-full bg-white p-1 shadow-2xl ring-4 ring-blue-600/20">
              <Image
                src={"/icons/icon-rounded-192.png"}
                alt="Logo"
                width={96}
                height={96}
                className="h-full w-full rounded-full object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-3xl font-extrabold text-white">
            تسجيل الدخول
          </CardTitle>
          <CardDescription className="text-gray-400">
            مرحباً بك مجدداً، أدخل بياناتك لإدارة مخزونك
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="mr-1 text-gray-300">
                البريد الإلكتروني
              </Label>
              <div className="relative">
                <Mail className="absolute top-3 right-3 h-4 w-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-700 bg-gray-900/50 pr-10 text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="mr-1 text-gray-300">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute top-3 right-3 h-4 w-4 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-700 bg-gray-900/50 pr-10 pl-10 text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3 left-3 text-gray-500 transition-colors hover:text-white"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-4">
            <Button
              type="submit"
              className="h-12 w-full bg-blue-600 text-lg font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "جاري الدخول..." : "دخول"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-400">ليس لديك حساب؟ </span>
              <Link
                href="/signup"
                className="font-semibold text-blue-400 underline-offset-4 hover:text-blue-300 hover:underline"
              >
                أنشئ حسابك الآن
              </Link>
            </div>

            <div className="relative w-full py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#111827] px-4 text-gray-500">أو عبر</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Image src={svg} alt="Google" width={30} height={30} />
              متابعة باستخدام جوجل
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
