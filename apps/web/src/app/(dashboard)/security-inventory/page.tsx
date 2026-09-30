"use client";

import { FormEvent, useEffect, useState } from "react";
import { PatchSeverity } from "@patch-management/shared";
import { apiClient, ApiError } from "@/lib/api";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import styles from "./security-inventory.module.css";

type RiskDevice = {
  id: string;
  hostname: string;
  department: string | null;
  status: string;
};

type RiskItem = {
  id: string;
  code: string;
  title: string;
  severity: PatchSeverity;
  releasedAt: string;
  requiresRestart: boolean;
  targetVersion: string | null;
  affectedDeviceCount: number;
  affectedDevices: RiskDevice[];
  software: {
    id: string;
    name: string;
    vendor: string;
    currentVersion: string | null;
  };
};

type RiskResponse = {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    affectedDevices: number;
  };
  items: RiskItem[];
};

const severityOptions = ["", ...Object.values(PatchSeverity)] as const;

export default function SecurityInventoryPage() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [data, setData] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRisks(nextQuery = query, nextSeverity = severity) {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextSeverity) params.set("severity", nextSeverity);

    try {
      const result = await apiClient<RiskResponse>(
        `/security-inventory${params.toString() ? `?${params}` : ""}`,
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load security risk data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRisks();
  }, []);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadRisks();
  }

  function resetFilters() {
    setQuery("");
    setSeverity("");
    void loadRisks("", "");
  }

  return (
    <section className={styles.page} aria-label="Security risk inventory">
      <div className="dataPanel">
        <div className="dataHead">
          <div>
            <h2>Risk filters</h2>
            <p>Find patches by CVE reference, software, or severity.</p>
          </div>
        </div>
        <form className={styles.filters} onSubmit={submitFilters}>
          <input
            aria-label="Search risk inventory"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search CVE, patch title, or software..."
          />
          <select
            aria-label="Filter by severity"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            {severityOptions.map((value) => (
              <option key={value || "all"} value={value}>
                {value || "All severities"}
              </option>
            ))}
          </select>
          <button className="primary" type="submit">
            Apply
          </button>
          <DashboardActionButton onClick={resetFilters}>
            Reset
          </DashboardActionButton>
        </form>
      </div>

      {!loading && error && (
        <div className={styles.error} role="alert">
          <b>Could not load security risks</b>
          <p>{error}</p>
          <button type="button" onClick={() => void loadRisks()}>Try again</button>
        </div>
      )}

      <section className={styles.summary} aria-label="Risk overview" aria-busy={loading}>
        <article><span>Total patches</span><strong>{data?.summary.total ?? "—"}</strong></article>
        <article className={styles.summaryCritical}><span>Critical</span><strong>{data?.summary.critical ?? "—"}</strong></article>
        <article className={styles.summaryHigh}><span>High</span><strong>{data?.summary.high ?? "—"}</strong></article>
        <article className={styles.summaryMedium}><span>Medium</span><strong>{data?.summary.medium ?? "—"}</strong></article>
        <article className={styles.summaryDevices}><span>Affected devices</span><strong>{data?.summary.affectedDevices ?? "—"}</strong></article>
      </section>

      <section className="dataPanel" aria-busy={loading}>
        <div className="dataHead">
          <div>
            <h2>Patch risk inventory</h2>
            <p>Review affected software and devices.</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>CVE / PATCH CODE</th>
                <th>TITLE</th>
                <th>SOFTWARE</th>
                <th>SEVERITY</th>
                <th>TARGET VERSION</th>
                <th>AFFECTED DEVICES</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={item.id}>
                  <td><b>{item.code}</b></td>
                  <td>{item.title}</td>
                  <td>{item.software.name}<small>{item.software.vendor}</small></td>
                  <td><span className={`${styles.severity} ${styles[item.severity.toLowerCase()]}`}>{item.severity}</span></td>
                  <td>{item.targetVersion ?? "Unknown"}</td>
                  <td>
                    <b>{item.affectedDeviceCount}</b>
                    {item.affectedDevices.length > 0 && (
                      <small>{item.affectedDevices.map((device) => device.hostname).join(", ")}</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && !data && <p className="panelMessage" role="status">Loading security risks...</p>}
          {!loading && !error && data?.items.length === 0 && <p className="panelMessage">No matching security risks found.</p>}
        </div>
      </section>
    </section>
  );
}
