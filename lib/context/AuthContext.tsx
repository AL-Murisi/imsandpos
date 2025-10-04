"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // <-- added
import { deleteSession, SessionData } from "@/lib/session";
import { logActivity } from "@/app/actions/activitylogs";
import { verifySession } from "../dal";

interface AuthContextType {
  user: SessionData | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAndRedirect: () => Promise<void>; // <-- new
  loading: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // <-- router instance

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
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
        await checkAuth(); // Refresh user data
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
      deleteSession();
      setUser(null);
      verifySession();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // NEW: logout with activity logging + immediate redirect
  const logoutAndRedirect = async () => {
    try {
      // Log the activity but don’t block the redirect if it fails
      if (user) {
        await fetch("/api/log-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.userId,
            action: "logout",
            details: "User logged out",
            ip: "",
            userAgent: navigator.userAgent,
          }),
        }).catch(console.error);
      }

      // Clear session & user state
      await logout();

      // Redirect immediately
      router.replace("/login");
    } catch (err) {
      console.error("Logout and redirect failed:", err);
      await logout();
      router.replace("/login");
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
        logoutAndRedirect, // <-- new
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
