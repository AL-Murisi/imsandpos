"use client";

import { updateMultipleInventory } from "@/lib/actions/warehouse";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Package, Search, Info } from "lucide-react";
import { Prisma } from "@prisma/client";
import { fetchPayments } from "@/lib/actions/banks";
import {
  PaymentState,
  ReusablePayment,
} from "@/components/common/ReusablePayment";

interface InventoryUpdateItem {
  id: string;
  inventoryId?: string;
  productId: string;
  warehouseId: string;
  supplierId?: string;
  stockQuantity: string;
  reservedQuantity: string;
  currentStock?: number;
  unitCost: string;
  currency_code: string;
  notes?: string;
  updateType: "manual" | "supplier";
  warehousesForProduct?: { id: string; name: string }[];
  payment?: PaymentState;
}

interface MultiInventoryUpdateFormProps {
  multipleInventory: {
    products: {
      id: string;
      sku: string;
      name: string;
      supplierId: string | null;
      costPrice: Prisma.Decimal;
    }[];
    warehouses: {
      id: string;
      name: string;
      location: string;
    }[];
    suppliers: {
      id: string;
      name: string;
    }[];
    inventories: {
      id: string;
      warehouseId: string;
      status: string;
      product: {
        sku: string;
        name: string;
        supplierId: string | null;
        costPrice: Prisma.Decimal;
      };
      productId: string;
      stockQuantity: number;
      availableQuantity: number;
      reservedQuantity: number;
      reorderLevel: number;
      warehouse: {
        name: string;
        location: string;
      };
    }[];
  };
  payments: any;
}

interface Account {
  id: string;
  name: string;
  currency: string | null;
}

