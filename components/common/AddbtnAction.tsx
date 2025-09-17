"use client";
import React from "react";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
type btn = {
  btnLabel: string;

  route: string;
};
export default function AddbtnAction({ btnLabel, route }: btn) {
  const router = useRouter();
  return (
    <div>
      <Button onClick={() => router.push(route)}>
        <Plus />
        {btnLabel}
      </Button>
    </div>
  );
}
