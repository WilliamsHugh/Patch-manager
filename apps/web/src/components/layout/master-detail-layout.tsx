"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const navigation = [
  { icon: "⌂", label: "Dashboard", href: "/dashboard", description: "Tổng quan tình trạng cập nhật và vận hành hệ thống." },
  { icon: "◫", label: "Software", href: "/software", description: "Quản lý danh mục phần mềm và phiên bản hiện tại." },
  { icon: "⇩", label: "Patches", href: "/patches", description: "Theo dõi bản vá và mức độ nghiêm trọng." },
  { icon: "▣", label: "Devices", href: "/devices", description: "Tra cứu thiết bị, người sở hữu và trạng thái agent." },
  { icon: "◷", label: "Deployment Plans", href: "/deployment-plans", description: "Lập, xét duyệt và theo dõi kế hoạch triển khai." },
  { icon: "◇", label: "Tickets", href: "/tickets", description: "Tiếp nhận và xử lý yêu cầu hỗ trợ." },
  { icon: "▤", label: "Reports", href: "/reports", description: "Thống kê tình trạng và hiệu quả triển khai." },
  { icon: "⚙", label: "Policies", href: "/policies", description: "Cấu hình chính sách cập nhật và khởi động lại." },
  { icon: "☷", label: "Audit Logs", href: "/audit-logs", description: "Theo dõi lịch sử thao tác trong hệ thống." },
];

export function MasterDetailLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [selectedPath, setSelectedPath] = useState(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setSelectedPath(pathname); setMobileOpen(false); }, [pathname]);
  const selection = useMemo(() => navigation.find(item => selectedPath.startsWith(item.href)) ?? navigation[0], [selectedPath]);

  return <div className={`portal sharedPortal ${collapsed ? "sidebarCollapsed" : ""}`}>
    <header className="portalBar">
      <button className="waffle" aria-label="Ứng dụng">⠿</button>
      <Link className="azureBrand" href="/dashboard">PatchFlow</Link>
      <label className="globalSearch"><span>⌕</span><input placeholder="Tìm kiếm tài nguyên, dịch vụ và tài liệu" /></label>
      <div className="portalTools"><button>⌘</button><button>?</button><button>♢<i /></button><span className="account"><b>Trần Trường Thuận</b><small>thuantt@patchflow.edu.vn</small></span><span className="avatar">TT</span></div>
    </header>

    <div className="workspace">
      <aside className={`sideNav persistentSidebar ${mobileOpen ? "open" : ""}`} aria-label="Điều hướng chính">
        <div className="serviceTitle"><span className="serviceIcon">↻</span><div><b>PatchFlow</b><small>Update Manager</small></div><button onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}>{collapsed ? "〉" : "〈"}</button></div>
        <label className="navSearch"><span>⌕</span><input placeholder="Tìm kiếm trong menu" /></label>
        <nav className="moduleNav">
          {navigation.map(item => <Link key={item.href} href={item.href} prefetch onClick={() => setSelectedPath(item.href)} className={selectedPath.startsWith(item.href) ? "active" : ""} aria-current={selectedPath.startsWith(item.href) ? "page" : undefined}><span>{item.icon}</span><b>{item.label}</b></Link>)}
        </nav>
        <div className="navGroup">Hỗ trợ</div>
        <nav className="moduleNav supportNav"><button><span>?</span><b>Trợ giúp & hỗ trợ</b></button><button><span>♧</span><b>Gửi phản hồi</b></button></nav>
      </aside>
      {mobileOpen && <button className="mobileBackdrop" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}

      <main className="mainContent detailPane">
        <div className="breadcrumb"><button onClick={() => setMobileOpen(true)} aria-label="Mở menu">☰</button><Link href="/dashboard">Trang chủ</Link><span>›</span><a>Dịch vụ quản lý</a><span>›</span><b>{selection.label}</b></div>
        <section className="titleRow"><div><div className="titleLine"><span className="pageIcon">↻</span><h1>{selection.label === "Dashboard" ? "Update Manager" : selection.label}</h1><button className="star">☆</button></div><p>{selection.description}</p></div><button className="feedback">♧ Gửi phản hồi</button></section>
        <div className="commandBar"><button><span>↻</span>Làm mới</button><button><span>?</span>Trợ giúp</button></div>
        <div className="detailContent" key={pathname}>{children}</div>
      </main>
    </div>
  </div>;
}
