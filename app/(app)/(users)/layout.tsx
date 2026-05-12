import { getSession } from "@/lib/session";
import InventoryTabs from "@/components/common/InventoryTabs";

type NavItem = {
  label: string;
  href: string;
  roles: string[];
};

export default async function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const roles = session?.role ?? "";
  const navItems: NavItem[] = [
    { label: "المستخدمين", href: "/user", roles: ["admin"] },
    { label: "العملاء", href: "/customer", roles: ["admin"] },
    { label: "الموظفين", href: "/employee", roles: ["admin"] },
    { label: "أنشطة المستخدم", href: "/userActiviteslogs", roles: ["admin"] },
  ];

  const visibleTabs = navItems.filter((item) =>
    item.roles.some((role) => roles.includes(role)),
  );
  return (
    <div className="space-y-2">
      <div className="px-5">
        <InventoryTabs items={visibleTabs} />
      </div>

      {/* Fade the content area while pending */}
      <div>{children}</div>
    </div>
  );
}
