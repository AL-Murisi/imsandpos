import { ScrollArea } from "@/components/ui/scroll-area";
import { getSession } from "@/lib/session";
import InventoryTabs from "@/components/common/InventoryTabs";

export default async function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const roles = session?.role ?? "";

  const navItems = [
    { label: "المبيعات", href: "/salesDashboard", roles: ["admin", "cashier"] },
    { label: "الكاشير", href: "/cashiercontrol", roles: ["admin", "cashier"] },
  ];

  const visibleItems = navItems.filter((item) =>
    item.roles.some((role) => roles.includes(role)),
  );

  return (
    <div className="space-y-2">
      <div className="px-5">
        <InventoryTabs items={visibleItems} />
      </div>

      <ScrollArea className="h-[90vh] transition-opacity duration-300">
        {children}
      </ScrollArea>
    </div>
  );
}
