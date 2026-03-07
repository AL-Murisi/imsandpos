"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SessionData } from "@/lib/session";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";

import { toast } from "sonner";
const OFFLINE_USER_CACHE_KEY = "ims:offline:user";
interface AuthContextType {
  user: SessionData | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; redirectPath?: string }>;
  logout: () => Promise<void>;
  logoutAndRedirect: () => Promise<void>;
  loading: boolean;
  loggingOut: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDefaultRedirectForRole(roles: string[] = []): string {
  if (roles.includes("admin")) return "/salesDashboard";
  if (roles.includes("cashier")) return "/salesDashboard";
  if (roles.includes("manager_wh")) return "/dashboardUser";
  if (roles.includes("supplier")) return "/supplier/orders";
  return "/login";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            OFFLINE_USER_CACHE_KEY,
            JSON.stringify(userData),
          );
        }
      } else {
        if (typeof window !== "undefined" && !navigator.onLine) {
          const cached = localStorage.getItem(OFFLINE_USER_CACHE_KEY);
          if (cached) {
            setUser(JSON.parse(cached));
            return;
          }
        }
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(OFFLINE_USER_CACHE_KEY);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      if (typeof window !== "undefined" && !navigator.onLine) {
        const cached = localStorage.getItem(OFFLINE_USER_CACHE_KEY);
        if (cached) {
          setUser(JSON.parse(cached));
          return;
        }
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; redirectPath?: string }> => {
    try {
      const result = await nextAuthSignIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.error) {
        const me = await fetch("/api/auth/me", { cache: "no-store" });
        if (me.ok) {
          const userData = (await me.json()) as SessionData;
          setUser(userData);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              OFFLINE_USER_CACHE_KEY,
              JSON.stringify(userData),
            );
          }
          return {
            success: true,
            redirectPath: getDefaultRedirectForRole(userData.roles ?? []),
          };
        }
      }
      return { success: false };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await nextAuthSignOut({ redirect: false, callbackUrl: "/login" });
      toast("loggedout successfully");
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(OFFLINE_USER_CACHE_KEY);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Still set user to null even if API call fails
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(OFFLINE_USER_CACHE_KEY);
      }
    }
  };

  const logoutAndRedirect = async () => {
    setLoggingOut(true);
    try {
      // Log activity if user exists
      if (user) {
        await fetch("/api/log-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: user.companyId,
            userId: user.userId,
            action: "تسجيل خروج",
            details: "الخروج من النظام",
            ip: "55",
            userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
          }),
        }).catch(console.error); // Don't await - fire and forget
      }

      // Clear local auth cache right before navigation.
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(OFFLINE_USER_CACHE_KEY);
      }

      // Sign out through NextAuth (handles CSRF) then redirect.
      await nextAuthSignOut({ redirect: false, callbackUrl: "/login" });
      window.location.replace("/login");
    } catch (err) {
      console.error("Logout and redirect failed:", err);
      setLoggingOut(false);
      // Fallback: force redirect anyway
      window.location.replace("/login");
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
        loggingOut,
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
