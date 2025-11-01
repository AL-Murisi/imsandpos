"use client";
import { fetchRolesForSelect } from "@/app/actions/roles";
import { SelectField } from "@/components/common/selectproduct";
import { Label } from "@/components/ui/label";

import React, { useEffect, useState } from "react";
type Role = {
  id: string;
  name: string;
};

export default function Changerole() {
  const [role, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectroled] = useState("");
  useEffect(() => {
    const loadRoles = async () => {
      const result = await fetchRolesForSelect();
      setRoles(result);
    };
    loadRoles();
  }, []);

  return (
    <div className="grid gap-2">
      <Label htmlFor="role">الدور</Label>
      <SelectField
        action={(value) => setSelectroled(value)}
        value={selectedRole}
        placeholder="اختر الدور"
        options={role}
      />
    </div>
  );
}
