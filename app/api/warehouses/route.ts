import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { CreateWarehouseSchema } from "@/lib/zod"; // Assuming this is your Zod schema for Warehouse

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

    // 1. Simple JSON conversion (assumes English headers in row 1)
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    console.log("📦 Parsed Excel JSON for Warehouses:", json);

    const validWarehouses: any[] = [];
    const failed: any[] = [];

    for (const [index, row] of json.entries()) {
      // 2. Normalize and map fields to match the CreateWarehouseSchema
      const normalized = {
        name: row.name?.toString().trim(),
        location: row.location?.toString().trim(),
        address: row.address?.toString().trim() || "",
        city: row.city?.toString().trim() || "",
        state: row.state?.toString().trim() || "",
        country: row.country?.toString().trim() || "",
        postalCode: row.postalCode?.toString().trim() || "",
        phoneNumber: row.phoneNumber?.toString().trim() || "",
        email: row.email?.toString().trim() || "",
      };

      const parsed = CreateWarehouseSchema.safeParse(normalized);
      if (!parsed.success) {
        failed.push({
          row: index + 1,
          error: parsed.error.flatten(),
        });
        continue;
      }

      validWarehouses.push(parsed.data);
    }

    // 3. Bulk insert all valid warehouses
    let createdCount = 0;
    if (validWarehouses.length > 0) {
      const created = await prisma.warehouse.createMany({
        data: validWarehouses,
        skipDuplicates: true, // Prevents errors if unique constraints (like name) are violated
      });
      createdCount = created.count;
    }

    return NextResponse.json({
      createdCount,
      failedCount: failed.length,
      failed,
    });
  } catch (error: any) {
    console.error("❌ Warehouse import failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
