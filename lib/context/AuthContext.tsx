"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SessionData } from "@/lib/session";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
  useSession,
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
  initialized: boolean;
  loading: boolean;
  loggingOut: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDefaultRedirectForRole(roleOrRoles?: string | string[]): string {
  // Normalize role input: accept a string or an array and compare case-insensitively.
  let role = "";
  if (Array.isArray(roleOrRoles)) {
    role = roleOrRoles.join(",").toLowerCase();
  } else if (typeof roleOrRoles === "string") {
    role = roleOrRoles.toLowerCase();
  }

  if (role.includes("admin")) return "/company";
  if (role.includes("cashier")) return "/salesDashboard";
  if (role.includes("manager_wh")) return "/dashboardUser";
  if (role.includes("supplier")) return "/supplier/orders";
  if (role.includes("accountant")) return "/voucher";
  if (role.includes("customer")) return "/customer-portal";
  return "/landing";
}

function resolveSafePostAuthRedirect(path?: string): string {
  // If no valid path provided, fall back to the app root `/`.
  if (!path || path === "/login" || path === "/signup") {
    return "/";
  }
  return path;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [user, setUser] = useState<SessionData | null>(() => {
    // ✅ hydrate immediately from localStorage (prevents white screen)
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(OFFLINE_USER_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });

  const [initialized, setInitialized] = useState(false); // ✅ NEW

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!isMounted) return;

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);

          localStorage.setItem(
            OFFLINE_USER_CACHE_KEY,
            JSON.stringify(userData),
          );
        } else {
          // ✅ fallback to cache if offline
          if (!navigator.onLine) {
            const cached = localStorage.getItem(OFFLINE_USER_CACHE_KEY);
            if (cached) {
              setUser(JSON.parse(cached));
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
            localStorage.removeItem(OFFLINE_USER_CACHE_KEY);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);

        // ✅ offline fallback
        if (!navigator.onLine) {
          const cached = localStorage.getItem(OFFLINE_USER_CACHE_KEY);
          if (cached) {
            setUser(JSON.parse(cached));
          }
        } else {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true); // ✅ IMPORTANT
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

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
            redirectPath: getDefaultRedirectForRole(userData.role ?? []),
          };
        }

        const fallbackRedirect =
          typeof result.url === "string" && result.url
            ? new URL(result.url, window.location.origin).pathname
            : "/salesDashboard";

        return {
          success: true,
          redirectPath: fallbackRedirect,
        };
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
    const userRole = user?.role ?? "";
    return userRole.toLowerCase().includes(role.toLowerCase());
  };

  const hasAnyRole = (allowedRoles: string[]): boolean => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    const userRole = (user?.role ?? "").toLowerCase();
    return allowedRoles.some((r) => userRole.includes(r.toLowerCase()));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        logoutAndRedirect,
        loading,
        initialized,
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
  if (context !== undefined) return context;

  // Fallback implementation when AuthProvider is not mounted.
  // Uses next-auth's useSession to provide a compatible API surface.
  const { data: session, status } = useSession();

  const mappedUser: SessionData | null = session?.user
    ? {
        userId: (session.user as any).userId ?? (session.user as any).id ?? "",
        role: (session.user as any).role ?? "",
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        companyId: (session.user as any).companyId ?? "",
      }
    : null;

  const loading = status === "loading";
  const initialized = status !== "loading";
  const loggingOut = false;

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
        const fallbackRedirect =
          typeof result.url === "string" && result.url
            ? new URL(result.url, window.location.origin).pathname
            : "/landing";

        return {
          success: true,
          redirectPath: resolveSafePostAuthRedirect(fallbackRedirect),
        };
      }
      return { success: false };
    } catch (error) {
      console.error("Login fallback failed:", error);
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await nextAuthSignOut({ redirect: false, callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout fallback failed:", error);
    }
  };

  const logoutAndRedirect = async () => {
    try {
      await nextAuthSignOut({ redirect: false, callbackUrl: "/login" });
      if (typeof window !== "undefined") window.location.replace("/login");
    } catch (err) {
      console.error("Logout and redirect failed:", err);
      if (typeof window !== "undefined") window.location.replace("/login");
    }
  };

  const hasRole = (role: string): boolean => {
    const userRole = mappedUser?.role ?? "";
    return userRole.toLowerCase().includes(role.toLowerCase());
  };

  const hasAnyRole = (allowedRoles: string[]): boolean => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    const userRole = (mappedUser?.role ?? "").toLowerCase();
    return allowedRoles.some((r) => userRole.includes(r.toLowerCase()));
  };

  return {
    user: mappedUser,
    login,
    logout,
    logoutAndRedirect,
    initialized,
    loading,
    loggingOut,
    hasRole,
    hasAnyRole,
  };
}
