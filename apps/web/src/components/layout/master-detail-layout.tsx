"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Role,
  type User,
} from "@patch-management/shared";

import { loadCurrentUser, logout } from "@/lib/auth";

const navigation = [
  {
    icon: "⌂",
    label: "Dashboard",
    href: "/dashboard",
    description:
      "Overview of update compliance and system operations.",
  },
  {
    icon: "♙",
    label: "Users",
    href: "/users",
    description:
      "Manage accounts, roles, and access status.",
  },
  {
    icon: "◫",
    label: "Software",
    href: "/software",
    description:
      "Manage the software catalog and current versions.",
  },
  {
    icon: "⇩",
    label: "Patches",
    href: "/patches",
    description:
      "Track patches and severity levels.",
  },
  {
    icon: "⚠",
    label: "Security Inventory",
    href: "/security-inventory",
    description:
      "Assess patch risk by severity and CVE reference.",
  },
  {
    icon: "▣",
    label: "Devices",
    href: "/devices",
    description:
      "Find devices, owners, and agent status.",
  },
  {
    icon: "◷",
    label: "Deployment Plans",
    href: "/deployment-plans",
    description:
      "Create, review, and monitor deployment plans.",
  },
  {
    icon: "◇",
    label: "Tickets",
    href: "/tickets",
    description:
      "Receive and resolve support requests.",
  },
  {
    icon: "▤",
    label: "Reports",
    href: "/reports",
    description:
      "Analyze compliance and deployment performance.",
  },
  {
    icon: "⚙",
    label: "Policies",
    href: "/policies",
    description:
      "Configure update and restart policies.",
  },
  {
    icon: "☷",
    label: "Audit Logs",
    href: "/audit-logs",
    description:
      "Review system activity history.",
  },
];

const securityAnalystPaths =
  new Set([
    "/dashboard",
    "/software",
    "/patches",
    "/security-inventory",
    "/devices",
    "/deployment-plans",
    "/reports",
    "/audit-logs",
  ]);

