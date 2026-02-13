// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import createMiddleware from "next-intl/middleware";

// Define role-based route access
const routePermissions: Record<string, string[]> = {
  // Admin only routes
  "/dashboard": ["admin"],
  "/settings": ["admin"],
  "/inventory": ["admin", "manager_wh"],
  "/users": ["admin"],
  // Admin and workers routes
  "/inventory/products": ["admin", "manager_wh"],
  "/inventory/categories": ["admin", "manager_wh"],
  "/suppliers": ["admin", "manager_wh"],
  "/inventory/warehouses": ["admin", "manager_wh"],
  "/inventory/dashboardUser": ["manager_wh"],
  // Admin, workers, and customers routes
  //   "/dashboard": ["admin", "worker", "worker"],
  //   "/orders": ["admin", "worker", "worker"],

  // Cashier specific routes
  "/sells/salesDashboard": ["admin", "cashier"],

  "/sells/cashiercontrol": ["admin", "cashier"],

  // Supplier specific routes
  "/supplier/products": ["admin", "supplier"],
  "/supplier/orders": ["admin", "supplier"],

  // Customer specific routes
  // "/customer": ["admin", "customer"],
  // "/customer": ["admin", "customer"],
};

// Public routes that don't require authentication
const publicRoutes = [
  "/login",
  "/signup",
  "/landing",
  "/manifest.json",
  "/createcompanybyemail",
];

// Routes that authenticated workers should be redirected from
const authRoutes = ["/login", "/signup"];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);
  const isAuthRoute = authRoutes.includes(path);

  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  const session = await decrypt(cookie);
  const userrole = (session?.roles as string[]) || [];

  // ➡️ NEW: Handle root (/) path redirection for authenticated users
  if (path === "/" && session?.roles) {
    const redirectPath = getDefaultRedirectForRole(userrole);
    if (redirectPath !== path) {
      // Avoid unnecessary self-redirects
      return NextResponse.redirect(new URL(redirectPath, req.nextUrl));
    }
  }

  // (Keep your existing middleware logic for login and role-based permissions)

  // If no session and trying to access protected route
  if (!session?.roles && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // If authenticated worker trying to access auth routes, redirect to their default path

  // Check role-based permissions for protected routes
  const requiredRoles = routePermissions[path];
  if (requiredRoles) {
    const hasPermission = requiredRoles.some((role) => userrole.includes(role));
    if (!hasPermission) {
      const redirectPath = getDefaultRedirectForRole(userrole);
      return NextResponse.redirect(new URL(redirectPath, req.nextUrl));
    }
  }

  return NextResponse.next();
}

function getDefaultRedirectForRole(roles: string[]): string {
  if (roles.includes("admin")) return "/users/company"; // Note: Changed from /inventory to /dashboard to match your current code
  if (roles.includes("cashier")) return "/sells/salesDashboard"; // Note: Changed from /sells/cashiercontrol to /sells to match your current code
  if (roles.includes("manager_wh")) return "/inventory/dashboardUser";
  return "/login"; // Default redirect if no role matches
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)", // Match all routes except for API, static files, and images
  ],
};
