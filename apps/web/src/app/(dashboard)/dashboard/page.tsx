"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Machine = {
  name: string; group: string; os: string; type: string; status: "Đã cập nhật" | "Thiếu bản vá" | "Chưa đánh giá"; updates: number; checked: string;
};

const machines: Machine[] = [
  { name: "ACC-PC-012", group: "rg-ke-toan", os: "Windows 11 Pro", type: "Azure Arc", status: "Thiếu bản vá", updates: 4, checked: "10 phút trước" },
  { name: "DEV-WS-028", group: "rg-ky-thuat", os: "Windows 11 Pro", type: "Azure VM", status: "Đã cập nhật", updates: 0, checked: "18 phút trước" },
  { name: "HR-LAP-007", group: "rg-nhan-su", os: "Windows 10 Pro", type: "Azure Arc", status: "Thiếu bản vá", updates: 2, checked: "34 phút trước" },
  { name: "SRV-APP-01", group: "rg-may-chu", os: "Ubuntu 22.04 LTS", type: "Azure VM", status: "Đã cập nhật", updates: 0, checked: "1 giờ trước" },
  { name: "MKT-PC-021", group: "rg-marketing", os: "Windows 11 Pro", type: "Azure Arc", status: "Chưa đánh giá", updates: 0, checked: "Chưa có dữ liệu" },
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const [selected, setSelected] = useState<Machine | null>(null);
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => machines.filter(machine =>
    (status === "Tất cả trạng thái" || machine.status === status) &&
    `${machine.name} ${machine.group} ${machine.os}`.toLowerCase().includes(query.toLowerCase())
  ), [query, status]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <>
          <section className="scopeCard">
            <div className="scopeTitle"><span>ⓘ</span><p><b>Phạm vi đánh giá</b><small>Dữ liệu tổng hợp theo phạm vi tài nguyên đã chọn.</small></p></div>
            <div className="scopeFilters"><label>Đăng ký<select><option>Tất cả đăng ký</option><option>PT-TKHT Subscription</option></select></label><label>Nhóm tài nguyên<select><option>Tất cả nhóm tài nguyên</option><option>rg-ke-toan</option><option>rg-ky-thuat</option></select></label><label>Loại máy<select><option>Tất cả loại máy</option><option>Azure VM</option><option>Azure Arc</option></select></label><button onClick={() => notify("Đã áp dụng phạm vi mới")}>Áp dụng</button></div>
          </section>

          <section className="summaryGrid">
            <article className="summaryCard"><div className="cardHead"><h2>Trạng thái máy</h2><button>•••</button></div><div className="machineSummary"><div className="ring"><div><b>128</b><small>Tổng số máy</small></div></div><ul><li><span className="legend healthy"/><p><b>96</b><small>Đã cập nhật</small></p><em>75%</em></li><li><span className="legend warning"/><p><b>24</b><small>Thiếu bản vá</small></p><em>19%</em></li><li><span className="legend unknown"/><p><b>8</b><small>Chưa đánh giá</small></p><em>6%</em></li></ul></div><button className="cardLink" onClick={() => router.push("/devices")}>Xem tất cả máy →</button></article>

            <article className="summaryCard updateCard"><div className="cardHead"><div><h2>Các bản cập nhật có sẵn</h2><p>Lần đánh giá gần nhất: 10 phút trước</p></div><button>•••</button></div><div className="updateNumber"><span className="shield">♢</span><div><b>31</b><small>Bản cập nhật đang chờ</small></div></div><div className="updateStats"><div><span className="criticalDot"/><b>3</b><small>Nghiêm trọng</small></div><div><span className="securityDot"/><b>12</b><small>Bảo mật</small></div><div><span className="otherDot"/><b>16</b><small>Khác</small></div></div><button className="cardLink" onClick={() => router.push("/patches")}>Xem các bản cập nhật →</button></article>

            <article className="summaryCard"><div className="cardHead"><div><h2>Lịch bảo trì tiếp theo</h2><p>Trong 7 ngày tới</p></div><button>•••</button></div><div className="schedule"><div className="dateTile"><b>26</b><span>THG 8</span></div><div><b>Cập nhật Windows tháng 8</b><p>21:00 – 23:00 · Khối Văn phòng</p><span className="approved">Đã phê duyệt</span></div></div><div className="schedule second"><div className="dateTile"><b>29</b><span>THG 8</span></div><div><b>Vá lỗi máy chủ Linux</b><p>22:00 – 23:30 · 12 máy</p><span className="planned">Đã lên lịch</span></div></div><button className="cardLink">Xem cấu hình bảo trì →</button></article>
          </section>

          <section className="dataPanel">
            <div className="dataHead"><div><h2>Máy cần chú ý</h2><p>Các máy thiếu bản cập nhật hoặc chưa được đánh giá.</p></div><button className="primary" onClick={() => notify("Bắt đầu tạo lịch triển khai mới")}>＋ Lên lịch cập nhật</button></div>
            <div className="tableTools"><label><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo tên máy hoặc nhóm tài nguyên" /></label><select value={status} onChange={e => setStatus(e.target.value)}><option>Tất cả trạng thái</option><option>Đã cập nhật</option><option>Thiếu bản vá</option><option>Chưa đánh giá</option></select><button onClick={() => {setQuery("");setStatus("Tất cả trạng thái")}}>⟳ Đặt lại</button></div>
            <div className="tableWrap"><table><thead><tr><th><input type="checkbox" aria-label="Chọn tất cả" /></th><th>TÊN MÁY ↕</th><th>NHÓM TÀI NGUYÊN</th><th>HỆ ĐIỀU HÀNH</th><th>LOẠI</th><th>TRẠNG THÁI</th><th>BẢN VÁ THIẾU</th><th>ĐÁNH GIÁ GẦN NHẤT</th></tr></thead><tbody>{filtered.map(machine => <tr key={machine.name} onClick={() => setSelected(machine)}><td onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Chọn ${machine.name}`} /></td><td><button className="machineName">▣ {machine.name}</button></td><td>{machine.group}</td><td>{machine.os}</td><td>{machine.type}</td><td><span className={`compliance ${machine.status === "Đã cập nhật" ? "ok" : machine.status === "Thiếu bản vá" ? "miss" : "na"}`}><i />{machine.status}</span></td><td className={machine.updates ? "updateCount" : ""}>{machine.updates || "—"}</td><td>{machine.checked}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">Không tìm thấy máy phù hợp với bộ lọc.</div>}</div>
            <div className="tableFoot"><span>Hiển thị {filtered.length} / {machines.length} máy</span><div><button disabled>‹</button><b>1</b><button disabled>›</button></div></div>
          </section>
      {selected && <div className="drawerBackdrop" onClick={() => setSelected(null)}><aside className="drawer" onClick={e => e.stopPropagation()}><div className="drawerHead"><div><small>CHI TIẾT MÁY</small><h2>▣ {selected.name}</h2></div><button onClick={() => setSelected(null)}>×</button></div><div className="drawerStatus"><span className={`compliance ${selected.status === "Đã cập nhật" ? "ok" : selected.status === "Thiếu bản vá" ? "miss" : "na"}`}><i />{selected.status}</span><p>Lần đánh giá: {selected.checked}</p></div><dl><div><dt>Nhóm tài nguyên</dt><dd>{selected.group}</dd></div><div><dt>Hệ điều hành</dt><dd>{selected.os}</dd></div><div><dt>Loại tài nguyên</dt><dd>{selected.type}</dd></div><div><dt>Bản cập nhật còn thiếu</dt><dd>{selected.updates}</dd></div></dl><h3>Thao tác nhanh</h3><button className="drawerAction primary" onClick={() => notify(`Đang đánh giá ${selected.name}`)}>↻ Đánh giá ngay</button><button className="drawerAction" onClick={() => notify(`Đã thêm ${selected.name} vào lịch cập nhật`)}>◷ Lên lịch cập nhật</button><div className="infoBox">ⓘ Việc triển khai chỉ được thực hiện sau khi kế hoạch đã được Quản lý phê duyệt.</div></aside></div>}
      <div className={`toast ${toast ? "show" : ""}`}>✓ {toast}</div>
    </>
  );
}
