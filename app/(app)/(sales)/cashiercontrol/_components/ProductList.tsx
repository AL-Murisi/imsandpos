"use client";

import { Selection } from "@/components/common/sellingcat";
import { ProductForSale, SellingUnit } from "@/lib/zod";
import SearchInput from "@/components/common/searchlist";
import dynamic from "next/dynamic";
import DraggableDailogreuse from "@/components/common/draggableDailogreuse";
import { addItem } from "@/lib/slices/cartSlice";
import { updateProductStockOptimistic } from "@/lib/slices/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import List from "./productListing";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { setProductsLocal } from "@/lib/slices/productsSlice";
import { Button } from "@/components/ui/button";
import { IconReload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { CameraIcon, Loader2 } from "lucide-react";

type forsale = ProductForSale & {
  warehousename: string;

  sellingUnits: SellingUnit[];
  barcode: string;
  availableStock: Record<string, number>;
};

type prop = {
  product: forsale[];
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  };
  searchParams: any;
  queryr: string;
};
interface UserOption {
  id?: string;
  name?: string;
}

export default function ProductsList({
  product,
  formData,
  searchParams,
  queryr,
}: prop) {
  const [opens, setOpens] = useState(false);
  const [openScanner, setOpenScanner] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products.products);
  const cartItems =
    useAppSelector(
      (s) => s.cart.carts.find((c) => c.id === s.cart.activeCartId)?.items,
    ) ?? [];

  const LiveBarcodeScanner = dynamic(() => import("./barcodetesting"), {
    ssr: false,
  });

  const barcodeVariants = (value: string) => {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, "");
    const variants = new Set<string>([trimmed, digits]);

    if (digits.length === 13 && digits.startsWith("0")) {
      variants.add(digits.slice(1));
    }
    if (digits.length === 12) {
      variants.add(`0${digits}`);
    }

    return variants;
  };

  const getAvailableStock = (p: forsale, unitId: string) => {
    const baseStock = p.availableStock?.[unitId] ?? 0;
    const inCartQty = cartItems
      .filter((i) => i.id === p.id && i.selectedUnitId === unitId)
      .reduce((sum, i) => sum + i.selectedQty, 0);
    return baseStock - inCartQty;
  };

  const handleAdd = (p: forsale, selectedUnit?: SellingUnit) => {
    const targetUnit =
      selectedUnit || p.sellingUnits.find((u) => u.isBase) || p.sellingUnits[0];
    if (!targetUnit) return;

    const availableQty = getAvailableStock(p, targetUnit.id);
    if (availableQty <= 0) return;

    dispatch(
      addItem({
        id: p.id,
        sku: p.sku,
        name: p.name,
        warehousename: p.warehousename,
        warehouseId: p.warehouseId,
        originalStockQuantity: p.availableStock?.[targetUnit.id] || 0,
        sellingUnits: p.sellingUnits,
        selectedUnitId: targetUnit.id,
        selectedUnitName: targetUnit.name,
        selectedUnitPrice: targetUnit.price,
        selectedQty: 1,
        availableStock: p.availableStock,
        action: "",
      }),
    );

    dispatch(
      updateProductStockOptimistic({
        productId: p.id,
        warehouseId: p.warehouseId,
        sellingUnit: targetUnit.id,
        quantity: 1,
        mode: "consume",
      }),
    );
  };
  const [last, setLast] = useState<{ text: string; format: string } | null>(
    null,
  );
  const t = useTranslations("cashier");
  const [selectedproduct, setSelectedproduct] = useState<UserOption | null>(
    null,
  );
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition(); // ✅ Add this

  const productSearchOptions = useMemo(() => {
    return product.map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }, [product]); // Only re-calculates if the 'product' prop changes
  useEffect(() => {
    dispatch(setProductsLocal([...product]));
  }, [product, dispatch]); // Only runs when products change
  return (
    <div className="rounded-2xl p-2 lg:col-span-1">
      <div className="mb-4 grid grid-cols-3 gap-3 bg-transparent px-3 lg:flex-row">
        {/* <SearchInput placeholder={t("search")} paramKey="product" /> */}
        <Selection
          options={formData.categories}
          placeholder={t("filter")}
          selectkey="categoryId"
        />{" "}
        <SearchInput
          placeholder={t("search")}
          paramKey="product"
          options={productSearchOptions} // 2. Pass the memoized variable here} // 👈 map your products into { id, name }
          action={(selected) => {
            // 1. Set the ID to trigger the List effect
            setSelectedproduct(selected);

            // 2. IMMEDIATELY clear it (on the next tick) so typing doesn't re-trigger it
            setTimeout(() => {
              setSelectedproduct(null);
            }, 50);
          }}
        />
        <div>
          <DraggableDailogreuse
            open={opens}
            setOpen={setOpens}
            btnLabl={<CameraIcon />}
            style="w-lg"
          >
            <div className="w-80 md:w-2xl">
              <Button type="button" onClick={() => setOpenScanner(true)}>
                Open Scanner
              </Button>
              <LiveBarcodeScanner
                onDetected={(code: string) => {
                  setLastScanned(code);

                  const scannedVariants = barcodeVariants(code);
                  const scannedProduct = products.find((p) => {
                    const skuVariants = barcodeVariants(String(p.sku || ""));
                    const barcodeValue = String(p.barcode || "");
                    const productVariants = new Set<string>([
                      ...skuVariants,
                      ...barcodeVariants(barcodeValue),
                    ]);

                    for (const v of scannedVariants)
                      if (productVariants.has(v)) return true;
                    return false;
                  });

                  if (scannedProduct) {
                    handleAdd(scannedProduct as forsale);
                    console.log(`Successfully added: ${scannedProduct.name}`);
                  } else {
                    console.warn("Product not found for code:", code);
                  }
                }}
                opened={openScanner}
                action={() => setOpenScanner(false)}
              />
            </div>
          </DraggableDailogreuse>{" "}
          <Button
            variant="outline"
            onClick={() => {
              startRefresh(() => {
                router.refresh();
              });
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconReload />
            )}
          </Button>
        </div>
      </div>
      <List
        product={product}
        selecteditemId={selectedproduct?.id ?? ""}
        // queryr={queryr || (selectedproduct ? selectedproduct.name || "" : "")}
      />
    </div>
  );
}
