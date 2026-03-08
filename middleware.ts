import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const KNOWN_ROLES = ["admin", "cashier", "manager_wh", "supplier"] as const;
type Role = (typeof KNOWN_ROLES)[number];

const roleSet = new Set<string>(KNOWN_ROLES);

// Prefix-based route permissions to cover nested paths too.
const routePermissions: ReadonlyArray<{ prefix: string; roles: Role[] }> = [
  { prefix: "/settings", roles: ["admin"] },
  { prefix: "/company", roles: ["admin"] },
  { prefix: "/inventory", roles: ["admin", "manager_wh"] },
  { prefix: "/products", roles: ["admin", "manager_wh"] },
  { prefix: "/categories", roles: ["admin", "manager_wh"] },
  { prefix: "/suppliers", roles: ["admin", "manager_wh"] },
  { prefix: "/warehouses", roles: ["admin", "manager_wh"] },
  { prefix: "/dashboardUser", roles: ["manager_wh"] },
  { prefix: "/salesDashboard", roles: ["admin", "cashier"] },
  { prefix: "/cashiercontrol", roles: ["admin", "cashier"] },
  { prefix: "/supplier/products", roles: ["admin", "supplier"] },
  { prefix: "/supplier/orders", roles: ["admin", "supplier"] },
  { prefix: "/dashboard", roles: ["admin"] },
];

const publicRoutes = new Set([
  "/login",
  "/signup",
  "/landing",
  "/manifest.json",
  "/createcompanybyemail",
]);

const authRoutes = new Set(["/login", "/signup"]);

export default async function middleware(req: NextRequest) {
  const path = normalizePath(req.nextUrl.pathname);
  const isPublicRoute = publicRoutes.has(path);

  const authToken = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.ENCRYPTION_SECRET,
  });

  const tokenRoles = sanitizeRoles(authToken?.roles);
  const userRoles = tokenRoles;
  const isAuthenticated = userRoles.length > 0;

  // Redirect authenticated users away from auth pages.
  if (isAuthenticated && authRoutes.has(path)) {
    return safeRedirect(req, getDefaultRedirectForRole(userRoles));
  }

  // Role-based root routing.
  if (path === "/" && isAuthenticated) {
    return safeRedirect(req, getDefaultRedirectForRole(userRoles));
  }

  // Unauthenticated users can only access public routes.
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Enforce permissions using the most-specific matching prefix.
  if (isAuthenticated) {
    const requiredRoles = getRequiredRoles(path);
    if (
      requiredRoles &&
      !requiredRoles.some((role) => userRoles.includes(role))
    ) {
      return safeRedirect(req, getDefaultRedirectForRole(userRoles));
    }
  }

  return NextResponse.next();
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function getRequiredRoles(path: string): Role[] | null {
  const match = routePermissions
    .filter(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match?.roles ?? null;
}

function sanitizeRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return [];

  return value.filter((role): role is Role => {
    return typeof role === "string" && roleSet.has(role);
  });
}

function getDefaultRedirectForRole(roles: Role[]): string {
  if (roles.includes("admin")) return "/salesDashboard";
  if (roles.includes("cashier")) return "/salesDashboard";
  if (roles.includes("manager_wh")) return "/dashboardUser";
  if (roles.includes("supplier")) return "/supplier/orders";
  return "/login";
}

function safeRedirect(req: NextRequest, destination: string): NextResponse {
  const fallback = "/login";
  const target = destination.startsWith("/") ? destination : fallback;

  if (normalizePath(req.nextUrl.pathname) === normalizePath(target)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(target, req.nextUrl));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|swcustom.js|splash_screens|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
