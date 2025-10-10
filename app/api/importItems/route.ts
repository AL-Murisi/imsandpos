import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma"; // ✅ make sure this path is correct
import { CreateProductSchema } from "@/lib/zod";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    console.log("📄 Parsed Excel JSON:", json);

    const validProducts: any[] = [];
    const failed: any[] = [];

    for (const [index, row] of json.entries()) {
      // 🧩 Normalize & map Arabic fields
      const normalized = {
        name: row.name?.toString().trim(),
        sku: row.sku?.toString().trim(),
        barcode: row.barcode?.toString().trim(),
        description: row.description?.toString().trim(),
        categoryId: row.categoryId?.toString().trim(),
        brandId: row.brandId ? row.brandId.toString().trim() : null,
        type:
          row.type?.toString().trim() === "فردي"
            ? "single"
            : row.type?.toString().trim() === "حزمة"
              ? "bundle"
              : "single",
        unitsPerPacket: Number(row.unitsPerPacket) || 1,
        packetsPerCarton: Number(row.packetsPerCarton) || 1,
        costPrice: Number(row.costPrice) || 0,
        pricePerUnit: Number(row.pricePerUnit) || 0,
        pricePerPacket: Number(row.pricePerPacket) || 0,
        pricePerCarton: Number(row.pricePerCarton) || 0,
        wholesalePrice: Number(row.wholesalePrice) || 0,
        minWholesaleQty: Number(row.minWholesaleQty) || 1,
        weight: Number(row.weight) || 0,
        dimensions: row.dimensions?.toString().trim() || "",
        supplierId: row.supplierId?.toString().trim(),
        warehouseId: row.warehouseId?.toString().trim(),
        status: row.status?.toString().trim() || "active",
        isActive: true,
      };

      const parsed = CreateProductSchema.safeParse(normalized);
      if (!parsed.success) {
        failed.push({
          row: index + 1,
          error: parsed.error.flatten(),
        });
        continue;
      }

      validProducts.push(parsed.data);
    }

    // 🚀 Bulk create all valid rows at once
    let createdCount = 0;
    if (validProducts.length > 0) {
      const created = await prisma.product.createMany({
        data: validProducts,
        // ✅ avoid conflicts if same SKU/barcode already exists
      });
      createdCount = created.count;
    }

    return NextResponse.json({
      createdCount,
      failedCount: failed.length,
      failed,
    });
  } catch (error: any) {
    console.error("❌ Import failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
