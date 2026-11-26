"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Role, type User } from "@patch-management/shared";
import { loadCurrentUser, logout } from "@/lib/auth";
import { RouteContentPreview } from "@/components/layout/route-content-preview";
import { apiClient } from "@/lib/api";
import { prefetchRouteData } from "@/lib/route-prefetch";
import {
  AppGridIcon,
  BrandSyncIcon,
  ChevronRightIcon,
  LogOutIcon,
  MenuIcon,
  type NavIconName,
  NavModuleIcon,
  SearchIcon,
  UserProfileIcon,
} from "@/components/ui/icons";
import { LiquidGlassThemeToggle } from "@/components/ui/liquid-glass-theme-toggle";
import notificationStyles from "@/app/(dashboard)/notifications/notifications.module.css";

const navigation: {
  icon: NavIconName;
  label: string;
  href: string;
  description: string;
}[] = [
  {
    icon: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    description: "Overview of update compliance and system operations.",
  },
  {
    icon: "users",
    label: "Users",
    href: "/users",
    description: "Manage accounts, roles, and access status.",
  },
  {
    icon: "software",
    label: "Software",
    href: "/software",
    description: "Manage the software catalog and current versions.",
  },
  {
    icon: "patches",
    label: "Patches",
    href: "/patches",
    description: "Track patches and severity levels.",
  },
  {
    icon: "security-inventory",
    label: "Security Inventory",
    href: "/security-inventory",
    description: "Assess patch risk by severity and CVE reference.",
  },
  {
    icon: "devices",
    label: "Devices",
    href: "/devices",
    description: "Find devices, owners, and agent status.",
  },
  {
    icon: "deployment-plans",
    label: "Deployment Plans",
    href: "/deployment-plans",
    description: "Create, review, and monitor deployment plans.",
  },
  {
    icon: "tickets",
    label: "Tickets",
    href: "/tickets",
    description: "Receive and resolve support requests.",
  },
  {
    icon: "notifications",
    label: "Notifications",
    href: "/notifications",
    description: "Updates and requests for your account.",
  },
  {
    icon: "reports",
    label: "Reports",
    href: "/reports",
    description: "Analyze compliance and deployment performance.",
  },
  {
    icon: "policies",
    label: "Policies",
    href: "/policies",
    description: "Configure update and restart policies.",
  },
  {
    icon: "audit-logs",
    label: "Audit Logs",
    href: "/audit-logs",
    description: "Review system activity history.",
  },
];

const securityAnalystPaths = new Set([
  "/dashboard",
  "/software",
  "/patches",
  "/security-inventory",
  "/devices",
  "/deployment-plans",
  "/reports",
  "/audit-logs",
]);

