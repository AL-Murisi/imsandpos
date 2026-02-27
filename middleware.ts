// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Define role-based route access
const routePermissions: Record<string, string[]> = {
  // Admin only routes
  "/dashboard": ["admin"],
  "/settings": ["admin"],
  "/inventory": ["admin", "manager_wh"],
  "/company": ["admin"],
  // Admin and workers routes
  "/products": ["admin", "manager_wh"],
  "/categories": ["admin", "manager_wh"],
  "/suppliers": ["admin", "manager_wh"],
  "/warehouses": ["admin", "manager_wh"],
  "/dashboardUser": ["manager_wh"],
  // Admin, workers, and customers routes
  //   "/dashboard": ["admin", "worker", "worker"],
  //   "/orders": ["admin", "worker", "worker"],

  // Cashier specific routes
  "/salesDashboard": ["admin", "cashier"],

  "/cashiercontrol": ["admin", "cashier"],

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

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = req.cookies.get("session")?.value;
  const session = await decryptSession(cookie);
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

async function decryptSession(session: string | undefined = "") {
  if (!session || !session.includes(".")) {
    return null;
  }

  const secretKey = process.env.ENCRYPTION_SECRET;
  if (!secretKey) return null;

  try {
    const encodedKey = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as { roles?: string[] };
  } catch {
    return null;
  }
}

function getDefaultRedirectForRole(roles: string[]): string {
  if (roles.includes("admin")) return "/company";
  if (roles.includes("cashier")) return "/salesDashboard";
  if (roles.includes("manager_wh")) return "/dashboardUser";
  return "/login"; // Default redirect if no role matches
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|apple-icon.png|icon1.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
