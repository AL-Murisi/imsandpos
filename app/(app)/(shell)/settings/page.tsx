import { getExchangeRate } from "@/lib/actions/banks";
import Exchange from "./table";

export default async function ExpensesPage() {
  const exchangeRate = await getExchangeRate();
  return (
    <div className="p-4">
      <Exchange exchangeRate={exchangeRate} />
    </div>
  );
}
