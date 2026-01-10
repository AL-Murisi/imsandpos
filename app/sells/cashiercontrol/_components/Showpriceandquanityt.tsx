import { ProductForSale, SellingUnit } from "@/lib/zod";
import dynamic from "next/dynamic";

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
}

export default function CartDisplayRedux({
  users,
  product,
}: CustomDialogProps) {
  return (
    <div className="p-2">
      {/* الآن لن يظهر خطأ لأن الأنواع متطابقة تماماً */}
      <CartDisplay users={users} product={product} />
    </div>
  );
}
