"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";

type Overview = { devices: number; needsAttention: number; pendingPlans: number; failedTasks: number; openTickets: number; totalAgentsConnected: number; agentsWithMissingPatches: number; agentsNeverScanned: number };
type DeploymentSummary = { planId: string; name: string; status: string; total: number; success: number; failed: number; pending: number; simulation: true };

export default function ReportsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [plans, setPlans] = useState<DeploymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [currentOverview, currentPlans] = await Promise.all([
        apiClient<Overview>("/reports/overview"),
        apiClient<DeploymentSummary[]>("/reports/deployment-summary"),
      ]);
      setOverview(currentOverview);
      setPlans(currentPlans);
    }
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
      <tr><td>Connected agents (heartbeat within 5 minutes)</td><td>{overview?.totalAgentsConnected ?? "—"}</td></tr>
      <tr><td>Agents reporting available Windows updates</td><td>{overview?.agentsWithMissingPatches ?? "—"}</td></tr>
      <tr><td>Devices never scanned</td><td>{overview?.agentsNeverScanned ?? "—"}</td></tr>
    </tbody></table></div>}
    <div className="dataHead"><div><h2>Deployment results</h2><p>Simulated task outcomes; these figures do not verify installation on devices.</p></div></div>
    {!error && (plans.length ? <div className="tableWrap"><table><thead><tr><th>PLAN</th><th>STATUS</th><th>PROGRESS</th><th>SUCCESS</th><th>FAILED</th><th>PENDING</th></tr></thead><tbody>{plans.map(plan => <tr key={plan.planId}><td>{plan.name}</td><td>{plan.status.replaceAll("_", " ")}</td><td><progress value={plan.success + plan.failed} max={Math.max(plan.total, 1)} aria-label={`Simulated progress for ${plan.name}`} /> {plan.success + plan.failed}/{plan.total}</td><td>{plan.success}</td><td>{plan.failed}</td><td>{plan.pending}</td></tr>)}</tbody></table></div> : <p className="panelMessage">No deployment plans found.</p>)}
  </section>;
}
