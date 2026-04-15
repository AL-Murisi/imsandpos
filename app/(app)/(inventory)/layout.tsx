import { getSession } from "@/lib/session";
import InventoryTabs from "./_components/InventoryTabs";

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
    {
      label: "الرئيسيه",
      href: "/dashboardUser",
      roles: ["admin", "manager_wh"],
    },
    {
      label: "المخزون",
      href: "/inventory",
      roles: ["admin", "manager_wh"],
    },
    {
      label: "الموردين",
      href: "/suppliers",
      roles: ["admin", "manager_wh"],
    },

    {
      label: "المنتجات",
      href: "/products",
      roles: ["admin", "manager_wh", "cashier"],
    },
    {
      label: "أصناف",
      href: "/categories",
      roles: ["admin", "manager_wh"],
    },
  ];

  const visibleTabs = navItems.filter((item) =>
    item.roles.some((role) => roles.includes(role)),
  );

  return (
    <div className="space-y-2 p-1">
      <InventoryTabs items={visibleTabs} />
      <div>{children}</div>
    </div>
  );
}