export function MasterDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    selectedPath,
    setSelectedPath,
  ] = useState(pathname);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    accountOpen,
    setAccountOpen,
  ] = useState(false);

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null,
    );

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  // ==========================
  // SYNC CURRENT ROUTE
  // ==========================

  useEffect(() => {
    setSelectedPath(
      pathname,
    );

    setMobileOpen(
      false,
    );
  }, [pathname]);

  // ==========================
  // CHECK LOGIN SESSION
  // ==========================

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
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    const expired = () => router.replace("/login");
    window.addEventListener("patch:session-expired", expired);
    return () => window.removeEventListener("patch:session-expired", expired);
  }, [router]);

  // ==========================
  // NAVIGATION BY ROLE
  // ==========================

  const visibleNavigation =
    useMemo(() => {
      return navigation.filter(
        (item) => {
          // Only administrators can see account management.
          if (
            item.href ===
            "/users"
          ) {
            return (
              user?.role ===
              Role.ADMIN
            );
          }

          if (user?.role === Role.USER) {
            return ["/dashboard", "/software", "/patches", "/devices", "/tickets"].includes(item.href);
          }

          if (item.href === "/audit-logs") {
            return user?.role === Role.ADMIN || user?.role === Role.SECURITY_ANALYST;
          }

          // SECURITY_ANALYST
          // Security analysts can see only their assigned modules.
          if (
            user?.role ===
            Role.SECURITY_ANALYST
          ) {
            return securityAnalystPaths.has(
              item.href,
            );
          }

          return true;
        },
      );
    }, [user?.role]);

  // ==========================
  // CURRENT PAGE INFO
  // ==========================

  const selection =
    useMemo(() => {
      if (
        selectedPath.startsWith(
          "/profile",
        )
      ) {
        return {
          label:
            "Profile",

          description:
            "View account details, role, and assigned devices.",
        };
      }

      return (
        visibleNavigation.find(
          (item) =>
            selectedPath.startsWith(
              item.href,
            ),
        ) ??
        visibleNavigation[0]
      );
    }, [
      selectedPath,
      visibleNavigation,
    ]);

  // ==========================
  // AVATAR INITIALS
  // ==========================

  const initials =
    user?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map(
        (part) =>
          part[0],
      )
      .join("")
      .toUpperCase() ||
    "U";

  // ==========================
  // LOGOUT
  // ==========================

  async function handleLogout() {
    setLoggingOut(
      true,
    );

    await logout();

    router.replace(
      "/login",
    );

    router.refresh();
  }

  // ==========================
  // SESSION LOADING
  // ==========================

  if (
    checkingSession
  ) {
    return (
      <div className="sessionLoading">
        <span>
          ↻
        </span>

        <p>
          Checking your session...
        </p>
      </div>
    );
  }

  return (
    <div
      className={`portal sharedPortal ${
        collapsed
          ? "sidebarCollapsed"
          : ""
      }`}
    >
      {/* ======================
          TOP HEADER
      ====================== */}

      <header className="portalBar">
        <button
          type="button"
          className="waffle"
          aria-label="Applications"
        >
          ⠿
        </button>

        <Link
          className="azureBrand"
          href="/dashboard"
        >
          PatchFlow
        </Link>

        <label className="globalSearch">
          <span>
            ⌕
          </span>

          <input
            placeholder="Search resources, services, and documentation"
          />
        </label>

        <div className="portalTools">
          <button
            type="button"
            aria-label="Commands"
          >
            ⌘
          </button>

          <button
            type="button"
            aria-label="Information"
          >
            ?
          </button>

          <button
            type="button"
            aria-label="Notifications"
          >
            ♢
            <i />
          </button>

          <button
            type="button"
            className="accountButton"
            onClick={() =>
              setAccountOpen(
                (value) =>
                  !value,
              )
            }
            aria-expanded={
              accountOpen
            }
            aria-haspopup="menu"
          >
            <span className="account">
              <b>
                {
                  user?.name
                }
              </b>

              <small>
                {
                  user?.email
                }
              </small>
            </span>

            <span className="avatar">
              {initials}
            </span>
          </button>

          {accountOpen && (
            <div
              className="accountMenu"
              role="menu"
            >
              <div className="accountMenuIdentity">
                <span className="avatar large">
                  {
                    initials
                  }
                </span>

                <div>
                  <b>
                    {
                      user?.name
                    }
                  </b>

                  <small>
                    {
                      user?.email
                    }
                  </small>

                  <em>
                    {
                      user?.role
                    }
                  </em>
                </div>
              </div>

              <Link
                href="/profile"
                role="menuitem"
                onClick={() =>
                  setAccountOpen(
                    false,
                  )
                }
              >
                ♙ Profile
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={
                  handleLogout
                }
                disabled={
                  loggingOut
                }
              >
                ⇥{" "}
                {loggingOut
                  ? "Signing out..."
                  : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ======================
          WORKSPACE
      ====================== */}

      <div className="workspace">
        {/* ======================
            SIDEBAR
        ====================== */}

        <aside
          className={`sideNav persistentSidebar ${
            mobileOpen
              ? "open"
              : ""
          }`}
          aria-label="Main navigation"
        >
          <div className="serviceTitle">
            <span className="serviceIcon">
              ↻
            </span>

            <div>
              <b>
                PatchFlow
              </b>

              <small>
                Update Manager
              </small>
            </div>

            <button
              type="button"
              className="sidebarToggle"
              onClick={() =>
                setCollapsed(
                  (value) =>
                    !value,
                )
              }
              aria-label={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              aria-pressed={collapsed}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
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
              ⌕
            </span>

            <input
              placeholder="Search menu"
            />
          </label>

          <nav className="moduleNav">
            {visibleNavigation.map(
              (item) => (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  prefetch
                  onClick={() =>
                    setSelectedPath(
                      item.href,
                    )
                  }
                  className={
                    selectedPath.startsWith(
                      item.href,
                    )
                      ? "active"
                      : ""
                  }
                  aria-current={
                    selectedPath.startsWith(
                      item.href,
                    )
                      ? "page"
                      : undefined
                  }
                >
                  <span>
                    {
                      item.icon
                    }
                  </span>

                  <b>
                    {
                      item.label
                    }
                  </b>
                </Link>
              ),
            )}
          </nav>
        </aside>

        {/* ======================
            MOBILE BACKDROP
        ====================== */}

        {mobileOpen && (
          <button
            type="button"
            className="mobileBackdrop"
            aria-label="Close menu"
            onClick={() =>
              setMobileOpen(
                false,
              )
            }
          />
        )}

        {/* ======================
            MAIN CONTENT
        ====================== */}

        <main className="mainContent detailPane">
          {/* BREADCRUMB */}

          <div className="breadcrumb">
            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  true,
                )
              }
              aria-label="Open menu"
            >
              ☰
            </button>

            <Link href="/dashboard">
              Home
            </Link>

            <span>
              ›
            </span>

            <span>
              Management services
            </span>

            <span>
              ›
            </span>

            <b>
              {
                selection.label
              }
            </b>
          </div>

          {/* PAGE TITLE */}

          <section className="titleRow">
            <div>
              <div className="titleLine">
                <span className="pageIcon">
                  ↻
                </span>

                <h1>
                  {selection.label ===
                  "Dashboard"
                    ? "Update Manager"
                    : selection.label}
                </h1>

                <button
                  type="button"
                  className="star"
                  aria-label="Add to favorites"
                >
                  ☆
                </button>
              </div>

              <p>
                {
                  selection.description
                }
              </p>
            </div>
          </section>

          {/* PAGE CONTENT */}

          <div
            className="detailContent"
            key={pathname}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
