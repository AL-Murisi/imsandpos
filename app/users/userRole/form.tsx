"use client";

import { useState } from "react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "@/components/ui/button";
import TasksInput from "./addTask";
import { createRole } from "@/app/actions/roles";
import { z } from "zod";
import { CreateRoleSchema } from "@/lib/zodType";

export default function RoleForm({ close }: any) {
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);

  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
    permissions?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const permissions = tasks.reduce((acc, task) => {
      acc[task] = true;
      return acc;
    }, {} as Record<string, boolean>);

    const result = CreateRoleSchema.safeParse({
      name: role,
      description: description,
      permissions,
    });

    if (!result.success) {
      const formatted = result.error.format();
      setErrors({
        name: formatted.name?._errors[0],
        description: formatted.description?._errors[0],
        permissions: formatted.permissions?._errors[0],
      });
      return;
    }

    setErrors({});
    await createRole(result.data);

    // Reset form
    setRole("");
    setDescription("");
    setTasks([]);
  };

  return (
    <form dir="rtl" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 grid-cols-2">
        {/* Role Name */}
        <div className="grid gap-2">
          <Label htmlFor="role">الدور</Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="مثال: مدير"
          />
          {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="grid gap-2">
          <Label htmlFor="description">الوصف</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="الوصف الاختياري"
          />
          {errors.description && (
            <p className="text-red-500 text-xs">{errors.description}</p>
          )}
        </div>

        {/* Tasks */}
        <div className="col-span-2 grid gap-2">
          <Label htmlFor="tasks">المهام (الصلاحيات)</Label>
          <TasksInput tasks={tasks} setTasks={setTasks} />
          {errors.permissions && (
            <p className="text-red-500 text-xs">{errors.permissions}</p>
          )}
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setRole("");
            setDescription("");
            setTasks([]);
            setErrors({});
            close();
          }}
        >
          إلغاء
        </Button>
        <Button type="submit" className="bg-popover-foreground text-background">
          تأكيد
        </Button>
      </div>
    </form>
  );
}