export function MasterDetailLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const accountWrapRef = useRef<HTMLDivElement | null>(null);

  const [requestedPath, setRequestedPath] = useState<string | null>(null);
  const selectedPath = requestedPath ?? pathname;
  const routeIsPending = requestedPath !== null && requestedPath !== pathname;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setRequestedPath((current) => (current === pathname ? null : current));
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (accountWrapRef.current && !accountWrapRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    let active = true;
    loadCurrentUser()
      .then((sessionUser) => {
        if (!active) return;
        setUser(sessionUser);
        setCheckingSession(false);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const expired = () => router.replace("/login");
    window.addEventListener("patch:session-expired", expired);
    return () => window.removeEventListener("patch:session-expired", expired);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const refreshCount = () => {
      void apiClient<{ status: string }[]>("/notifications")
        .then((items) => {
          if (active) {
            setUnreadNotifications(items.filter((item) => item.status === "UNREAD").length);
          }
        })
        .catch(() => {
          if (active) setUnreadNotifications(0);
        });
    };
    const updated = (event: Event) => setUnreadNotifications((event as CustomEvent<number>).detail);
    refreshCount();
    window.addEventListener("patch:notifications-updated", updated);
    return () => {
      active = false;
      window.removeEventListener("patch:notifications-updated", updated);
    };
  }, [user]);

  const visibleNavigation = useMemo(() => {
    return navigation.filter((item) => {
      if (item.href === "/users") {
        return user?.role === Role.ADMIN;
      }
      if (user?.role === Role.USER) {
        return [
          "/dashboard",
          "/software",
          "/patches",
          "/devices",
          "/tickets",
          "/notifications",
        ].includes(item.href);
      }
      if (item.href === "/audit-logs") {
        return user?.role === Role.ADMIN || user?.role === Role.SECURITY_ANALYST;
      }
      if (user?.role === Role.SECURITY_ANALYST) {
        return item.href === "/notifications" || securityAnalystPaths.has(item.href);
      }
      return true;
    });
  }, [user?.role]);

  const filteredNavigation = useMemo(() => {
    const keyword = menuQuery.trim().toLowerCase();
    if (!keyword) return visibleNavigation;
    return visibleNavigation.filter(
      (item) =>
        item.label.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword),
    );
  }, [menuQuery, visibleNavigation]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        for (const route of [...visibleNavigation.map((item) => item.href), "/profile"]) {
          if (!active) break;
          await prefetchRouteData(route, user.role);
          await new Promise((resolve) => window.setTimeout(resolve, 150));
        }
      })();
    }, 800);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [user?.id, user?.role, visibleNavigation]);

  function warmRoute(path: string) {
    if (!user) return;
    router.prefetch(path);
    void prefetchRouteData(path, user.role);
  }

  const selection = useMemo(() => {
    if (selectedPath.startsWith("/profile")) {
      return {
        icon: null as NavIconName | null,
        label: "Profile",
        description: "View account details, role, and assigned devices.",
      };
    }
    return (
      visibleNavigation.find((item) => selectedPath.startsWith(item.href)) ??
      visibleNavigation[0]
    );
  }, [selectedPath, visibleNavigation]);

  const initials =
    user?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
    router.refresh();
  }

  function selectRoute(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    setRequestedPath(path === pathname ? null : path);
    setMobileOpen(false);
  }

  function handleGlobalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = globalQuery.trim().toLowerCase();
    if (!keyword) return;
    const match = visibleNavigation.find(
      (item) =>
        item.label.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword),
    );
    if (match) {
      setRequestedPath(match.href === pathname ? null : match.href);
      router.push(match.href);
    }
  }

  function handleWaffleToggle() {
    if (typeof window !== "undefined" && window.innerWidth <= 800) {
      setMobileOpen((current) => !current);
    } else {
      setCollapsed((current) => !current);
    }
  }

  if (checkingSession) {
    return (
      <div className="sessionLoading">
        <span>
          <BrandSyncIcon size={22} />
        </span>
        <p>Checking your session...</p>
      </div>
    );
  }

  return (
    <div className={`portal sharedPortal ${collapsed ? "sidebarCollapsed" : ""}`}>
      <header className="portalBar">
        <button
          type="button"
          className="waffle"
          aria-label="Toggle navigation"
          onClick={handleWaffleToggle}
        >
          <AppGridIcon size={18} />
        </button>

        <Link
          className="azureBrand"
          href="/dashboard"
          onClick={(event) => selectRoute(event, "/dashboard")}
        >
          PatchFlow
        </Link>

        <form className="globalSearch" role="search" onSubmit={handleGlobalSearch}>
          <span>
            <SearchIcon size={15} />
          </span>
          <input
            type="search"
            aria-label="Jump to service module"
            placeholder="Jump to module (e.g. Devices, Policies, Patches)..."
            value={globalQuery}
            onChange={(event) => setGlobalQuery(event.target.value)}
          />
        </form>

        <div className="portalTools">
          <button
            type="button"
            className="portalIconButton"
            aria-label="Notifications"
            onClick={() => {
              setRequestedPath("/notifications");
              router.push("/notifications");
            }}
          >
            <NavModuleIcon name="notifications" size={18} />
            {unreadNotifications > 0 && <i />}
          </button>

          <div className="accountWrap" ref={accountWrapRef}>
            <button
              type="button"
              className="accountButton"
              onClick={() => setAccountOpen((value) => !value)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              <span className="account">
                <b>{user?.name}</b>
                <small>{user?.email}</small>
              </span>
              <span className="avatar">{initials}</span>
            </button>

            {accountOpen && (
              <div className="accountMenu" role="menu">
                <div className="accountMenuIdentity">
                  <span className="avatar large">{initials}</span>
                  <div>
                    <b>{user?.name}</b>
                    <small>{user?.email}</small>
                    <em>{user?.role}</em>
                  </div>
                </div>

                <Link
                  href="/profile"
                  role="menuitem"
                  onMouseEnter={() => warmRoute("/profile")}
                  onFocus={() => warmRoute("/profile")}
                  onClick={(event) => {
                    selectRoute(event, "/profile");
                    setAccountOpen(false);
                  }}
                >
                  <UserProfileIcon size={16} />
                  Profile
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOutIcon size={16} />
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            )}
          </div>

          <LiquidGlassThemeToggle />
        </div>
      </header>

      <div className="workspace">
        <aside
          className={`sideNav persistentSidebar ${mobileOpen ? "open" : ""}`}
          aria-label="Main navigation"
        >
          <div className="serviceTitle">
            <span className="serviceIcon">
              <BrandSyncIcon size={19} />
            </span>

            <div>
              <b>PatchFlow</b>
              <small>Update Manager</small>
            </div>

            <button
              type="button"
              className="sidebarToggle"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={collapsed ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"} />
              </svg>
            </button>
          </div>

          <label className="navSearch">
            <span>
              <SearchIcon size={14} />
            </span>
            <input
              type="search"
              aria-label="Filter navigation menu"
              placeholder="Search menu"
              value={menuQuery}
              onChange={(event) => setMenuQuery(event.target.value)}
            />
          </label>

          <nav className="moduleNav">
            {filteredNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                title={collapsed ? item.label : undefined}
                onMouseEnter={() => warmRoute(item.href)}
                onFocus={() => warmRoute(item.href)}
                onTouchStart={() => warmRoute(item.href)}
                onClick={(event) => selectRoute(event, item.href)}
                className={selectedPath.startsWith(item.href) ? "active" : ""}
                aria-current={selectedPath.startsWith(item.href) ? "page" : undefined}
              >
                <span>
                  <NavModuleIcon name={item.icon} size={18} />
                </span>
                <b>{item.label}</b>
                {item.href === "/notifications" && unreadNotifications > 0 && (
                  <span
                    className={notificationStyles.navCount}
                    aria-label={`${unreadNotifications} unread notifications`}
                  >
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {mobileOpen && (
          <button
            type="button"
            className="mobileBackdrop"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <main className="mainContent detailPane">
          <div className="breadcrumb">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon size={18} />
            </button>

            <Link href="/dashboard" onClick={(event) => selectRoute(event, "/dashboard")}>
              Home
            </Link>

            <span>
              <ChevronRightIcon size={13} />
            </span>

            <span>Management services</span>

            <span>
              <ChevronRightIcon size={13} />
            </span>

            <b>{selection?.label}</b>
          </div>

          <section className="titleRow">
            <div>
              <div className="titleLine">
                <span className="pageIcon">
                  {selection?.icon ? (
                    <NavModuleIcon name={selection.icon} size={20} />
                  ) : (
                    <UserProfileIcon size={20} />
                  )}
                </span>

                <h1>
                  {selection?.label === "Dashboard"
                    ? "Update Manager"
                    : selection?.label}
                </h1>
              </div>

              <p>{selection?.description}</p>
            </div>
          </section>

          <div className="detailContent" key={selectedPath}>
            {routeIsPending ? <RouteContentPreview path={requestedPath} /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
