import { listCurrencyOptions } from "@/lib/actions/currencies";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ options: [] }, { status: 401 });
  }

  const options = await listCurrencyOptions();
  return Response.json({ options });
}
