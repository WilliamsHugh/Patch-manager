"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Role, type User } from "@patch-management/shared";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import styles from "./users.module.css";

type ManagedUser = User & { isActive: boolean; _count?: { devices: number } };
type Form = { email: string; name: string; role: Role; password: string; isActive: boolean };
const blankForm: Form = { email: "", name: "", role: Role.USER, password: "", isActive: true };
const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.MANAGER]: "Manager",
  [Role.IT_HELPDESK]: "IT Helpdesk",
  [Role.SECURITY_ANALYST]: "Security Analyst",
  [Role.USER]: "User",
};

export default function UsersPage() {
  const actor = getCurrentUser();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(blankForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      setUsers(await apiClient<ManagedUser[]>("/users"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load user accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (actor?.role === Role.ADMIN) void loadUsers();
    else setLoading(false);
  }, [actor?.role]);

  const filtered = useMemo(() => users.filter(user => {
    const keyword = query.trim().toLowerCase();
    return !keyword || [user.name, user.email, roleLabels[user.role]].some(value => value.toLowerCase().includes(keyword));
  }), [users, query]);

  function openCreate() {
    setEditing(null);
    setForm(blankForm);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditing(user);
    setForm({ email: user.email, name: user.name, role: user.role, password: "", isActive: user.isActive });
    setFormError("");
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await apiClient<ManagedUser>(`/users/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            ...(editing.id === actor?.id ? {} : { role: form.role, isActive: form.isActive }),
            ...(form.password ? { password: form.password } : {}),
          }),
        });
      } else {
        await apiClient<ManagedUser>("/users", {
          method: "POST",
          body: JSON.stringify({ email: form.email.trim().toLowerCase(), name: form.name.trim(), role: form.role, password: form.password }),
        });
      }
      setFormOpen(false);
      await loadUsers();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to save the user account");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!editing || editing.id === actor?.id || !window.confirm(`Deactivate account ${editing.email}?`)) return;
    setSaving(true);
    setFormError("");
    try {
      await apiClient<ManagedUser>(`/users/${editing.id}`, { method: "DELETE" });
      setFormOpen(false);
      await loadUsers();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to deactivate the user account");
    } finally {
      setSaving(false);
    }
  }

  if (actor?.role !== Role.ADMIN) return <section className={styles.page}><div className={styles.empty}>You do not have permission to manage user accounts.</div></section>;

  return <section className={styles.page}>
    <div className={styles.head}><div><h2>User accounts</h2><p>Administrators can create accounts, assign roles, and manage access.</p></div><button className="primary" onClick={openCreate}>＋ Create account</button></div>
    <div className={styles.tools}><input aria-label="Search accounts" placeholder="Search by name, email, or role" value={query} onChange={event => setQuery(event.target.value)} /><DashboardActionButton onClick={() => { setQuery(""); void loadUsers(); }} disabled={loading}>Reset</DashboardActionButton></div>
    {error && <div className={styles.alert} role="alert">{error}</div>}
    {loading ? <div className={styles.empty}>Loading user accounts...</div> : filtered.length === 0 ? <div className={styles.empty}>{query ? "No matching accounts found." : "No user accounts available."}</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>FULL NAME</th><th>EMAIL</th><th>ROLE</th><th>DEVICES</th><th>STATUS</th></tr></thead><tbody>{filtered.map(user => <tr key={user.id}><td><button className={styles.nameButton} onClick={() => openEdit(user)}>{user.name}</button></td><td>{user.email}</td><td>{roleLabels[user.role]}</td><td>{user._count?.devices ?? 0}</td><td><span className={`${styles.status} ${user.isActive ? styles.active : ""}`}>{user.isActive ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div>}
    {formOpen && <div className={styles.dialogBackdrop} onClick={() => setFormOpen(false)}><div className={styles.dialog} role="dialog" aria-modal="true" aria-label={editing ? "Edit account" : "Create account"} onClick={event => event.stopPropagation()}><div className={styles.dialogHead}><h2>{editing ? "Edit account" : "Create account"}</h2><button className={styles.close} onClick={() => setFormOpen(false)} aria-label="Close">×</button></div><form className={styles.form} onSubmit={save}>{formError && <div className={styles.alert} role="alert">{formError}</div>}<label>Email<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} disabled={!!editing} required /></label><label>Full name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></label><label>Role<select value={form.role} onChange={event => setForm({ ...form, role: event.target.value as Role })} disabled={editing?.id === actor?.id}>{Object.values(Role).map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label><label>{editing ? "Reset password (leave blank to keep current password)" : "Password"}<input type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required={!editing} /></label>{editing && <label>Status<select value={form.isActive ? "active" : "inactive"} onChange={event => setForm({ ...form, isActive: event.target.value === "active" })} disabled={editing.id === actor?.id}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}<small className={styles.hint}>Changing the role or password revokes the current refresh token. Inactive accounts cannot use the API.</small><div className={styles.actions}><button className={styles.save} disabled={saving}>{saving ? "Saving..." : "Save"}</button><button type="button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>{editing?.isActive && editing.id !== actor?.id && <button type="button" className={styles.danger} onClick={() => void deactivate()} disabled={saving}>Deactivate account</button>}</div></form></div></div>}
  </section>;
}
