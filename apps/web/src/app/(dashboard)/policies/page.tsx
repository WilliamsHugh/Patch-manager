"use client";

import { useEffect, useState } from "react";
import { Role } from "@patch-management/shared";
import { apiClient, getCachedApiData } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";

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

  return <section className="dataPanel modulePanel">
    <div className="dataHead"><div><h2>Policies</h2><p>Configured update rules from the database.</p></div><DashboardActionButton onClick={() => void load(true)} disabled={loading}>Refresh data</DashboardActionButton></div>
    {error && <p className="panelMessage" role="alert">{error}</p>}
    {loading && !items.length && <p className="panelMessage" role="status">Loading policies...</p>}
    {!loading && !items.length && <p className="panelMessage">No policies found.</p>}
    {!!items.length && <div className="tableWrap"><table><thead><tr><th>POLICY</th><th>MAX DEFERRAL</th><th>RESTART</th><th>STATUS</th><th>CONFIGURED BY</th>{isAdmin && <th>ACTION</th>}</tr></thead><tbody>{items.map(policy => <tr key={policy.id}><td>{policy.name}</td><td>{policy.maxDeferralHours} hours</td><td>{policy.forceRestart ? "Yes" : "No"}</td><td>{policy.isActive ? "Active" : "Inactive"}</td><td>{policy.configuredBy?.name ?? "—"}</td>{isAdmin && <td><button type="button" className="machineName" onClick={() => setSelected({ ...policy })}>Edit</button></td>}</tr>)}</tbody></table></div>}
    {selected && isAdmin && <div style={{ padding: 18, borderTop: "1px solid var(--line)", display: "grid", gap: 12, maxWidth: 480 }}><h2 style={{ margin: 0 }}>Edit {selected.name}</h2><label>Description<textarea value={selected.description ?? ""} onChange={event => setSelected({ ...selected, description: event.target.value })} /></label><label>Maximum deferral hours<input type="number" min={1} value={selected.maxDeferralHours} onChange={event => setSelected({ ...selected, maxDeferralHours: Number(event.target.value) })} /></label><label>Auto approve severity<select value={selected.autoApproveSeverity ?? ""} onChange={event => setSelected({ ...selected, autoApproveSeverity: event.target.value || null })}><option value="">None</option>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(value => <option key={value}>{value}</option>)}</select></label><label><input type="checkbox" checked={selected.forceRestart} onChange={event => setSelected({ ...selected, forceRestart: event.target.checked })} /> Force restart (policy setting)</label><label><input type="checkbox" checked={selected.isActive} onChange={event => setSelected({ ...selected, isActive: event.target.checked })} /> Active</label><div style={{ display: "flex", gap: 8 }}><button type="button" className="primary" onClick={() => void save()} disabled={saving || selected.maxDeferralHours < 1}>{saving ? "Saving..." : "Save policy"}</button><button type="button" onClick={() => setSelected(null)}>Cancel</button></div></div>}
  </section>;
}
