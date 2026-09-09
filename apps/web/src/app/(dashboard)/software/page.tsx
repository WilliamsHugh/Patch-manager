"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Role } from "@patch-management/shared";
import { ApiError, apiClient } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import styles from "./software.module.css";

type Software = {
  id: string;
  name: string;
  vendor: string;
  currentVersion: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { patches: number; installations: number };
  patches?: { id: string; code: string; title: string; severity: string; releasedAt: string }[];
};

type SoftwareForm = {
  name: string;
  vendor: string;
  currentVersion: string;
};

const emptyForm: SoftwareForm = { name: "", vendor: "", currentVersion: "" };

export default function SoftwarePage() {
  const [items, setItems] = useState<Software[]>([]);
  const [selected, setSelected] = useState<Software | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<SoftwareForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(getStoredUser()?.role === Role.ADMIN);
    void loadSoftware();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(item => `${item.name} ${item.vendor} ${item.currentVersion ?? ""}`.toLowerCase().includes(normalized));
  }, [items, query]);

  async function loadSoftware() {
    setLoading(true);
    setError("");
    try {
      const data = await apiClient<Software[]>("/software");
      setItems(data);
      setSelected(current => current ? data.find(item => item.id === current.id) ?? null : null);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh mục phần mềm."));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    try {
      setSelected(await apiClient<Software>(`/software/${id}`));
    } catch (err) {
      notify(getErrorMessage(err, "Không tải được chi tiết phần mềm."));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setFormError("");
    try {
      const body = JSON.stringify({
        name: form.name,
        vendor: form.vendor,
        currentVersion: form.currentVersion || undefined,
      });
      if (editingId) {
        await apiClient<Software>(`/software/${editingId}`, { method: "PATCH", body });
        notify("Đã cập nhật phần mềm.");
      } else {
        await apiClient<Software>("/software", { method: "POST", body });
        notify("Đã tạo phần mềm.");
      }
      resetForm();
      await loadSoftware();
    } catch (err) {
      setFormError(getErrorMessage(err, "Không lưu được phần mềm."));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Software) {
    if (!isAdmin) return;
    setEditingId(item.id);
    setForm({ name: item.name, vendor: item.vendor, currentVersion: item.currentVersion ?? "" });
    setFormError("");
  }

  async function remove(item: Software) {
    if (!isAdmin) return;
    const ok = window.confirm(`Xóa phần mềm "${item.vendor} ${item.name}"? Các bản vá liên quan cũng có thể bị ảnh hưởng.`);
    if (!ok) return;
    try {
      await apiClient<{ deleted: boolean }>(`/software/${item.id}`, { method: "DELETE" });
      notify("Đã xóa phần mềm.");
      if (selected?.id === item.id) setSelected(null);
      if (editingId === item.id) resetForm();
      await loadSoftware();
    } catch (err) {
      notify(getErrorMessage(err, "Không xóa được phần mềm."));
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <>
      <section className="dataPanel">
        <div className="dataHead">
          <div>
            <h2>Danh mục phần mềm</h2>
            <p>Quản lý tên phần mềm, nhà cung cấp và phiên bản hiện tại.</p>
          </div>
          <button className="primary" onClick={() => void loadSoftware()} disabled={loading}>↻ Làm mới</button>
        </div>

        {isAdmin && (
          <form className={styles.formBar} onSubmit={submit}>
            <label>Tên phần mềm<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} maxLength={120} required /></label>
            <label>Nhà cung cấp<input value={form.vendor} onChange={event => setForm({ ...form, vendor: event.target.value })} maxLength={120} required /></label>
            <label>Phiên bản<input value={form.currentVersion} onChange={event => setForm({ ...form, currentVersion: event.target.value })} maxLength={80} placeholder="Tùy chọn" /></label>
            <div className={styles.formActions}>
              <button className="primary" disabled={saving}>{saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo mới"}</button>
              {editingId && <button type="button" onClick={resetForm}>Hủy</button>}
            </div>
            {formError && <div className={styles.formError}>{formError}</div>}
          </form>
        )}

        <div className="tableTools">
          <label><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên, nhà cung cấp hoặc phiên bản" /></label>
          <button onClick={() => setQuery("")}>⟳ Đặt lại</button>
        </div>

        {error && <div className={styles.stateBox}><b>Lỗi tải dữ liệu</b><p>{error}</p><button className="primary" onClick={() => void loadSoftware()}>Thử lại</button></div>}
        {loading && !error && <div className={styles.stateBox}>Đang tải danh mục phần mềm...</div>}

        {!loading && !error && (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>TÊN PHẦN MỀM</th>
                  <th>NHÀ CUNG CẤP</th>
                  <th>PHIÊN BẢN</th>
                  <th>BẢN VÁ</th>
                  <th>CÀI ĐẶT</th>
                  {isAdmin && <th>THAO TÁC</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} onClick={() => void loadDetail(item.id)}>
                    <td><button className="machineName">◫ {item.name}</button></td>
                    <td>{item.vendor}</td>
                    <td>{item.currentVersion || "—"}</td>
                    <td>{item._count?.patches ?? 0}</td>
                    <td>{item._count?.installations ?? 0}</td>
                    {isAdmin && (
                      <td className={styles.actions} onClick={event => event.stopPropagation()}>
                        <button onClick={() => startEdit(item)} title="Sửa phần mềm">✎</button>
                        <button onClick={() => void remove(item)} title="Xóa phần mềm">⌫</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty">Chưa có phần mềm phù hợp.</div>}
          </div>
        )}

        {!loading && !error && <div className="tableFoot"><span>Hiển thị {filtered.length} / {items.length} phần mềm</span><div><button disabled>‹</button><b>1</b><button disabled>›</button></div></div>}
      </section>

      {selected && (
        <div className="drawerBackdrop" onClick={() => setSelected(null)}>
          <aside className="drawer" onClick={event => event.stopPropagation()}>
            <div className="drawerHead"><div><small>CHI TIẾT PHẦN MỀM</small><h2>◫ {selected.name}</h2></div><button onClick={() => setSelected(null)}>×</button></div>
            <dl>
              <div><dt>Nhà cung cấp</dt><dd>{selected.vendor}</dd></div>
              <div><dt>Phiên bản hiện tại</dt><dd>{selected.currentVersion || "—"}</dd></div>
              <div><dt>Số bản vá</dt><dd>{selected._count?.patches ?? selected.patches?.length ?? 0}</dd></div>
              <div><dt>Số lượt cài đặt</dt><dd>{selected._count?.installations ?? 0}</dd></div>
              <div><dt>Cập nhật cuối</dt><dd>{new Date(selected.updatedAt).toLocaleString("vi-VN")}</dd></div>
            </dl>
            {selected.patches?.length ? (
              <>
                <h3>Bản vá liên quan</h3>
                <div className={styles.patchList}>{selected.patches.slice(0, 6).map(patch => <span key={patch.id}>{patch.code} · {patch.severity}</span>)}</div>
              </>
            ) : <div className="infoBox">ⓘ Chưa có bản vá liên quan trong hệ thống.</div>}
            {isAdmin && <button className="drawerAction primary" onClick={() => startEdit(selected)}>✎ Chỉnh sửa phần mềm</button>}
          </aside>
        </div>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>✓ {toast}</div>
    </>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && Array.isArray(error.message)) return error.message.join(", ");
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
