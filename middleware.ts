import { NextRequest, NextResponse } from "next/server";
import { getToken, GetTokenParams } from "next-auth/jwt";

const KNOWN_ROLES = [
  "admin",
  "cashier",
  "manager_wh",
  "supplier",
  "accountant",
  "customer",
  "employee",
] as const;

type Role = (typeof KNOWN_ROLES)[number];

const roleSet = new Set<string>(KNOWN_ROLES);

const routePermissions: ReadonlyArray<{ prefix: string; roles: Role[] }> = [
  { prefix: "/settings", roles: ["admin"] },

  { prefix: "/settings/currencies", roles: ["admin"] },
  { prefix: "/settings/subscription", roles: ["admin"] },

  { prefix: "/company", roles: ["admin"] },
  { prefix: "/user", roles: ["admin"] },
  { prefix: "/employee", roles: ["admin"] },
  { prefix: "/branches", roles: ["admin"] },
  { prefix: "/userActiviteslogs", roles: ["admin"] },
  { prefix: "/userroles", roles: ["admin"] },
  { prefix: "/dashboard", roles: ["admin"] },
  { prefix: "/fiscalYears", roles: ["admin", "accountant"] },
  { prefix: "/balanceSheet", roles: ["admin"] },

  { prefix: "/inventory", roles: ["admin", "manager_wh"] },
  { prefix: "/manageStocks", roles: ["admin", "manager_wh"] },
  { prefix: "/products", roles: ["admin", "manager_wh"] },
  { prefix: "/categories", roles: ["admin", "manager_wh"] },
  { prefix: "/brand", roles: ["admin", "manager_wh"] },
  { prefix: "/suppliers", roles: ["admin", "manager_wh"] },
  { prefix: "/warehouses", roles: ["admin", "manager_wh"] },
  { prefix: "/dashboardUser", roles: ["admin", "manager_wh"] },

  { prefix: "/journal", roles: ["admin", "accountant"] },
  { prefix: "/menualjournal", roles: ["admin", "accountant"] },
  { prefix: "/voucher", roles: ["admin", "accountant"] },
  { prefix: "/banks", roles: ["admin", "accountant"] },
  { prefix: "/chartOfAccount", roles: ["admin", "accountant"] },
  { prefix: "/expenses", roles: ["admin", "accountant"] },

  { prefix: "/salesDashboard", roles: ["admin", "cashier"] },
  { prefix: "/customer", roles: ["admin", "cashier", "accountant"] },
  { prefix: "/customer-portal", roles: ["customer"] },
  {
    prefix: "/reports",
    roles: ["admin", "cashier", "manager_wh", "accountant", "supplier"],
  },
];

const publicRoutes = new Set([
  "/",
  "/login",
  "/signup",
  "/landing",
  "/invite",
  "/manifest.json",
  "/createcompanybyemail",
  "/unauthorized",
]);

const authRoutes = new Set(["/login", "/signup"]);

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

  return value
    .filter((role): role is string => typeof role === "string")
    .map((role) => role.trim().toLowerCase())
    .filter((role): role is Role => roleSet.has(role));
}

function getDefaultRedirectForRole(roles?: string): string {
  if (roles === "admin") return "/company";
  if (roles === "cashier") return "/salesDashboard";
  if (roles === "manager_wh") return "/dashboardUser";
  if (roles === "supplier") return "/supplier/orders";
  if (roles === "accountant") return "/voucher";
  if (roles === "customer") return "/customer-portal";
  return "/landing";
}

function safeRedirect(req: NextRequest, destination: string): NextResponse {
  const fallback = "/login";
  const target = destination.startsWith("/") ? destination : fallback;

  if (normalizePath(req.nextUrl.pathname) === normalizePath(target)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(target, req.nextUrl));
}

export default async function middleware(req: NextRequest) {
  const path = normalizePath(req.nextUrl.pathname);
  const isPublicRoute = publicRoutes.has(path);

  const authSecret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "secret";

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isSecureRequest =
    (forwardedProto ? forwardedProto.split(",")[0].trim() : null) === "https" ||
    req.nextUrl.protocol === "https:";

  let params: GetTokenParams = {
    req,
    secret: authSecret,
  };

  if (process.env.NODE_ENV === "production" && isSecureRequest) {
    params = {
      ...params,
      cookieName: "__Secure-authjs.session-token",
    };
  } else {
    params = {
      ...params,
      cookieName: "authjs.session-token",
    };
  }

  const authToken = await getToken(params);
  const userRoles = authToken?.role;

  const isAuthenticated = Boolean(authToken?.userId || authToken?.email);
  const isTokenActive =
    authToken?.userActive !== false && authToken?.companyActive !== false;
  const subscriptionRoute = "/settings/subscription";

  if (isAuthenticated && !isTokenActive) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (
    isAuthenticated &&
    typeof authToken?.userId === "string" &&
    typeof (authToken as any)?.sessionKey === "string"
  ) {
    const internalSecret =
      process.env.AUTH_SECRET ??
      process.env.NEXTAUTH_SECRET ??
      process.env.ENCRYPTION_SECRET;

    if (internalSecret) {
      try {
        const validationUrl = new URL("/api/auth/session-state", req.nextUrl);
        validationUrl.searchParams.set("userId", authToken.userId);
        validationUrl.searchParams.set(
          "sessionKey",
          String((authToken as any).sessionKey),
        );

        const validationResponse = await fetch(validationUrl, {
          method: "GET",
          headers: {
            "x-internal-auth": internalSecret,
          },
          cache: "no-store",
        });

        if (validationResponse.ok) {
          const validation = (await validationResponse.json()) as {
            active?: boolean;
          };

          if (validation.active === false) {
            return NextResponse.redirect(new URL("/login", req.nextUrl));
          }
        }
      } catch (error) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
      }
    }
  }

  if (isAuthenticated && authRoutes.has(path)) {
    return safeRedirect(req, getDefaultRedirectForRole(userRoles));
  }
  if (path === "/") {
    if (isAuthenticated) {
      return safeRedirect(req, getDefaultRedirectForRole(userRoles));
    } else {
      return safeRedirect(req, "/landing"); // or "/landing"
    }
  }

  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAuthenticated) {
    if (path === subscriptionRoute) {
      if (userRoles === "customer") {
        return safeRedirect(req, getDefaultRedirectForRole(userRoles));
      }
      return NextResponse.next();
    }
    const requiredRoles = getRequiredRoles(path);
    if (requiredRoles && !requiredRoles.some((role) => userRoles === role)) {
      return safeRedirect(req, getDefaultRedirectForRole(userRoles));
    }
  }

  if (
    isAuthenticated &&
    authToken?.subscriptionActive === false &&
    req.method !== "GET" &&
    path !== subscriptionRoute
  ) {
    return new NextResponse("Subscription inactive", { status: 403 });
  }

  const response = NextResponse.next();
  // These headers protect against common attacks
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|swcustom.js|workbox-.*\\.js|worker-.*\\.js|swe-worker-.*\\.js|splash_screens|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
