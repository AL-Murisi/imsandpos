import { fetchEmployees } from "@/lib/actions/employees";
import { getCompanySubscriptionUsage } from "@/lib/actions/subscription";
import { getSession } from "@/lib/session";
import EmployeeClient from "./_components/table";

type EmployeePageProps = {
  searchParams: Promise<{
    employeesquery?: string;
    page?: string;
    limit?: string;
  }>;
};

export default async function EmployeePage({
  searchParams,
}: EmployeePageProps) {
  const session = await getSession();
  if (!session?.companyId) return null;

  const params = await searchParams;
  const employeesquery = params?.employeesquery ?? "";
  const pageIndex = Math.max(Number(params?.page ?? "1") - 1, 0);
  const pageSize = Math.max(Number(params?.limit ?? "10"), 1);

  const [data, subscriptionUsage] = await Promise.all([
    fetchEmployees(session.companyId, employeesquery, pageIndex, pageSize),
    getCompanySubscriptionUsage(),
  ]);

  return (
    <div className="p-3">
      <EmployeeClient
        employees={data.employees}
        total={data.total}
        userLimit={subscriptionUsage?.users ?? null}
      />
    </div>
  );
}
