"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { deleteSession, SessionData } from "@/lib/session";
import { verifySession } from "../dal";
import { toast } from "sonner";
interface AuthContextType {
  user: SessionData | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAndRedirect: () => Promise<void>;
  loading: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        await checkAuth();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call API to clear session server-side
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      toast("loggedout successfully");
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      // Still set user to null even if API call fails
      setUser(null);
    }
  };

  const logoutAndRedirect = async () => {
    try {
      // Log activity if user exists
      if (user) {
        fetch("/api/log-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.userId,
            action: "logout",
            details: "User logged out",
            ip: "",
            userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
          }),
        }).catch(console.error); // Don't await - fire and forget
      }

      // Clear session
      await logout();
      await deleteSession();
      // Force redirect to login with full page reload
      window.location.href = `/login`;
    } catch (err) {
      console.error("Logout and redirect failed:", err);
      // Fallback: force redirect anyway
      window.location.href = "/login";
    }
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some((role) => user?.roles?.includes(role)) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        logoutAndRedirect,
        loading,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
