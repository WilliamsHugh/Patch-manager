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
];

const securityAnalystPaths =
  new Set([
    "/dashboard",
    "/software",
    "/patches",
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
    </div>
  );
}