import http from "k6/http";
import { check, sleep } from "k6";

// You can adjust VUs (users) and duration based on how heavy you want to test
export const options = {
  vus: 50, // 50 users
  duration: "2m",
};

// All routes from your menuItems (flattened)
const routes = [
  "/dashboard",
  "/inventory/dashboardUser",
  "/users",
  "/inventory/manageStocks",
  "/inventory/categories",
  "/inventory/suppliers",
  "/inventory/warehouses",
  "/products",
  "/expenses",
  "/customer",
  "/sells",
  "/debt",
  "/reports",
  "/chartOfAccount",
  "/journalEntry",
  "/sells/cashiercontrol",
  "/sells/pos",
  "/profile",
  "/settings",
];

// Optional: weight certain routes to simulate real usage (e.g., dashboard/sells more popular)
const weightedRoutes = [
  { url: "/dashboard", weight: 0.2 },
  { url: "/sells", weight: 0.2 },
  { url: "/inventory/manageStocks", weight: 0.1 },
  { url: "/products", weight: 0.1 },
  { url: "/debt", weight: 0.1 },
  { url: "/users", weight: 0.05 },
  { url: "/expenses", weight: 0.05 },
  { url: "/reports", weight: 0.05 },
  { url: "/chartOfAccount", weight: 0.05 },
  { url: "/settings", weight: 0.05 },
];

function pickWeightedRoute() {
  const r = Math.random();
  let sum = 0;
  for (const route of weightedRoutes) {
    sum += route.weight;
    if (r < sum) return route.url;
  }
  return "/dashboard";
}

export default function () {
  const BASE = "http://localhost:3000"; // change to production URL if needed

  const url = BASE + pickWeightedRoute();
  const res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "fast (<500ms)": (r) => r.timings.duration < 500,
  });

  // Sleep between requests to simulate real user think time
  sleep(Math.random() * 2 + 1);
}
