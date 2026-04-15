import React from "react";
import { ConfirmModal } from "./common/confirm-modal";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import { Loader2, LogOut } from "lucide-react";

export default function Logout() {
  const { logoutAndRedirect, loggingOut } = useAuth();

  return (
    <ConfirmModal
      title="تسجيل خروج"
      description="هل أنت متأكد من تسجيل الخروج؟"
      action={() => logoutAndRedirect()} // Check if your prop is named 'action' or 'onConfirm'
      confirmText="نعم"
    >
      {/* Wrap in a div to ensure a single child */}
      <div>
        <Button
          disabled={loggingOut}
          className="text-red-600 hover:bg-orange-300/20 hover:text-red-700"
        >
          {loggingOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
        </Button>
      </div>
    </ConfirmModal>
  );
}
