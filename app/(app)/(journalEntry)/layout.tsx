import { ScrollArea } from "@/components/ui/scroll-area";
import InventoryTabs from "@/components/common/InventoryTabs";
import { getSession } from "@/lib/session";
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
      label: "يومية",
      href: "/journal",
      roles: ["admin", "accountant"],
    },
    {
      label: "قيد يدوي",
      href: "/menualjournal",
      roles: ["admin", "accountant"],
    },
    {
      label: "سنة مالية",
      href: "/fiscalYears",
      roles: ["admin", "accountant"],
    },
    {
      label: "السندات",
      href: "/voucher",
      roles: ["admin", "accountant"],
    },
    {
      label: "المصاريف",
      href: "/expenses",
      roles: ["admin", "accountant"],
    },
    {
      label: "حسابات ماليه",
      href: "/banks",
      roles: ["admin", "accountant"],
    },
  ];

  const visibleTabs = navItems.filter((item) =>
    item.roles.some((role) => roles.includes(role)),
  );
  return (
    <div className="space-y-2">
      {" "}
      <div className="px-5">
        <InventoryTabs items={visibleTabs} />
      </div>
      <ScrollArea className="h-[90vh] transition-opacity duration-300">
        {children}
      </ScrollArea>
    </div>
  );
}
