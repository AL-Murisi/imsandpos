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
  paymentMethod: string;
  paymentAmount: string;
  currency_code: string;
  notes?: string;
  bankId?: string; // ✅ جديد
  referenceNumber?: string; // ✅ جديد
  updateType: "manual" | "supplier";
  warehousesForProduct?: { id: string; name: string }[]; // Available warehouses for selected product
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
}
interface bankcash {
  id: string;
  name: string;
  currency: string | null;
}

export default function MultiInventoryUpdateForm({
  multipleInventory,
}: MultiInventoryUpdateFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateDate, setUpdateDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const { user } = useAuth();
  const [banks, setBanks] = useState<bankcash[]>([]);
  const [cash, setCash] = useState<bankcash[]>([]);
  // Initialize with one empty inventory update
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
      paymentMethod: "cash",
      paymentAmount: "0",
      currency_code: "YER",
      notes: "",
      updateType: "manual",
      warehousesForProduct: [],
    },
  ]);
  useEffect(() => {
    if (!open) {
      setBanks([]);
      return;
    }
    const loadAccounts = async () => {
      try {
        const { banks, cashAccounts } = await fetchPayments();
        // Automatically choose accounts based on payment method
        setBanks(banks);
        setCash(cashAccounts);
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب الحسابات");
      }
    };

    loadAccounts();
  }, [open]);

  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },

    { id: "debt", name: "دين" },
  ];

  if (!user) return null;

  // Load data from props when component mounts or when multipleInventory changes

  // Load product-specific data when product is selected
  const loadProductData = (updateId: string, productId: string) => {
    if (!productId) return;

    try {
      // Find product details
      const product = multipleInventory.products.find(
        (p) => p.id === productId,
      );

      // Find all inventories for this product
      const productInventories = multipleInventory.inventories.filter(
        (inv) => inv.productId === productId,
      );

      // Extract unique warehouses for this product
      const warehousesForProduct = productInventories.map((inv) => ({
        id: inv.warehouseId,
        name: inv.warehouse.name,
      }));

      // Get supplier from product
      const supplierId = product?.supplierId || undefined;

      // Update the form
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

      // Auto-select warehouse if only one exists for this product
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

  // Load existing inventory when product and warehouse are selected
  const loadExistingInventory = (
    updateId: string,
    productId: string,
    warehouseId: string,
  ) => {
    if (!productId || !warehouseId) return;

    try {
      // Find existing inventory from loaded data
      const existingInventory = multipleInventory.inventories.find(
        (inv) => inv.productId === productId && inv.warehouseId === warehouseId,
      );

      if (existingInventory) {
        // Update the form with existing data
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
        // No existing inventory - clear current stock
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

  // Add new inventory update row
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
        paymentMethod: "cash",
        paymentAmount: "0",
        currency_code: "YER",
        bankId: "", // ✅
        referenceNumber: "", // ✅
        notes: "",
        updateType: "manual",
        warehousesForProduct: [],
      },
    ]);
  };

  // Remove inventory update row
  const removeInventoryUpdate = (id: string) => {
    if (inventoryUpdates.length > 1) {
      setInventoryUpdates(inventoryUpdates.filter((inv) => inv.id !== id));
    } else {
      toast.error("يجب أن يكون هناك تحديث واحد على الأقل");
    }
  };

  // Update inventory field
  const updateInventory = (
    id: string,
    field: keyof InventoryUpdateItem,
    value: any,
  ) => {
    setInventoryUpdates((prevUpdates) =>
      prevUpdates.map((inv) => {
        if (inv.id === id) {
          const updated = { ...inv, [field]: value };

          // When product changes, load product-specific data
          if (field === "productId") {
            // Reset warehouse selection
            updated.warehouseId = "";
            updated.currentStock = undefined;
            updated.inventoryId = undefined;

            // Load product data (warehouses, supplier, cost)
            setTimeout(() => {
              loadProductData(id, value);
            }, 100);
          }

          // When warehouse changes (and product is set), load inventory
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

  // Calculate totals
  const totalItems = inventoryUpdates.reduce(
    (sum, inv) => sum + (parseFloat(inv.stockQuantity) || 0),
    0,
  );

  const totalCost = inventoryUpdates.reduce((sum, inv) => {
    const qty = parseFloat(inv.stockQuantity) || 0;
    const cost = parseFloat(inv.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  // Validate and submit
  const handleSubmit = async () => {
    // Validation
    const invalidUpdates = inventoryUpdates.filter(
      (inv) =>
        !inv.productId ||
        !inv.warehouseId ||
        !inv.stockQuantity ||
        parseFloat(inv.stockQuantity) <= 0,
    );
    for (const inv of inventoryUpdates) {
      if (inv.updateType === "supplier" && inv.paymentMethod === "bank") {
        if (!inv.bankId) {
          toast.error("يرجى اختيار البنك للدفع البنكي");
          return;
        }
        if (!inv.referenceNumber) {
          toast.error("يرجى إدخال رقم المرجع");
          return;
        }
      }
    }

    if (invalidUpdates.length > 0) {
      toast.error("يرجى ملء الحقول المطلوبة لجميع التحديثات");
      return;
    }

    // Check supplier updates
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
        if (parseFloat(inv.paymentAmount) > totalItemCost) {
          toast.error("مبلغ الدفع أكبر من إجمالي التكلفة");
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare inventory updates data
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
          paymentMethod:
            inv.updateType === "supplier" ? inv.paymentMethod : undefined,
          paymentAmount:
            inv.updateType === "supplier"
              ? parseFloat(inv.paymentAmount) || 0
              : undefined,
          currency_code: inv.currency_code,
          notes: inv.notes,
          reason: inv.updateType === "manual" ? inv.notes : undefined,
          lastStockTake: new Date(updateDate),
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

        // Reset form
        setInventoryUpdates([
          {
            id: crypto.randomUUID(),
            productId: "",
            warehouseId: "",
            supplierId: "",
            stockQuantity: "",
            reservedQuantity: "0",
            unitCost: "",
            paymentMethod: "cash",
            paymentAmount: "0",
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
              const newTotal =
                (inventory.currentStock || 0) +
                (parseFloat(inventory.stockQuantity) || 0);

              // Determine which warehouses to show
              const currencyCode = banks.find(
                (b) => b.id === inventory.bankId,
              )?.currency;
              const currencyCodecash = cash.find(
                (b) => b.id === inventory.bankId,
              )?.currency;
              const warehouseOptions =
                inventory.warehousesForProduct &&
                inventory.warehousesForProduct.length > 0
                  ? inventory.warehousesForProduct
                  : multipleInventory.warehouses;

              return (
                <div
                  key={inventory.id}
                  className="bg-card space-y-3 rounded-lg border p-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b pb-2">
                    {/* <div className="flex items-center gap-2">
                      <h3 className="font-semibold">التحديث {index + 1}</h3>
                      {inventory.currentStock !== undefined && (
                        <span className="text-muted-foreground text-xs">
                          (المخزون الحالي: {inventory.currentStock})
                        </span>
                      )}
                    </div> */}
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
                      <div className="flex items-center gap-2">
                        <Label>
                          المستودع <span className="text-red-500">*</span>
                        </Label>
                        {inventory.warehousesForProduct &&
                          inventory.warehousesForProduct.length > 0 && (
                            <Info className="h-3 w-3 text-blue-500" />
                          )}
                      </div>
                      <SelectField
                        options={multipleInventory.warehouses}
                        value={inventory.warehouseId}
                        action={(val) =>
                          updateInventory(inventory.id, "warehouseId", val)
                        }
                        placeholder={
                          inventory.productId
                            ? "اختر المستودع"
                            : "اختر المنتج أولاً"
                        }
                        disabled={!inventory.productId}
                      />
                      {inventory.warehousesForProduct &&
                        inventory.warehousesForProduct.length > 0 && (
                          <p className="text-xs text-blue-600">
                            المستودعات المتاحة لهذا المنتج فقط
                          </p>
                        )}
                    </div>
                    {/* Current Stock Display
                    {inventory.currentStock !== undefined && (
                      <div className="space-y-2">
                        <Label>المخزون الحالي</Label>
                        <div className="flex h-10 items-center rounded-md border bg-blue-50 px-3">
                          <Search className="ml-2 h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-600">
                            {inventory.currentStock}
                          </span>
                        </div>
                      </div>
                    )} */}
                    {/* Stock Quantity */}
                    <div className="space-y-2">
                      <Label>
                        الكمية{" "}
                        {inventory.updateType === "supplier"
                          ? "المستلمة"
                          : "للإضافة"}{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        // value={inventory.stockQuantity}
                        onChange={(e) =>
                          updateInventory(
                            inventory.id,
                            "stockQuantity",
                            e.target.value,
                          )
                        }
                        placeholder="0.00"
                        className="text-right"
                      />
                    </div>
                    {/* New Total (if current stock exists) */}
                    {/* {inventory.currentStock !== undefined &&
                      inventory.stockQuantity && (
                        <div className="space-y-2">
                          <Label>المجموع الجديد</Label>
                          <div className="flex h-10 items-center rounded-md border bg-green-50 px-3">
                            <span className="font-bold text-green-600">
                              {newTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    Reserved Quantity */}
                    <div className="space-y-2">
                      <Label>الكمية المحجوزة</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={inventory.reservedQuantity}
                        onChange={(e) =>
                          updateInventory(
                            inventory.id,
                            "reservedQuantity",
                            e.target.value,
                          )
                        }
                        placeholder="0.00"
                        className="text-right"
                      />
                    </div>
                    {/* Available Quantity (calculated) */}
                    <div className="space-y-2">
                      <Label>الكمية المتاحة</Label>
                      <div className="bg-muted flex h-10 items-center rounded-md border px-3">
                        <span className="font-medium">
                          {availableQty.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Supplier (if supplier update) */}
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
                          {inventory.supplierId && (
                            <p className="text-xs text-green-600">
                              ✓ تم تحديد المورد من بيانات المنتج
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>
                            سعر الوحدة <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={inventory.unitCost}
                            onChange={(e) =>
                              updateInventory(
                                inventory.id,
                                "unitCost",
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                            className="text-right"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>طريقة الدفع</Label>
                          <SelectField
                            options={paymentMethods}
                            value={inventory.paymentMethod}
                            action={(val) =>
                              updateInventory(
                                inventory.id,
                                "paymentMethod",
                                val,
                              )
                            }
                            placeholder="اختر طريقة الدفع"
                          />
                        </div>
                        {inventory.paymentMethod === "bank" && (
                          <>
                            <div className="space-y-2">
                              <Label>
                                البنك <span className="text-red-500">*</span>
                              </Label>
                              <SelectField
                                options={banks}
                                value={inventory.bankId || ""}
                                action={(val) =>
                                  updateInventory(inventory.id, "bankId", val)
                                }
                                placeholder="اختر البنك"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>
                                رقم المرجع{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="text"
                                value={inventory.referenceNumber || ""}
                                onChange={(e) =>
                                  updateInventory(
                                    inventory.id,
                                    "referenceNumber",
                                    e.target.value,
                                  )
                                }
                                placeholder="رقم الحوالة / المرجع"
                              />
                            </div>
                          </>
                        )}
                        {inventory.paymentMethod === "cash" && (
                          <div className="space-y-2">
                            <Label>
                              كاش <span className="text-red-500">*</span>
                            </Label>
                            <SelectField
                              options={cash}
                              value={inventory.bankId || ""}
                              action={(val) =>
                                updateInventory(inventory.id, "bankId", val)
                              }
                              placeholder="اختر البنك"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>مبلغ الدفع</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={inventory.paymentAmount}
                            onChange={(e) =>
                              updateInventory(
                                inventory.id,
                                "paymentAmount",
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                            className="text-right"
                          />
                        </div>
                      </>
                    )}
                    {/* Notes */}
                    <div className="space-y-2 md:col-span-3">
                      <Label>
                        {inventory.updateType === "manual"
                          ? "سبب التحديث"
                          : "ملاحظات"}
                      </Label>
                      <Textarea
                        rows={2}
                        value={inventory.notes || ""}
                        onChange={(e) =>
                          updateInventory(inventory.id, "notes", e.target.value)
                        }
                        placeholder={
                          inventory.updateType === "manual"
                            ? "أدخل سبب التحديث اليدوي"
                            : "أدخل أي ملاحظات"
                        }
                        className="resize-none"
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
                        {itemCost.toFixed(2)} {currencyCode ?? currencyCodecash}
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
                : `حفظ ${inventoryUpdates.length} تحديث - المجموع: ${totalItems.toFixed(0)} وحدة`}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </Dailogreuse>
  );
}
