import { getCompanyCurrencies } from "@/lib/actions/currencies";
import CurrenciesClient from "./CurrenciesClient";

export default async function CurrenciesPage() {
  const data = await getCompanyCurrencies();
  return (
    <div className="p-4">
      <CurrenciesClient data={data} />
    </div>
  );
}
