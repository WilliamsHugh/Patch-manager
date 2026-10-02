"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { DashboardActionButton } from "./dashboard-action-button";
import { ModuleTableLoading, type LoadingModule } from "./module-table-loading";
import { ModuleSearchField } from "./module-search-field";

type Column<T> = { label: string; value: (row: T) => string };

export function LiveModuleTable<T extends { id: string }>({
  title, description, endpoint, columns, loadingModule,
}: { title: string; description: string; endpoint: string; columns: Column<T>[]; loadingModule: LoadingModule }) {
  const [rows, setRows] = useState<T[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setRows(await apiClient<T[]>(endpoint)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to load ${title.toLowerCase()}.`); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [endpoint]);
  const filtered = useMemo(() => rows.filter(row =>
    columns.some(column => column.value(row).toLowerCase().includes(query.toLowerCase()))
  ), [rows, columns, query]);

  return <section className="dataPanel modulePanel">
    <div className="dataHead"><div><h2>{title}</h2><p>{description}</p></div><DashboardActionButton onClick={() => void load()} disabled={loading}>Refresh data</DashboardActionButton></div>
    <div className="tableTools"><ModuleSearchField ariaLabel={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={event => setQuery(event.target.value)} /><DashboardActionButton onClick={() => setQuery("")}>Reset</DashboardActionButton></div>
    {error && <p className="panelMessage" role="alert">{error}</p>}
    {loading && !rows.length ? <ModuleTableLoading module={loadingModule} /> : !error && <><div className="tableWrap"><table><thead><tr>{columns.map(column => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.id}>{columns.map(column => <td key={column.label}>{column.value(row) || "—"}</td>)}</tr>)}</tbody></table>{!loading && filtered.length === 0 && <div className="empty">{rows.length ? "No results match the current search." : `No ${title.toLowerCase()} exist in the database.`}</div>}</div><div className="tableFoot"><span>Showing {filtered.length} of {rows.length}</span></div></>}
  </section>;
}
