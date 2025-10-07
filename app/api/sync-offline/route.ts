import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const ops = await req.json();

  try {
    for (const op of ops) {
      const { tableName, operation, recordId, data } = op;

      switch (tableName) {
        case "Sale":
          if (operation === "CREATE") await prisma.sale.create({ data });
          if (operation === "UPDATE")
            await prisma.sale.update({ where: { id: recordId }, data });
          if (operation === "DELETE")
            await prisma.sale.delete({ where: { id: recordId } });
          break;

        case "SaleItem":
          if (operation === "CREATE") await prisma.saleItem.create({ data });
          if (operation === "UPDATE")
            await prisma.saleItem.update({ where: { id: recordId }, data });
          if (operation === "DELETE")
            await prisma.saleItem.delete({ where: { id: recordId } });
          break;

        case "Payment":
          if (operation === "CREATE") await prisma.payment.create({ data });
          if (operation === "UPDATE")
            await prisma.payment.update({ where: { id: recordId }, data });
          if (operation === "DELETE")
            await prisma.payment.delete({ where: { id: recordId } });
          break;

        case "Customer":
          if (operation === "CREATE") await prisma.customer.create({ data });
          if (operation === "UPDATE")
            await prisma.customer.update({ where: { id: recordId }, data });
          if (operation === "DELETE")
            await prisma.customer.delete({ where: { id: recordId } });
          break;

        case "Inventory":
          if (operation === "CREATE") await prisma.inventory.create({ data });
          if (operation === "UPDATE")
            await prisma.inventory.update({ where: { id: recordId }, data });
          if (operation === "DELETE")
            await prisma.inventory.delete({ where: { id: recordId } });
          break;

        // Add all other tables as needed

        default:
          console.warn("Unhandled table in offline sync:", tableName);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
