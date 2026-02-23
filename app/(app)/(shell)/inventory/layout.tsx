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
  const roles = session?.roles ?? [];

  const navItems: NavItem[] = [
    {
      label: "المخزون",
      href: "/inventory/manageStocks/inventory",
      roles: ["admin", "manager_wh"],
    },
    {
      label: "التوريد",
      href: "/inventory/manageStocks/purchases",
      roles: ["admin", "manager_wh"],
    },
    {
      label: "الموردين",
      href: "/inventory/suppliers",
      roles: ["admin"],
    },
    {
      label: "حركات المخزون",
      href: "/inventory/manageStocks/movement",
      roles: ["admin"],
    },
    {
      label: "المنتجات",
      href: "/inventory/products",
      roles: ["admin", "manager_wh", "cashier"],
    },
    {
      label: "أصناف",
      href: "/inventory/categories",
      roles: ["admin", "manager_wh"],
    },
    {
      label: "مخازن",
      href: "/inventory/warehouses",
      roles: ["admin"],
    },
  ];

  const visibleTabs = navItems.filter((item) =>
    item.roles.some((role) => roles.includes(role)),
  );

  return (
    <div className="p-1">
      <InventoryTabs items={visibleTabs} />
      <div>{children}</div>
    </div>
  );
}
