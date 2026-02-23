"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SessionData } from "@/lib/session";

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
      // Load Supabase only when needed (keeps it out of the base app layout chunk).
      const { supabase } = await import("@/lib/supabaseClient");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.session?.access_token) {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accessToken: data.session.access_token }),
        });

        if (response.ok) {
          await checkAuth();
          return true;
        }

        await supabase.auth.signOut();
        return false;
      }

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) return false;

      await checkAuth();
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call API to clear session server-side
      const { supabase } = await import("@/lib/supabaseClient");
      await supabase.auth.signOut();
      await fetch("/api/logout", { method: "POST" });
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
            companyId: user.companyId,
            userId: user.userId,
            action: "تسجيل خروج",
            details: "الخروج من النظام",
            ip: "55",
            userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
          }),
        }).catch(console.error); // Don't await - fire and forget
      }

      // Clear session
      await logout();
      // Force redirect to login with full page reload
      window.location.href = `/`;
    } catch (err) {
      console.error("Logout and redirect failed:", err);
      // Fallback: force redirect anyway
      window.location.href = "/landing";
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
