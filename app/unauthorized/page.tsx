import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">غير مصرح</h1>
        <p className="mt-3 text-sm text-slate-600">
          ليس لديك صلاحية للوصول إلى هذه الصفحة.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/landing"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            العودة للرئيسية
          </Link>
          <Link
            href="/login"
            className="rounded-full border px-5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
