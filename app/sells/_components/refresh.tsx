"use client";
import { useEffect } from "react";
import { socket } from "@/lib/socket-client";
import { useRouter } from "next/navigation";

export default function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    socket.on("refresh", () => {
      router.refresh(); // 🔥 يحدث الصفحة تلقائيًا
    });

    return () => {
      socket.off("refresh");
    };
  }, []);

  return null;
}
