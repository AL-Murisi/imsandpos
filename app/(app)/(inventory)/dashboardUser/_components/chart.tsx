import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  CircleAlert,
  PackageSearch,
  TrendingUp,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getWarehouseDashboardData } from "@/lib/actions/warehouseDashboard";
import Cards from "./cards";
import WarehouseStatusChart from "./barchart";
import InventoryTables from "./table";

const headerColor = "#0b142a";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRelativeDate(date: string | Date | null) {
  if (!date) return "لا يوجد جرد بعد";

  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "تم التحديث اليوم";
  if (days === 1) return "تم التحديث أمس";
  return `تم التحديث قبل ${days} يوم`;
}

export default async function Chart() {
  const result = await getWarehouseDashboardData();

  if (!result.success) {
    redirect("/login");
  }

  const {
    warehouses,
    inventories,
    recentMovements,
    activeSuppliers,
    purchaseSummary,
    recentPurchaseCount,
  } = result.data;

  const inventoryTotals = inventories.reduce(
    (acc, item) => {
      acc.totalStock += item.stockQuantity;
      acc.totalAvailable += item.availableQuantity;
      acc.totalReserved += Math.max(
        item.stockQuantity - item.availableQuantity,
        0,
      );

      if (item.availableQuantity <= 0) {
        acc.outOfStock += 1;
      } else if (item.availableQuantity <= item.reorderLevel) {
        acc.lowStock += 1;
      } else {
        acc.healthy += 1;
      }

      return acc;
    },
    {
      totalStock: 0,
      totalAvailable: 0,
      totalReserved: 0,
      lowStock: 0,
      outOfStock: 0,
      healthy: 0,
    },
  );

  const chartData = warehouses.map((warehouseItem) => {
    const totals = warehouseItem.inventory.reduce(
      (acc, entry) => {
        acc.stock += entry.stockQuantity;
        acc.available += entry.availableQuantity;

        if (entry.availableQuantity <= 0) {
          acc.out += 1;
        } else if (entry.availableQuantity <= entry.reorderLevel) {
          acc.low += 1;
        } else {
          acc.healthy += 1;
        }

        return acc;
      },
      { stock: 0, available: 0, healthy: 0, low: 0, out: 0 },
    );

    return {
      name: warehouseItem.name,
      stock: totals.stock,
      available: totals.available,
      healthy: totals.healthy,
      low: totals.low,
      out: totals.out,
    };
  });

  const warehouseCards = warehouses.map((warehouseItem) => {
    const totalItems = warehouseItem.inventory.length;
    const totalStock = warehouseItem.inventory.reduce(
      (sum, entry) => sum + entry.stockQuantity,
      0,
    );
    const lowItems = warehouseItem.inventory.filter(
      (entry) =>
        entry.availableQuantity > 0 &&
        entry.availableQuantity <= entry.reorderLevel,
    ).length;
    const outItems = warehouseItem.inventory.filter(
      (entry) => entry.availableQuantity <= 0,
    ).length;
    const capacityEntries = warehouseItem.inventory.filter(
      (entry) => (entry.maxStockLevel ?? 0) > 0,
    );
    const capacityUsed = capacityEntries.reduce(
      (sum, entry) => sum + entry.stockQuantity,
      0,
    );
    const capacityMax = capacityEntries.reduce(
      (sum, entry) => sum + (entry.maxStockLevel ?? 0),
      0,
    );
    const utilization = capacityMax
      ? Math.min(Math.round((capacityUsed / capacityMax) * 100), 100)
      : 0;
    const latestStockTake = warehouseItem.inventory.reduce<string | null>(
      (latest, entry) => {
        if (!entry.lastStockTake) return latest;
        const currentDate = new Date(entry.lastStockTake);

        if (!latest || currentDate > new Date(latest)) {
          return currentDate.toISOString();
        }

        return latest;
      },
      null,
    );

    return {
      id: warehouseItem.id,
      name: warehouseItem.name,
      location: warehouseItem.location,
      totalItems,
      totalStock,
      lowItems,
      outItems,
      utilization,
      lastStockTake: formatRelativeDate(latestStockTake),
    };
  });

  const urgentItems = inventories
    .filter((item) => item.availableQuantity <= item.reorderLevel)
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      productName: item.product.name,
      sku: item.product.sku,
      warehouseName: item.warehouse.name,
      supplierName: item.product.supplier?.name ?? "بدون مورد",
      availableQuantity: item.availableQuantity,
      reorderLevel: item.reorderLevel,
      status: item.availableQuantity <= 0 ? "نفد المخزون" : "مخزون منخفض",
    }));

  const healthiestItems = [...inventories]
    .sort((a, b) => b.availableQuantity - a.availableQuantity)
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      productName: item.product.name,
      sku: item.product.sku,
      warehouseName: item.warehouse.name,
      supplierName: item.product.supplier?.name ?? "بدون مورد",
      availableQuantity: item.availableQuantity,
      reorderLevel: item.reorderLevel,
      status: "مستقر",
    }));

  const movementRows = recentMovements.map((movement) => ({
    id: movement.id,
    productName: movement.product.name,
    sku: movement.product.sku ?? "-",
    warehouseName: movement.warehouse.name,
    movementType: movement.movementType,
    quantity: movement.quantity,
    createdAt: new Date(movement.createdAt).toISOString(),
    actor: movement.user.name,
  }));

  const totalPurchaseValue = Number(purchaseSummary._sum.totalAmount ?? 0);
  const totalPurchaseDue = Number(purchaseSummary._sum.amountDue ?? 0);

  const statCards = [
    {
      title: "المخازن النشطة",
      value: formatNumber(warehouses.length),
      subtitle: "إجمالي المخازن المتابعة حالياً",
      icon: Warehouse,
      tone: "sky" as const,
    },
    {
      title: "الوحدات المتاحة",
      value: formatNumber(inventoryTotals.totalAvailable),
      subtitle: `${formatNumber(inventoryTotals.totalReserved)} وحدة محجوزة حالياً`,
      icon: Boxes,
      tone: "emerald" as const,
    },
    {
      title: "أصناف تحتاج متابعة",
      value: formatNumber(
        inventoryTotals.lowStock + inventoryTotals.outOfStock,
      ),
      subtitle: `${formatNumber(inventoryTotals.outOfStock)} صنف نافد الآن`,
      icon: AlertTriangle,
      tone: "amber" as const,
    },
    {
      title: "مشتريات آخر 30 يوم",
      value: formatNumber(recentPurchaseCount),
      subtitle: `${formatNumber(totalPurchaseDue)} رصيد مستحق للمشتريات`,
      icon: TrendingUp,
      tone: "violet" as const,
    },
  ];

  return (
    <ScrollArea className="h-[calc(94vh-3rem)]" dir="rtl">
      <div className="space-y-6 p-3 md:p-4">
        <section
          className="overflow-hidden rounded-[28px] border border-white/10 text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${headerColor} 0%, #132347 55%, #18325f 100%)`,
          }}
        >
          <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
              <Badge className="bg-white/12 text-white hover:bg-white/12">
                لوحة مدير المخزن
              </Badge>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold md:text-3xl">
                  ملخص سريع لحالة المخزن
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                  تابع حالة المخازن، ونواقص الأصناف الحرجة، والموردين النشطين،
                  وآخر حركات المخزون من شاشة واحدة مختصرة وواضحة.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-100">
                <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">
                  {formatNumber(inventoryTotals.healthy)} سجل مخزون بحالة جيدة
                </div>
                <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">
                  {formatNumber(activeSuppliers)} مورد نشط
                </div>
                <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">
                  قيمة المشتريات {formatNumber(totalPurchaseValue)}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-200">جاهزية المخزون</span>
                  <CircleAlert className="h-4 w-4 text-slate-200" />
                </div>
                <div className="text-3xl font-semibold">
                  {inventories.length
                    ? `${Math.round(
                        (inventoryTotals.healthy / inventories.length) * 100,
                      )}%`
                    : "0%"}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  نسبة الأصناف التي ما زالت أعلى من حد إعادة الطلب.
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-200">الأصناف الحرجة</span>
                  <PackageSearch className="h-4 w-4 text-slate-200" />
                </div>
                <div className="text-3xl font-semibold">
                  {formatNumber(inventoryTotals.outOfStock)}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  أصناف تحتاج إلى تزويد فوري.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Cards items={statCards} />

        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <WarehouseStatusChart data={chartData} warehouses={warehouseCards} />
          <InventoryTables
            urgentItems={urgentItems}
            healthiestItems={healthiestItems}
            movementRows={movementRows}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
