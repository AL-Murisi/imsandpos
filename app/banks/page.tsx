import { fetchBanks, getbanks } from "@/lib/actions/banks";
import BanksTable from "./_components/table";

const page = async () => {
  const banks = await getbanks();
  const banksinfor = await fetchBanks();
  return <BanksTable data={banksinfor.data} banks={banks} total={0} />;
};

export default page;
