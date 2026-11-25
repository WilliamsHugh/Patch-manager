"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import styles from "./audit-logs.module.css";

type AuditLog = { id: string; createdAt: string; action: string; entityType: string; entityId?: string | null; user?: { name: string } | null };

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextCursor?: string, resetFilters = false) {
    setLoading(true); setError("");
    const params = new URLSearchParams({ limit: "25" });
    if (!resetFilters && entityType.trim()) params.set("entityType", entityType.trim());
    if (!resetFilters && from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (!resetFilters && to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    if (nextCursor) params.set("cursor", nextCursor);
    try {
      const rows = await apiClient<AuditLog[]>(`/audit-logs?${params}`);
      setItems(rows); setCursor(nextCursor ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load audit logs."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <section className="dataPanel modulePanel"><div className="dataHead"><div><h2>Audit logs</h2><p>Account and workflow activity recorded by the API.</p></div><DashboardActionButton onClick={() => void load()} disabled={loading}>Refresh data</DashboardActionButton></div>
    <form className={`tableTools ${styles.filters}`} onSubmit={event => { event.preventDefault(); void load(); }}>
      <input className={styles.entityType} aria-label="Filter entity type" placeholder="Entity type" value={entityType} onChange={event => setEntityType(event.target.value)} />
      <label className={styles.dateField}><span>From</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className={styles.dateField}><span>To</span><input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
      <button type="submit" disabled={loading}>Apply filters</button>
      <DashboardActionButton onClick={() => { setEntityType(""); setFrom(""); setTo(""); void load(undefined, true); }} disabled={loading}>Reset</DashboardActionButton>
    </form>
    {error && <p className="panelMessage" role="alert">{error}</p>}
    {loading && !items.length && <p className="panelMessage" role="status">Loading audit logs...</p>}
    {!loading && !items.length && !error && <p className="panelMessage">No audit entries match the filters.</p>}
    {!!items.length && <div className="tableWrap"><table><thead><tr><th>TIME</th><th>ACTOR</th><th>ACTION</th><th>ENTITY</th></tr></thead><tbody>{items.map(entry => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString("en-US")}</td><td>{entry.user?.name ?? "System"}</td><td>{entry.action.replaceAll("_", " ")}</td><td>{entry.entityType}{entry.entityId ? ` · ${entry.entityId}` : ""}</td></tr>)}</tbody></table></div>}
    <div className="tableFoot"><span>Showing {items.length} entries</span><div>{cursor && <button type="button" disabled={loading} onClick={() => void load()}>First page</button>}{items.length === 25 && <button type="button" disabled={loading} onClick={() => void load(items.at(-1)?.id)}>Next page</button>}</div></div>
  </section>;
}