export default function MultiInventoryUpdateForm({
  multipleInventory,
  payments,
}: MultiInventoryUpdateFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateDate, setUpdateDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const { user } = useAuth();

  // ✅ FIX: Add accounts state for each inventory item
  const [accountsByInventory, setAccountsByInventory] = useState<
    Record<string, Account[]>
  >({});

  const [inventoryUpdates, setInventoryUpdates] = useState<
    InventoryUpdateItem[]
  >([
    {
      id: crypto.randomUUID(),
      productId: "",
      warehouseId: "",
      supplierId: "",
      stockQuantity: "",
      reservedQuantity: "0",
      unitCost: "",
      currency_code: "YER",
      notes: "",
      updateType: "manual",
      warehousesForProduct: [],
    },
  ]);

  if (!user) return null;

  // ✅ FIX: Load accounts when payment method changes for each inventory item
  useEffect(() => {
    if (!open) return;

    async function loadAccountsForAll() {
      try {
        const { banks, cashAccounts } = payments;

        const newAccountsByInventory: Record<string, Account[]> = {};

        inventoryUpdates.forEach((inv) => {
          if (inv.payment?.paymentMethod === "bank") {
            newAccountsByInventory[inv.id] = banks;
          } else if (inv.payment?.paymentMethod === "cash") {
            newAccountsByInventory[inv.id] = cashAccounts;
          } else {
            newAccountsByInventory[inv.id] = [];
          }
        });

        setAccountsByInventory(newAccountsByInventory);
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب الحسابات");
      }
    }

    loadAccountsForAll();
  }, [
    open,
    inventoryUpdates
      .map((inv) => `${inv.id}-${inv.payment?.paymentMethod}`)
      .join(","),
  ]);

  const loadProductData = (updateId: string, productId: string) => {
    if (!productId) return;

    try {
      const product = multipleInventory.products.find(
        (p) => p.id === productId,
      );

      const productInventories = multipleInventory.inventories.filter(
        (inv) => inv.productId === productId,
      );

      const warehousesForProduct = productInventories.map((inv) => ({
        id: inv.warehouseId,
        name: inv.warehouse.name,
      }));

      const supplierId = product?.supplierId || undefined;

      setInventoryUpdates((prevUpdates) =>
        prevUpdates.map((inv) =>
          inv.id === updateId
            ? {
                ...inv,
                warehousesForProduct,
                supplierId,
                unitCost: product?.costPrice
                  ? Number(product.costPrice).toString()
                  : inv.unitCost,
              }
            : inv,
        ),
      );

      if (warehousesForProduct.length === 1) {
        const singleWarehouse = warehousesForProduct[0];
        setTimeout(() => {
          updateInventory(updateId, "warehouseId", singleWarehouse.id);
          toast.info(`تم اختيار المستودع تلقائياً: ${singleWarehouse.name}`, {
            duration: 2000,
          });
        }, 100);
      } else if (warehousesForProduct.length > 1) {
        toast.info(
          `يوجد ${warehousesForProduct.length} مستودعات لهذا المنتج. يرجى اختيار واحد.`,
          { duration: 2000 },
        );
      }
    } catch (error) {
      console.error("Error loading product data:", error);
    }
  };

  const loadExistingInventory = (
    updateId: string,
    productId: string,
    warehouseId: string,
  ) => {
    if (!productId || !warehouseId) return;

    try {
      const existingInventory = multipleInventory.inventories.find(
        (inv) => inv.productId === productId && inv.warehouseId === warehouseId,
      );

      if (existingInventory) {
        setInventoryUpdates((prevUpdates) =>
          prevUpdates.map((inv) =>
            inv.id === updateId
              ? {
                  ...inv,
                  inventoryId: existingInventory.id,
                  currentStock: existingInventory.stockQuantity,
                  reservedQuantity:
                    existingInventory.reservedQuantity?.toString() || "0",
                  unitCost: existingInventory.product?.costPrice
                    ? Number(existingInventory.product.costPrice).toString()
                    : inv.unitCost,
                  supplierId:
                    existingInventory.product?.supplierId || inv.supplierId,
                }
              : inv,
          ),
        );
      } else {
        setInventoryUpdates((prevUpdates) =>
          prevUpdates.map((inv) =>
            inv.id === updateId
              ? {
                  ...inv,
                  inventoryId: undefined,
                  currentStock: undefined,
                }
              : inv,
          ),
        );

        toast.info("لا يوجد مخزون سابق لهذا المنتج في هذا المستودع", {
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
    }
  };

  const addInventoryUpdate = () => {
    setInventoryUpdates([
      ...inventoryUpdates,
      {
        id: crypto.randomUUID(),
        productId: "",
        warehouseId: "",
        supplierId: "",
        stockQuantity: "",
        reservedQuantity: "0",
        unitCost: "",
        currency_code: "YER",
        notes: "",
        updateType: "manual",
        warehousesForProduct: [],
      },
    ]);
  };

  const removeInventoryUpdate = (id: string) => {
    if (inventoryUpdates.length > 1) {
      setInventoryUpdates(inventoryUpdates.filter((inv) => inv.id !== id));
    } else {
      toast.error("يجب أن يكون هناك تحديث واحد على الأقل");
    }
  };

  const updateInventory = (
    id: string,
    field: keyof InventoryUpdateItem,
    value: any,
  ) => {
    setInventoryUpdates((prevUpdates) =>
      prevUpdates.map((inv) => {
        if (inv.id === id) {
          const updated = { ...inv, [field]: value };

          if (field === "productId") {
            updated.warehouseId = "";
            updated.currentStock = undefined;
            updated.inventoryId = undefined;

            setTimeout(() => {
              loadProductData(id, value);
            }, 100);
          }

          if (field === "warehouseId" && inv.productId) {
            setTimeout(() => {
              loadExistingInventory(id, inv.productId, value);
            }, 100);
          }

          return updated;
        }
        return inv;
      }),
    );
  };

  const totalItems = inventoryUpdates.reduce(
    (sum, inv) => sum + (parseFloat(inv.stockQuantity) || 0),
    0,
  );

  const totalCost = inventoryUpdates.reduce((sum, inv) => {
    const qty = parseFloat(inv.stockQuantity) || 0;
    const cost = parseFloat(inv.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  const handleSubmit = async () => {
    const invalidUpdates = inventoryUpdates.filter(
      (inv) =>
        !inv.productId ||
        !inv.warehouseId ||
        !inv.stockQuantity ||
        parseFloat(inv.stockQuantity) <= 0,
    );

    if (invalidUpdates.length > 0) {
      toast.error("يرجى ملء الحقول المطلوبة لجميع التحديثات");
      return;
    }

    for (const inv of inventoryUpdates) {
      if (inv.updateType === "supplier") {
        if (!inv.supplierId) {
          toast.error("يرجى اختيار المورد للتحديثات من المورد");
          return;
        }
        if (!inv.unitCost || parseFloat(inv.unitCost) <= 0) {
          toast.error("يرجى إدخال سعر الوحدة للتحديثات من المورد");
          return;
        }

        const totalItemCost =
          parseFloat(inv.stockQuantity) * parseFloat(inv.unitCost);
        if (
          inv.payment &&
          parseFloat(String(inv.payment.amountBase)) > totalItemCost
        ) {
          toast.error("مبلغ الدفع أكبر من إجمالي التكلفة");
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const updatesData = inventoryUpdates.map((inv) => {
        const stockQty = parseFloat(inv.stockQuantity);
        const reservedQty = parseFloat(inv.reservedQuantity) || 0;
        return {
          id: inv.inventoryId,
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          updateType: inv.updateType,
          stockQuantity: stockQty,
          reservedQuantity: reservedQty,
          availableQuantity: stockQty - reservedQty,
          supplierId:
            inv.updateType === "supplier" ? inv.supplierId : undefined,
          quantity: inv.updateType === "supplier" ? stockQty : undefined,
          unitCost:
            inv.updateType === "supplier"
              ? parseFloat(inv.unitCost)
              : undefined,
          currency_code: inv.currency_code,
          notes: inv.notes,
          reason: inv.updateType === "manual" ? inv.notes : undefined,
          lastStockTake: new Date(updateDate),
          payment: inv.payment,
          paymentAmount: inv.payment?.amountBase,
        };
      });

      const result = await updateMultipleInventory(
        updatesData,
        user.userId,
        user.companyId,
      );

      if (result.success) {
        toast.success(
          `تم تحديث ${result.count} سجل مخزون بنجاح! إجمالي الوحدات: ${totalItems}`,
        );

        setInventoryUpdates([
          {
            id: crypto.randomUUID(),
            productId: "",
            warehouseId: "",
            supplierId: "",
            stockQuantity: "",
            reservedQuantity: "0",
            unitCost: "",
            currency_code: "YER",
            notes: "",
            updateType: "manual",
            warehousesForProduct: [],
          },
        ]);
        setUpdateDate(new Date().toISOString().split("T")[0]);
        setOpen(false);
      } else {
        toast.error(result.error || "حدث خطأ أثناء تحديث المخزون");
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      toast.error("حدث خطأ أثناء تحديث المخزون");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="تحديث مخزون متعدد"
      style="sm:max-w-6xl"
      titel="تحديث مخزون متعدد"
    >
      <ScrollArea className="h-[75vh] w-full pr-4">
        <div className="space-y-4" dir="rtl">
          {/* Header with Date and Totals */}
          <div className="bg-card sticky top-0 z-10 rounded-lg border p-4 shadow-md">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>تاريخ التحديث</Label>
                <Input
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>إجمالي الوحدات</Label>
                <div className="bg-muted flex h-10 items-center rounded-md border px-3">
                  <Package className="text-muted-foreground ml-2 h-4 w-4" />
                  <span className="text-primary text-lg font-bold">
                    {totalItems.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>إجمالي التكلفة</Label>
                <div className="bg-muted flex h-10 items-center rounded-md border px-3">
                  <span className="text-primary text-lg font-bold">
                    {totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-between">
              <Button onClick={addInventoryUpdate} size="sm" variant="outline">
                <Plus className="ml-2 h-4 w-4" />
                إضافة تحديث آخر
              </Button>
              <span className="text-muted-foreground text-sm">
                عدد التحديثات: {inventoryUpdates.length}
              </span>
            </div>
          </div>

          {/* Inventory Update Items */}
          <div className="space-y-4">
            {inventoryUpdates.map((inventory, index) => {
              const itemCost =
                (parseFloat(inventory.stockQuantity) || 0) *
                (parseFloat(inventory.unitCost) || 0);
              const availableQty =
                (parseFloat(inventory.stockQuantity) || 0) -
                (parseFloat(inventory.reservedQuantity) || 0);

              return (
                <div
                  key={inventory.id}
                  className="bg-card space-y-3 rounded-lg border p-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-semibold">التحديث {index + 1}</h3>
                    {inventoryUpdates.length > 1 && (
                      <Button
                        onClick={() => removeInventoryUpdate(inventory.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Update Type */}
                  <div className="rounded-lg border p-3">
                    <Label className="mb-2 block text-sm">نوع التحديث</Label>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={inventory.updateType === "manual"}
                          onChange={() =>
                            updateInventory(
                              inventory.id,
                              "updateType",
                              "manual",
                            )
                          }
                          className="cursor-pointer"
                        />
                        <span className="text-sm">تحديث يدوي</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={inventory.updateType === "supplier"}
                          onChange={() =>
                            updateInventory(
                              inventory.id,
                              "updateType",
                              "supplier",
                            )
                          }
                          className="cursor-pointer"
                        />
                        <span className="text-sm">استقبال من مورد</span>
                      </label>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid gap-3 md:grid-cols-3">
                    {/* Product */}
                    <div className="space-y-2">
                      <Label>
                        المنتج <span className="text-red-500">*</span>
                      </Label>
                      <SelectField
                        options={multipleInventory.products}
                        value={inventory.productId}
                        action={(val) =>
                          updateInventory(inventory.id, "productId", val)
                        }
                        placeholder="اختر المنتج"
                      />
                    </div>

                    {/* Warehouse */}
                    <div className="space-y-2">
                      <Label>
                        المستودع <span className="text-red-500">*</span>
                      </Label>
                      <SelectField
                        options={multipleInventory.warehouses}
                        value={inventory.warehouseId}
                        action={(val) =>
                          updateInventory(inventory.id, "warehouseId", val)
                        }
                        placeholder="اختر المستودع"
                        disabled={!inventory.productId}
                      />
                    </div>

                    {/* Stock Quantity */}
                    <div className="space-y-2">
                      <Label>
                        الكمية <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={inventory.stockQuantity}
                        onChange={(e) =>
                          updateInventory(
                            inventory.id,
                            "stockQuantity",
                            e.target.value,
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>

                    {/* Reserved Quantity */}
                    <div className="space-y-2">
                      <Label>الكمية المحجوزة</Label>
                      <Input
                        type="number"
                        value={inventory.reservedQuantity}
                        onChange={(e) =>
                          updateInventory(
                            inventory.id,
                            "reservedQuantity",
                            e.target.value,
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>

                    {/* Available Quantity */}
                    <div className="space-y-2">
                      <Label>الكمية المتاحة</Label>
                      <div className="bg-muted flex h-10 items-center rounded-md border px-3">
                        <span className="font-medium">
                          {availableQty.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Supplier fields */}
                    {inventory.updateType === "supplier" && (
                      <>
                        <div className="space-y-2">
                          <Label>
                            المورد <span className="text-red-500">*</span>
                          </Label>
                          <SelectField
                            options={multipleInventory.suppliers}
                            value={inventory.supplierId || ""}
                            action={(val) =>
                              updateInventory(inventory.id, "supplierId", val)
                            }
                            placeholder="اختر المورد"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            سعر الوحدة <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={inventory.unitCost}
                            onChange={(e) =>
                              updateInventory(
                                inventory.id,
                                "unitCost",
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                          />
                        </div>

                        {/* ✅ FIX: Pass correct accounts for this inventory item */}
                        <div className="md:col-span-3">
                          <ReusablePayment
                            value={
                              inventory.payment || {
                                paymentMethod: "",
                                accountId: "",
                                accountCurrency: "",
                                amountBase: 0,
                              }
                            }
                            accounts={accountsByInventory[inventory.id] || []}
                            action={(val) =>
                              updateInventory(inventory.id, "payment", val)
                            }
                          />
                        </div>
                      </>
                    )}

                    {/* Notes */}
                    <div className="space-y-2 md:col-span-3">
                      <Label>ملاحظات</Label>
                      <Textarea
                        rows={2}
                        value={inventory.notes || ""}
                        onChange={(e) =>
                          updateInventory(inventory.id, "notes", e.target.value)
                        }
                        placeholder="أدخل ملاحظات"
                      />
                    </div>
                  </div>

                  {/* Item Summary */}
                  {inventory.updateType === "supplier" && (
                    <div className="flex justify-between border-t pt-2 text-sm">
                      <span className="text-muted-foreground">
                        التكلفة الإجمالية:
                      </span>
                      <span className="text-primary font-bold">
                        {itemCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <div className="bg-card sticky bottom-0 rounded-lg border p-4 shadow-lg">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || inventoryUpdates.length === 0}
              className="w-full"
              size="lg"
            >
              <Save className="ml-2 h-5 w-5" />
              {isSubmitting
                ? "جاري الحفظ..."
                : `حفظ ${inventoryUpdates.length} تحديث`}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </Dailogreuse>
  );
}
