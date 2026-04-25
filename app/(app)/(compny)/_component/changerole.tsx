"use client";
import { SelectField } from "@/components/common/selectproduct";
import { Label } from "@/components/ui/label";
import { ROLE_DEFINITIONS } from "@/lib/constants/roles";

import React, { useEffect, useState } from "react";
type Role = {
  id: string;
  name: string;
};
const roleOptions: Role[] = ROLE_DEFINITIONS.map((role) => ({
  id: role.name,
  name: role.name,
}));
export default function Changerole() {
  const [role, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectroled] = useState("");

  return (
    <SelectField
      action={(value) => setSelectroled(value)}
      value={selectedRole}
      placeholder=" الدور"
      options={roleOptions}
    />
  );
}
