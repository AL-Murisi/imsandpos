import { fetchAllFormData } from "@/app/actions/roles";

import { getInventoryById, getStockMovements } from "@/app/actions/warehouse";
import DashboardTabs from "@/components/common/Tabs";
import { TabsContent } from "@/components/ui/tabs";
import { ParsedSort } from "@/hooks/sort";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import ManagemovementClient from "./_components/getMovementhistry";
import ManageinvetoryClient from "./_components/manageinvetoryClient";
// import { StockMovementColumns } from "./stockMovement/columns";
type DashboardProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    query?: string;
    movementquery?: string;
    inventoreyquery?: string;
    sort?: string;
    supplierId?: string;
    warehouseId?: string;
    categoryId?: string;
    tab?: string;
  }>;
};

export default async function Manageinvetory({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const {
    from,
    to,
    movementquery = "",
    query = "",
    page = "1",
    limit = "13",
    sort,
    inventoreyquery = "",
    supplierId,
    warehouseId,
    categoryId,
    tab,
  } = params || {};
  const currentTab = params.tab ?? "Invontery";
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  const [formData] = await Promise.all([
    fetchAllFormData(),
    // fetchProductStats("admin"),
    // Fetchusers(true),
  ]);

  const where: Prisma.InventoryWhereInput = {
    warehouseId,
  };

  const parsedSort: SortingState = ParsedSort(sort);
  const { inventory: fetchedProducts, totalCount: fetchedTotalCount } =
    await getInventoryById(
      inventoreyquery,
      where,
      from,
      to,
      pageIndex,
      pageSize,
      parsedSort,
    );
  const input: any = {
    supplierId,
    warehouseId,
    categoryId,
  };
  const { movements: fetchedProduct, totalCount: fetchedTotalCounts } =
    await getStockMovements(
      movementquery,
      input,
      from,
      to,
      pageIndex,
      pageSize,
    );
  const data = await fetchAllFormData();
  // const data = await getInventoryById();
  return (
    // <Tabs defaultValue="Invontery" className=" ">
    //   <TabsList className="bg-accent">
    //     <TabsTrigger value="Invontery">Invontery</TabsTrigger>
    //     <TabsTrigger value="movement">movement</TabsTrigger>
    //   </TabsList>{" "}
    //   <TabsContent value="Invontery">

    <DashboardTabs
      currentTab={currentTab}
      tabs={[
        { value: "Invontery", label: "Invontery" },
        { value: "movement", label: "Movement" },
      ]}
    >
      <TabsContent value="Invontery">
        <ManageinvetoryClient
          products={fetchedProducts}
          total={fetchedTotalCount}
          formData={formData}
        />
      </TabsContent>
      <TabsContent value="movement">
        {" "}
        <ManagemovementClient
          products={fetchedProduct}
          total={fetchedTotalCounts}
          formData={formData}
        />
      </TabsContent>
    </DashboardTabs>
  );
}
