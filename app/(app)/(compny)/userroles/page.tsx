import Role from "../_component/roleTable";
import { ROLE_DEFINITIONS } from "@/lib/constants/roles";

export default async function Roles() {
  return <Role Role={ROLE_DEFINITIONS} />;
}
