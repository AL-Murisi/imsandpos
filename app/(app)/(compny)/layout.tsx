// app/(app)/(company)/layout.tsx
import InventoryTabs from "@/components/common/InventoryTabs";
import { getSession } from "@/lib/session";
type NavItem = {
  label: string;
  href: string;
  roles: string[];
};
export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const roles = session?.role ?? "";

  const navItems: NavItem[] = [
    { label: "معلومات الشركة", href: "/company", roles: ["admin"] },
    { label: "الأدوار", href: "/userroles", roles: ["admin"] },
    { label: "الفروع", href: "/branches", roles: ["admin"] },
  ];

  // Filter by role on server
  const visibleTabs = navItems.filter((item) =>
    item.roles.some((role) => roles.includes(role)),
  );

  return (
    <div className="space-y-2">
      <div className="px-5">
        <InventoryTabs items={visibleTabs} />
      </div>
      <div>{children}</div>
    </div>
  );
}
