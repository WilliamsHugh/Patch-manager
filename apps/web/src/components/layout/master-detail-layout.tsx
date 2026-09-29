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

import {
  getAccessToken,
  getStoredUser,
} from "@/lib/auth-storage";

import { logout } from "@/lib/auth";

const navigation = [
<<<<<<< HEAD
  { icon: "⌂", label: "Dashboard", href: "/dashboard", description: "Overview of update compliance and system operations." },
  { icon: "♙", label: "Users", href: "/users", description: "Manage accounts, roles, and access status." },
  { icon: "◫", label: "Software", href: "/software", description: "Manage the software catalog and current versions." },
  { icon: "⇩", label: "Patches", href: "/patches", description: "Track patches and severity levels." },
  { icon: "▣", label: "Devices", href: "/devices", description: "Find devices, owners, and agent status." },
  { icon: "◷", label: "Deployment Plans", href: "/deployment-plans", description: "Create, review, and monitor deployment plans." },
  { icon: "◇", label: "Tickets", href: "/tickets", description: "Receive and resolve support requests." },
  { icon: "▤", label: "Reports", href: "/reports", description: "Analyze compliance and deployment performance." },
  { icon: "⚙", label: "Policies", href: "/policies", description: "Configure update and restart policies." },
  { icon: "☷", label: "Audit Logs", href: "/audit-logs", description: "Review system activity history." },
=======
  {
    icon: "⌂",
    label: "Dashboard",
    href: "/dashboard",
    description:
      "Tổng quan tình trạng cập nhật và vận hành hệ thống.",
  },
  {
    icon: "♙",
    label: "Users",
    href: "/users",
    description:
      "Quản lý tài khoản, vai trò và trạng thái truy cập.",
  },
  {
    icon: "◫",
    label: "Software",
    href: "/software",
    description:
      "Quản lý danh mục phần mềm và phiên bản hiện tại.",
  },
  {
    icon: "⇩",
    label: "Patches",
    href: "/patches",
    description:
      "Theo dõi bản vá và mức độ nghiêm trọng.",
  },
  {
    icon: "⚠",
    label: "Security Inventory",
    href: "/security-inventory",
    description:
      "Phân tích rủi ro bản vá theo severity và CVE-lite.",
  },
  {
    icon: "▣",
    label: "Devices",
    href: "/devices",
    description:
      "Tra cứu thiết bị, người sở hữu và trạng thái agent.",
  },
  {
    icon: "◷",
    label: "Deployment Plans",
    href: "/deployment-plans",
    description:
      "Lập, xét duyệt và theo dõi kế hoạch triển khai.",
  },
  {
    icon: "◇",
    label: "Tickets",
    href: "/tickets",
    description:
      "Tiếp nhận và xử lý yêu cầu hỗ trợ.",
  },
  {
    icon: "▤",
    label: "Reports",
    href: "/reports",
    description:
      "Thống kê tình trạng và hiệu quả triển khai.",
  },
  {
    icon: "⚙",
    label: "Policies",
    href: "/policies",
    description:
      "Cấu hình chính sách cập nhật và khởi động lại.",
  },
  {
    icon: "☷",
    label: "Audit Logs",
    href: "/audit-logs",
    description:
      "Theo dõi lịch sử thao tác trong hệ thống.",
  },
>>>>>>> feature/security-risk-inventory
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
    const sessionUser =
      getStoredUser();

    const token =
      getAccessToken();

    if (
      !sessionUser ||
      !token
    ) {
      router.replace(
        "/login",
      );

      return;
    }

    setUser(
      sessionUser,
    );

    setCheckingSession(
      false,
    );
  }, [router]);
<<<<<<< HEAD
  const visibleNavigation = useMemo(() => navigation.filter(item => {
    if (item.href === "/users") return user?.role === Role.ADMIN;
    if (user?.role === Role.SECURITY_ANALYST) return securityAnalystPaths.has(item.href);
    return true;
  }), [user?.role]);
  const selection = useMemo(() => {
    if (selectedPath.startsWith("/profile")) return { label: "Profile", description: "View account details, role, and assigned devices." };
    return visibleNavigation.find(item => selectedPath.startsWith(item.href)) ?? visibleNavigation[0];
  }, [selectedPath, visibleNavigation]);
  const initials = user?.name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join("").toUpperCase() || "U";
