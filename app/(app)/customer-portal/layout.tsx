import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

const navItems = [
  { href: "/customer-portal", label: "الرئيسية" },
  { href: "/customer-portal/receipts", label: "الفواتير" },
  { href: "/customer-portal/vouchers", label: "السندات" },
  { href: "/customer-portal/statement", label: "كشف الحساب" },
  { href: "/customer-portal/reports", label: "التقارير" },
];

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  noStore();
  const session = await getSession();
  if (!session || session.role !== "customer") {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-4 p-3 md:p-4">
      <div className="rounded-3xl border bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">بوابة العميل</h1>
        <p className="mt-1 text-sm text-slate-600">
          وصول مقيد إلى بياناتك فقط: الفواتير، السندات، كشف الحساب، والتقارير.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
