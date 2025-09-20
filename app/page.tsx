import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await verifySession();
  const userRoles = session.userRole as string[]; // rename for clarity

  if (userRoles.includes("admin")) {
    redirect("/dashboard");
  } else if (userRoles.includes("cashier")) {
    redirect("/sells");
    // } else if (userRoles.includes("customer")) {
    //   redirect("/customer");
  } else if (userRoles.includes("manager_wh")) {
    redirect("/inventory/dashboard");
  } else {
    redirect("/login");
  }
}