=======

  // ==========================
  // NAVIGATION BY ROLE
  // ==========================

  const visibleNavigation =
    useMemo(() => {
      return navigation.filter(
        (item) => {
          // Chỉ ADMIN thấy Users
          if (
            item.href ===
            "/users"
          ) {
            return (
              user?.role ===
              Role.ADMIN
            );
          }

          // SECURITY_ANALYST
          // chỉ được thấy một số module
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
            "Hồ sơ cá nhân",

          description:
            "Xem thông tin tài khoản, vai trò và các thiết bị được giao.",
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
>>>>>>> feature/security-risk-inventory

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

<<<<<<< HEAD
  if (checkingSession) return <div className="sessionLoading"><span>↻</span><p>Checking your session...</p></div>;

  return <div className={`portal sharedPortal ${collapsed ? "sidebarCollapsed" : ""}`}>
    <header className="portalBar">
      <button className="waffle" aria-label="Applications">⠿</button>
      <Link className="azureBrand" href="/dashboard">PatchFlow</Link>
      <label className="globalSearch"><span>⌕</span><input placeholder="Search resources, services, and documentation" /></label>
      <div className="portalTools"><button>⌘</button><button>?</button><button>♢<i /></button><button className="accountButton" onClick={() => setAccountOpen(value => !value)} aria-expanded={accountOpen} aria-haspopup="menu"><span className="account"><b>{user?.name}</b><small>{user?.email}</small></span><span className="avatar">{initials}</span></button>{accountOpen && <div className="accountMenu" role="menu"><div className="accountMenuIdentity"><span className="avatar large">{initials}</span><div><b>{user?.name}</b><small>{user?.email}</small><em>{user?.role}</em></div></div><Link href="/profile" role="menuitem" onClick={() => setAccountOpen(false)}>♙ Profile</Link><button role="menuitem" onClick={handleLogout} disabled={loggingOut}>⇥ {loggingOut ? "Signing out..." : "Sign out"}</button></div>}</div>
    </header>

    <div className="workspace">
      <aside className={`sideNav persistentSidebar ${mobileOpen ? "open" : ""}`} aria-label="Main navigation">
        <div className="serviceTitle"><span className="serviceIcon">↻</span><div><b>PatchFlow</b><small>Update Manager</small></div><button className="sidebarToggle" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={collapsed}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={collapsed ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"} /></svg></button></div>
        <label className="navSearch"><span>⌕</span><input placeholder="Search menu" /></label>
        <nav className="moduleNav">
          {visibleNavigation.map(item => <Link key={item.href} href={item.href} prefetch onClick={() => setSelectedPath(item.href)} className={selectedPath.startsWith(item.href) ? "active" : ""} aria-current={selectedPath.startsWith(item.href) ? "page" : undefined}><span>{item.icon}</span><b>{item.label}</b></Link>)}
        </nav>
        <div className="navGroup">Support</div>
        <nav className="moduleNav supportNav"><button><span>?</span><b>Help & support</b></button><button><span>♧</span><b>Send feedback</b></button></nav>
      </aside>
      {mobileOpen && <button className="mobileBackdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}

      <main className="mainContent detailPane">
        <div className="breadcrumb"><button onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button><Link href="/dashboard">Home</Link><span>›</span><a>Management services</a><span>›</span><b>{selection.label}</b></div>
        <section className="titleRow"><div><div className="titleLine"><span className="pageIcon">↻</span><h1>{selection.label === "Dashboard" ? "Update Manager" : selection.label}</h1><button className="star">☆</button></div><p>{selection.description}</p></div><button className="feedback">♧ Send feedback</button></section>
        <div className="commandBar"><button><span>↻</span>Refresh</button><button><span>?</span>Help</button></div>
        <div className="detailContent" key={pathname}>{children}</div>
      </main>
=======
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
          Đang kiểm tra
          phiên đăng nhập...
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
          aria-label="Ứng dụng"
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
            placeholder="Tìm kiếm tài nguyên, dịch vụ và tài liệu"
          />
        </label>

        <div className="portalTools">
          <button
            type="button"
            aria-label="Lệnh"
          >
            ⌘
          </button>

          <button
            type="button"
            aria-label="Thông tin"
          >
            ?
          </button>

          <button
            type="button"
            aria-label="Thông báo"
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
                ♙ Hồ sơ cá nhân
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
                  ? "Đang đăng xuất..."
                  : "Đăng xuất"}
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
          aria-label="Điều hướng chính"
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
              onClick={() =>
                setCollapsed(
                  (value) =>
                    !value,
                )
              }
              aria-label={
                collapsed
                  ? "Mở rộng sidebar"
                  : "Thu gọn sidebar"
              }
            >
              {collapsed
                ? "〉"
                : "〈"}
            </button>
          </div>

          <label className="navSearch">
            <span>
              ⌕
            </span>

            <input
              placeholder="Tìm kiếm trong menu"
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
            aria-label="Đóng menu"
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
              aria-label="Mở menu"
            >
              ☰
            </button>

            <Link href="/dashboard">
              Trang chủ
            </Link>

            <span>
              ›
            </span>

            <span>
              Dịch vụ quản lý
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
                  aria-label="Đánh dấu yêu thích"
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
>>>>>>> feature/security-risk-inventory
    </div>
  );
}
