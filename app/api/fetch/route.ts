// app/api/fetch/route.ts
import { NextResponse } from "next/server";
import { checkLowStockAndNotify } from "@/app/actions/debtSells";
import { gzipSync } from "zlib";

export async function GET() {
  const lowStock = await checkLowStockAndNotify("admin"); // you can swap role dynamically

  const notifications = lowStock.map((item) => ({
    id: `low-${item.product_id}`,
    type: "Low Stock",
    message: `${item.product_name} is low (Stock: ${item.stock_quantity}, Reorder: ${item.reorder_level})`,
    priority: "high",
    // data: item,
    // read: false,
    timestamp: new Date().toISOString(),
  }));
  const compressed = gzipSync(JSON.stringify(notifications));
  const uint8 = new Uint8Array(compressed);
  return new NextResponse(uint8, {
    headers: {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json",
      Vary: "Accept-Encoding",
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  // Optionally save to DB or just ack
  return NextResponse.json({ ok: true });
}
