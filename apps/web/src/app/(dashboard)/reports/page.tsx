"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";

type Overview = { devices: number; needsAttention: number; pendingPlans: number; failedTasks: number; openTickets: number };

export default function ReportsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setOverview(await apiClient<Overview>("/reports/overview")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load reports."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <section className="dataPanel modulePanel"><div className="dataHead"><div><h2>Reports overview</h2><p>Current operational totals from the connected database.</p></div><DashboardActionButton onClick={() => void load()} disabled={loading}>Refresh data</DashboardActionButton></div>
    {loading && !overview && <p className="panelMessage" role="status">Loading reports...</p>}{error && <p className="panelMessage" role="alert">{error}</p>}
    {!error && <div className="tableWrap"><table><thead><tr><th>METRIC</th><th>CURRENT VALUE</th></tr></thead><tbody>
      <tr><td>Total devices</td><td>{overview?.devices ?? "—"}</td></tr>
      <tr><td>Devices needing attention</td><td>{overview?.needsAttention ?? "—"}</td></tr>
      <tr><td>Plans pending approval</td><td>{overview?.pendingPlans ?? "—"}</td></tr>
      <tr><td>Failed deployment tasks</td><td>{overview?.failedTasks ?? "—"}</td></tr>
      <tr><td>Open or in-progress tickets</td><td>{overview?.openTickets ?? "—"}</td></tr>
    </tbody></table></div>}
  </section>;
}
