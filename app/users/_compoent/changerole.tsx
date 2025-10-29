"use client";
import { fetchRolesForSelect } from "@/app/actions/roles";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Select
        value={selectedRole}
        onValueChange={(value) => setSelectroled(value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="اختر الدور" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {role.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
