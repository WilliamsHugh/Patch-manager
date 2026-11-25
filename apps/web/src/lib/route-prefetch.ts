import { Role } from "@patch-management/shared";
import { apiClient } from "./api";

export function routeDataPaths(route: string, role: Role): string[] {
  if (role === Role.USER && !["/dashboard", "/software", "/patches", "/devices", "/tickets", "/notifications", "/profile"].includes(route)) return [];
  if (role === Role.SECURITY_ANALYST && ["/users", "/tickets", "/policies"].includes(route)) return [];
  if (route === "/audit-logs" && role !== Role.ADMIN && role !== Role.SECURITY_ANALYST) return [];
  const devices = role === Role.USER ? "/devices/me" : "/devices";
  switch (route) {
    case "/dashboard":
      return role === Role.USER ? [devices, "/patches"] : [devices, "/patches", "/deployment-plans", "/reports/overview"];
    case "/users": return role === Role.ADMIN ? ["/users"] : [];
    case "/software": return ["/software"];
    case "/patches": return ["/patches", "/software"];
    case "/security-inventory": return ["/security-inventory"];
    case "/devices": return [devices];
    case "/deployment-plans": return ["/deployment-plans", "/devices", "/patches"];
    case "/tickets": return ["/tickets"];
    case "/notifications": return ["/notifications"];
    case "/reports": return ["/reports/overview", "/reports/deployment-summary"];
    case "/policies": return ["/policies"];
    case "/audit-logs": return ["/audit-logs?limit=25"];
    case "/profile": return ["/users/me"];
    default: return [];
  }
}

export async function prefetchRouteData(route: string, role: Role): Promise<void> {
  const paths = routeDataPaths(route, role);
  await Promise.allSettled(paths.map((path) => apiClient(path)));
  if (route === "/tickets") {
    const tickets = await apiClient<{ id: string }[]>("/tickets").catch(() => []);
    if (tickets[0]?.id) await apiClient(`/tickets/${encodeURIComponent(tickets[0].id)}`).catch(() => undefined);
  }
}
