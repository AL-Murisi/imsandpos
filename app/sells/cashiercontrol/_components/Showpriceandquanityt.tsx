import { ProductForSale, SellingUnit } from "@/lib/zod";
import dynamic from "next/dynamic";
const BarcodeScannerZXing = dynamic(() => import("./BarcodeScannerZXing")); // 1. قم بتعريف النوع مرة واحدة فقط هنا أو استورده من ملف خارجي

const CartDisplay = dynamic(() => import("./cartsClient")); // 1. قم بتعريف النوع مرة واحدة فقط هنا أو استورده من ملف خارجي
type FullProductForSale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
  sellingUnits: SellingUnit[];
  availableStock: Record<string, number>;
};

interface CustomDialogProps {
  users:
    | {
        id?: string;
        name?: string;
        phoneNumber?: string | null;
        outstandingBalance?: number; // تأكد من مطابقة الاسم مع المكون الداخلي
        creditLimit?: number;
      }[]
    | null;
  product: FullProductForSale[]; // استخدم النوع الموحد هنا
  nextnumber: string;
}

export default function CartDisplayRedux({
  users,
  product,
  nextnumber,
}: CustomDialogProps) {
  return (
    <div className="p-2">
      <BarcodeScannerZXing
        action={(result) => {
          alert(`Scanned: ${result.text} (${result.format})`); // يمكنك استبدال هذا بأي وظيفة أخرى تريدها عند مسح الباركود
        }}
      />{" "}
      <CartDisplay users={users} product={product} nextnumber={nextnumber} />
    </div>
  );
}
