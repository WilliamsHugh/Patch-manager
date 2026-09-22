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
      setError(getErrorMessage(err, "Unable to load the software catalog."));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    try {
      setSelected(await apiClient<Software>(`/software/${id}`));
    } catch (err) {
      notify(getErrorMessage(err, "Unable to load software details."));
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
        notify("Software updated.");
      } else {
        await apiClient<Software>("/software", { method: "POST", body });
        notify("Software created.");
      }
      resetForm();
      await loadSoftware();
    } catch (err) {
      setFormError(getErrorMessage(err, "Unable to save the software entry."));
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
    const ok = window.confirm(`Delete "${item.vendor} ${item.name}"? Related patches may also be affected.`);
    if (!ok) return;
    try {
      await apiClient<{ deleted: boolean }>(`/software/${item.id}`, { method: "DELETE" });
      notify("Software deleted.");
      if (selected?.id === item.id) setSelected(null);
      if (editingId === item.id) resetForm();
      await loadSoftware();
    } catch (err) {
      notify(getErrorMessage(err, "Unable to delete the software entry."));
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
            <h2>Software catalog</h2>
            <p>Manage software names, vendors, and current versions.</p>
          </div>
          <button className="primary" onClick={() => void loadSoftware()} disabled={loading}>↻ Refresh</button>
        </div>

        {isAdmin && (
          <form className={styles.formBar} onSubmit={submit}>
            <label>Software name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} maxLength={120} required /></label>
            <label>Vendor<input value={form.vendor} onChange={event => setForm({ ...form, vendor: event.target.value })} maxLength={120} required /></label>
            <label>Version<input value={form.currentVersion} onChange={event => setForm({ ...form, currentVersion: event.target.value })} maxLength={80} placeholder="Optional" /></label>
            <div className={styles.formActions}>
              <button className="primary" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Create new"}</button>
              {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
            </div>
            {formError && <div className={styles.formError}>{formError}</div>}
          </form>
        )}

        <div className="tableTools">
          <label><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name, vendor, or version" /></label>
          <button onClick={() => setQuery("")}>⟳ Reset</button>
        </div>

        {error && <div className={styles.stateBox}><b>Failed to load data</b><p>{error}</p><button className="primary" onClick={() => void loadSoftware()}>Try again</button></div>}
        {loading && !error && <div className={styles.stateBox}>Loading software catalog...</div>}

        {!loading && !error && (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>SOFTWARE NAME</th>
                  <th>VENDOR</th>
                  <th>VERSION</th>
                  <th>PATCHES</th>
                  <th>INSTALLATIONS</th>
                  {isAdmin && <th>ACTIONS</th>}
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
                        <button onClick={() => startEdit(item)} title="Edit software">✎</button>
                        <button onClick={() => void remove(item)} title="Delete software">⌫</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty">No matching software found.</div>}
          </div>
        )}

        {!loading && !error && <div className="tableFoot"><span>Showing {filtered.length} of {items.length} software entries</span><div><button disabled>‹</button><b>1</b><button disabled>›</button></div></div>}
      </section>

      {selected && (
        <div className="drawerBackdrop" onClick={() => setSelected(null)}>
          <aside className="drawer" onClick={event => event.stopPropagation()}>
            <div className="drawerHead"><div><small>SOFTWARE DETAILS</small><h2>◫ {selected.name}</h2></div><button onClick={() => setSelected(null)}>×</button></div>
            <dl>
              <div><dt>Vendor</dt><dd>{selected.vendor}</dd></div>
              <div><dt>Current version</dt><dd>{selected.currentVersion || "—"}</dd></div>
              <div><dt>Patch count</dt><dd>{selected._count?.patches ?? selected.patches?.length ?? 0}</dd></div>
              <div><dt>Installation count</dt><dd>{selected._count?.installations ?? 0}</dd></div>
              <div><dt>Last updated</dt><dd>{new Date(selected.updatedAt).toLocaleString("en-US")}</dd></div>
            </dl>
            {selected.patches?.length ? (
              <>
                <h3>Related patches</h3>
                <div className={styles.patchList}>{selected.patches.slice(0, 6).map(patch => <span key={patch.id}>{patch.code} · {patch.severity}</span>)}</div>
              </>
            ) : <div className="infoBox">ⓘ No related patches are available.</div>}
            {isAdmin && <button className="drawerAction primary" onClick={() => startEdit(selected)}>✎ Edit software</button>}
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
