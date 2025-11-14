import { ProductForSale } from "@/lib/zod";
import dynamic from "next/dynamic";

const CartDisplay = dynamic(() => import("./_components/cartsClient"));
type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
};
interface CustomDialogProps {
  users:
    | {
        id?: string;
        name?: string;
        phoneNumber?: string | null;
        totalDebt?: number;
      }[]
    | null;
  product: forsale[];
}
export default function CartDisplayRedux({
  users,
  product,
}: CustomDialogProps) {
  return (
    <div className="p-2">
      <CartDisplay users={users} product={product} />
    </div>
  );
}
