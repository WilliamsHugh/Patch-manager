"use client";

import { FormEvent, useEffect, useState } from "react";
import { Role } from "@patch-management/shared";
import { apiClient, getCachedApiData } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import styles from "./policies.module.css";

type Policy = { id: string; name: string; description?: string | null; maxDeferralHours: number; autoApproveSeverity?: string | null; forceRestart: boolean; isActive: boolean; configuredBy?: { name: string } };

export default function PoliciesPage() {
  const [items, setItems] = useState<Policy[]>(() => getCachedApiData<Policy[]>("/policies") ?? []);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(() => getCachedApiData("/policies") === undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = getCurrentUser()?.role === Role.ADMIN;

  async function load(force = false) {
    setLoading(force || getCachedApiData("/policies") === undefined); setError("");
    try { setItems(await apiClient<Policy[]>("/policies", force ? { cache: "reload" } : {})); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load policies."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!selected || !isAdmin) return;
    setSaving(true); setError("");
    try {
      await apiClient(`/policies/${selected.id}`, { method: "PATCH", body: JSON.stringify({ description: selected.description ?? "", maxDeferralHours: selected.maxDeferralHours, autoApproveSeverity: selected.autoApproveSeverity || null, forceRestart: selected.forceRestart, isActive: selected.isActive }) });
      setSelected(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save policy."); }
    finally { setSaving(false); }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  return (
    <section className="dataPanel modulePanel">
      <div className="dataHead">
        <div>
          <h2>Policies</h2>
          <p>Configured update rules from the database.</p>
        </div>
        <DashboardActionButton onClick={() => void load(true)} disabled={loading}>
          Refresh data
        </DashboardActionButton>
      </div>
      {error && <p className="panelMessage" role="alert">{error}</p>}
      {loading && !items.length && <p className="panelMessage" role="status">Loading policies...</p>}
      {!loading && !items.length && <p className="panelMessage">No policies found.</p>}
      {!!items.length && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>POLICY</th>
                <th>MAX DEFERRAL</th>
                <th>RESTART</th>
                <th>STATUS</th>
                <th>CONFIGURED BY</th>
                {isAdmin && <th>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((policy) => (
                <tr key={policy.id} className={selected?.id === policy.id ? styles.selectedRow : ""}>
                  <td>{policy.name}</td>
                  <td>{policy.maxDeferralHours} hours</td>
                  <td>{policy.forceRestart ? "Yes" : "No"}</td>
                  <td>{policy.isActive ? "Active" : "Inactive"}</td>
                  <td>{policy.configuredBy?.name ?? "—"}</td>
                  {isAdmin && (
                    <td>
                      <button type="button" className="machineName" onClick={() => setSelected({ ...policy })}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && isAdmin && (
        <div className={styles.editPanel}>
          <div className={styles.formHeader}>
            <h3>Edit {selected.name}</h3>
          </div>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>Description</span>
              <textarea
                value={selected.description ?? ""}
                placeholder="Describe when and where this policy applies"
                onChange={(event) => setSelected({ ...selected, description: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Maximum deferral hours</span>
              <input
                type="number"
                min={1}
                required
                value={selected.maxDeferralHours}
                onChange={(event) => setSelected({ ...selected, maxDeferralHours: Number(event.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span>Auto approve severity</span>
              <select
                value={selected.autoApproveSeverity ?? ""}
                onChange={(event) => setSelected({ ...selected, autoApproveSeverity: event.target.value || null })}
              >
                <option value="">None</option>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxField}>
                <input
                  type="checkbox"
                  checked={selected.forceRestart}
                  onChange={(event) => setSelected({ ...selected, forceRestart: event.target.checked })}
                />
                <span>Force restart (policy setting)</span>
              </label>
              <label className={styles.checkboxField}>
                <input
                  type="checkbox"
                  checked={selected.isActive}
                  onChange={(event) => setSelected({ ...selected, isActive: event.target.checked })}
                />
                <span>Active</span>
              </label>
            </div>
            <div className={styles.actions}>
              <button
                type="submit"
                className="primary"
                disabled={saving || selected.maxDeferralHours < 1}
              >
                {saving ? "Saving..." : "Save policy"}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setSelected(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
