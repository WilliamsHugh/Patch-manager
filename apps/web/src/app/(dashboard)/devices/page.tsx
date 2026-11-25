"use client";

import styles from "./devices.module.css";
import { FormEvent, useEffect, useState } from "react";
import { AgentScanOutcome, Role, type AgentScanResult } from "@patch-management/shared";
import { useRouter } from "next/navigation";
import { ApiError, apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import { ModuleTableLoading } from "@/components/ui/module-table-loading";
import { ModuleSearchField } from "@/components/ui/module-search-field";

type InstalledSoftware = {
  id: string;
  version: string;
  installedAt?: string | null;
  software: {
    id: string;
    name: string;
    vendor: string;
    currentVersion?: string | null;
  };
};

type MissingPatch = {
  patchId: string;
  patchCode: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  releasedAt: string;
  requiresRestart: boolean;
  softwareId: string;
  softwareName: string;
  vendor: string;
  installedVersion: string;
  currentVersion: string;
};

type ComplianceResult = {
  deviceId: string;
  hostname: string;
  totalMissing: number;
  missingPatches: MissingPatch[];
};

type AgentStatus = {
  id: string;
  version: string;
  isConnected: boolean;
  lastHeartbeatAt: string | null;
  lastScanAt: string | null;
  lastScanResult?: unknown | null;
};

type Device = {
  id: string;
  hostname: string;
  operatingSystem: string;
  ipAddress?: string | null;
  department?: string | null;
  status: "ONLINE" | "OFFLINE" | "NEEDS_ATTENTION";

  owner?: {
    id: string;
    name: string;
    email: string;
  } | null;

  installedSoftware?: InstalledSoftware[];

  agentStatus?: AgentStatus | null;
};

type DeviceForm = {
  hostname: string;
  operatingSystem: string;
  ipAddress: string;
  department: string;
  status: Device["status"];
  ownerId: string;
};

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;

const emptyForm: DeviceForm = {
  hostname: "",
  operatingSystem: "",
  ipAddress: "",
  department: "",
  status: "OFFLINE",
  ownerId: "",
};

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);

  const [compliance, setCompliance] =
    useState<ComplianceResult | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState("");
  const [detailTab, setDetailTab] = useState<"software" | "patches">("software");

  const [form, setForm] = useState<DeviceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [canPropose, setCanPropose] = useState(false);
  const [issuedToken, setIssuedToken] = useState("");
  const [credentialError, setCredentialError] = useState("");
  const [issuingCredential, setIssuingCredential] = useState(false);

  useEffect(() => {
    const role = getCurrentUser()?.role;
    setIsAdmin(role === Role.ADMIN);
    setCanPropose(role === Role.ADMIN);
    void loadDevices();

    const timer = window.setInterval(() => {
      void loadDevices();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);
  async function loadDevices(search = query) {
    setLoading(true);
    setError("");

    try {
      const currentUser = getCurrentUser();
      const isNormalUser = currentUser?.role === Role.USER;

      const path = isNormalUser
        ? "/devices/me"
        : search.trim()
          ? `/devices?q=${encodeURIComponent(search.trim())}`
          : "/devices";

      const data = await apiClient<Device[]>(path);

      if (isNormalUser && search.trim()) {
        const keyword = search.trim().toLowerCase();

        setDevices(
          data.filter((device) =>
            `${device.hostname} ${device.operatingSystem} ${
              device.department ?? ""
            } ${device.ipAddress ?? ""}`
              .toLowerCase()
              .includes(keyword),
          ),
        );
      } else {
        setDevices(data);
        if (
          selected &&
          !data.some(
            (device) => device.id == selected.id
          )
        ){
          setSelected(null);
          setCompliance(null);
          setComplianceError("");

        }
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load devices.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function selectDevice(device: Device) {
    setSelected(device);
    setDetailTab("software");
    setIssuedToken("");
    setCredentialError("");
    setCompliance(null);
    setComplianceError("");

    const currentUser = getCurrentUser();

    if (currentUser?.role === Role.USER) {
      return;
    }

    setComplianceLoading(true);

    try {
      const result = await apiClient<ComplianceResult>(
        `/devices/${device.id}/compliance`,
      );

      setCompliance(result);
    } catch (err) {
      setComplianceError(
        err instanceof ApiError
          ? err.message
          : "Could not load missing patch information.",
      );
    } finally {
      setComplianceLoading(false);
    }
  }

  function startCreate() {
    if (!isAdmin) return;

    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function startEdit(device: Device) {
    if (!isAdmin) return;

    setEditingId(device.id);
    setForm({
      hostname: device.hostname,
      operatingSystem: device.operatingSystem,
      ipAddress: device.ipAddress ?? "",
      department: device.department ?? "",
      status: device.status,
      ownerId: device.owner?.id ?? "",
    });
    setFormError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) return;

    setSaving(true);
    setFormError("");

    try {
      const body = JSON.stringify({
        hostname: form.hostname,
        operatingSystem: form.operatingSystem,
        ipAddress: form.ipAddress || undefined,
        department: form.department || undefined,
        status: form.status,
        ownerId: form.ownerId || undefined,
      });

      if (editingId) {
        await apiClient(`/devices/${editingId}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiClient("/devices", {
          method: "POST",
          body,
        });
      }

      setEditingId(null);
      setForm(emptyForm);
      await loadDevices();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not save the device.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeDevice(device: Device) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${device.hostname}"?`,
    );

    if (!confirmed) return;

    try {
      await apiClient(`/devices/${device.id}`, {
        method: "DELETE",
      });

      if (selected?.id === device.id) {
        setSelected(null);
        setCompliance(null);
      }

      await loadDevices();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not delete the device.",
      );
    }
  }

  async function issueCredential() {
    if (!selected || !isAdmin) return;
    setIssuingCredential(true);
    setCredentialError("");
    setIssuedToken("");
    try {
      const result = await apiClient<{ token: string }>(`/agent/devices/${selected.id}/credentials`, { method: "POST" });
      setIssuedToken(result.token);
    } catch (err) {
      setCredentialError(err instanceof ApiError ? err.message : "Could not issue an agent credential.");
    } finally {
      setIssuingCredential(false);
    }
  }

  function statusLabel(status: Device["status"]) {
    if (status === "ONLINE") return "Online";
    if (status === "NEEDS_ATTENTION") return "Needs attention";
    return "Offline";
  }

  function softwareIsUpToDate(item: InstalledSoftware) {
    return (
      Boolean(item.software.currentVersion) &&
      item.version === item.software.currentVersion
    );
  }

  return (
    <section className={styles.page} aria-label="Device inventory">
      <section className="dataPanel">
        <div className="dataHead">
          <div>
            <h2>Device inventory</h2>
            <p>Review devices, owners, agent status, and patch compliance.</p>
          </div>
          {isAdmin && (
            <button type="button" className="primary" onClick={startCreate}>
              ＋ Add device
            </button>
          )}
        </div>
        <form
          className={styles.filters}
          onSubmit={(event) => {
            event.preventDefault();
            void loadDevices();
          }}
        >
          <ModuleSearchField
            ariaLabel="Search devices"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search hostname, owner, department, or IP..."
          />

          <button className="primary" type="submit">
            Search
          </button>

          <DashboardActionButton
            onClick={() => {
              setQuery("");
              setSelected(null);
              setCompliance(null);
              setComplianceError("");
              void loadDevices("");
            }}
          >
            Reset
          </DashboardActionButton>
        </form>

        {error && (
          <div className={styles.error} role="alert">
            <b>Error</b>
            <p>{error}</p>
          </div>
        )}

        {loading && <ModuleTableLoading module="devices" />}

        {!loading && !error && devices.length === 0 && (
          <div className="empty">No devices found.</div>
        )}

        {!loading && !error && devices.length > 0 && (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>HOSTNAME</th>
                  <th>OWNER</th>
                  <th>DEPARTMENT</th>
                  <th>OPERATING SYSTEM</th>
                  <th>IP</th>
                  <th>STATUS</th>
                  <th>AGENT</th>
                  <th>HEARTBEAT</th>
                  {isAdmin && <th>ACTIONS</th>}
                </tr>
              </thead>

              <tbody>
                {devices.map((device) => (
                  <tr
                    key={device.id}
                    className={styles.selectableRow}
                    onClick={() => void selectDevice(device)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void selectDevice(device);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`View details for ${device.hostname}`}
                  >
                    <td>
                      <b>{device.hostname}</b>
                    </td>
                    <td>{device.owner?.name ?? "Unassigned"}</td>
                    <td>{device.department ?? "—"}</td>
                    <td>{device.operatingSystem}</td>
                    <td>{device.ipAddress ?? "—"}</td>
                    <td>
                      <span
                        className={`deviceState ${device.status.toLowerCase()}`}
                      >
                        {statusLabel(device.status)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`deviceState ${
                          getAgentState(device.agentStatus) === "CONNECTED"
                            ? "online"
                            : "offline"
                        }`}
                      >
                        {formatAgentState(
                          getAgentState(device.agentStatus),
                        )}
                      </span>
                    </td>

                    <td>
                      {device.agentStatus?.lastHeartbeatAt
                        ? new Date(
                            device.agentStatus.lastHeartbeatAt,
                          ).toLocaleString("en-US")
                        : "—"}
                    </td>

                    {isAdmin && (
                      <td onClick={(event) => event.stopPropagation()}>
                        <button type="button" className={styles.actionButton} onClick={() => startEdit(device)}>Edit</button>
                        <button type="button" className={styles.dangerButton} onClick={() => void removeDevice(device)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className={`dataPanel ${styles.formPanel}`}>
            <form className={styles.deviceForm} onSubmit={submit}>
              <h2>{editingId ? "Edit device" : "Add device"}</h2>

              {formError && <div className={styles.error} role="alert">{formError}</div>}

              <label>
                Hostname
                <input
                  value={form.hostname}
                  onChange={(event) =>
                    setForm({ ...form, hostname: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                Operating system
                <input
                  value={form.operatingSystem}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      operatingSystem: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                IP address
                <input
                  value={form.ipAddress}
                  onChange={(event) =>
                    setForm({ ...form, ipAddress: event.target.value })
                  }
                />
              </label>

              <label>
                Department
                <input
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                />
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as Device["status"],
                    })
                  }
                >
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="NEEDS_ATTENTION">
                    Needs attention
                  </option>
                </select>
              </label>

              <label>
                Owner ID
                <input
                  value={form.ownerId}
                  onChange={(event) =>
                    setForm({ ...form, ownerId: event.target.value })
                  }
                  placeholder="Owner UUID (optional)"
                />
              </label>

              <button className="primary" disabled={saving}>
                {saving ? "Saving..." : "Save device"}
              </button>
            </form>
        </section>
      )}

      {selected && (
        <section className={`dataPanel ${styles.detailPanel}`}>
          <h2>Device details</h2>

          <p>
            <b>Hostname:</b> {selected.hostname}
          </p>
          <p>
            <b>Owner:</b> {selected.owner?.name ?? "Unassigned"}
          </p>
          <p>
            <b>Operating system:</b> {selected.operatingSystem}
          </p>
          <p>
            <b>Department:</b> {selected.department ?? "—"}
          </p>
          <p>
            <b>IP address:</b> {selected.ipAddress ?? "—"}
          </p>
          <p>
            <b>Status:</b> {statusLabel(selected.status)}
          </p>
          {compliance?.missingPatches.some(patch => patch.severity === "HIGH" || patch.severity === "CRITICAL") && (
            <p className={styles.attentionMessage} role="status">
              <span className={`${styles.complianceBadge} ${styles.critical}`}>NEEDS_ATTENTION</span>{" "}
              High or critical catalog patches may apply to this device.
            </p>
          )}

          <p>
            <b>Agent:</b>{" "}
            {formatAgentState(
              getAgentState(selected.agentStatus),
            )}
          </p>

          <p>
            <b>Agent version:</b>{" "}
            {selected.agentStatus?.version ?? "—"}
          </p>

          <p>
            <b>Last heartbeat:</b>{" "}
            {selected.agentStatus?.lastHeartbeatAt
              ? new Date(
                  selected.agentStatus.lastHeartbeatAt,
                ).toLocaleString("en-US")
              : "—"}
          </p>

          <p>
            <b>Last scan:</b>{" "}
            {selected.agentStatus?.lastScanAt
              ? new Date(
                  selected.agentStatus.lastScanAt,
                ).toLocaleString("en-US")
              : "—"}
          </p>

          <div className={styles.detailSection}>
            <h3>Windows Update scan</h3>
            <p className={styles.observationNote}>
              These findings are read-only observations from the Windows agent. They do not install updates or change device inventory.
            </p>
            <ScanResult status={selected.agentStatus} />
            {isAdmin && (
              <div className={styles.credentialArea}>
                <button type="button" className="primary" onClick={() => void issueCredential()} disabled={issuingCredential}>
                  {issuingCredential ? "Issuing credential..." : "Rotate agent credential"}
                </button>
                {credentialError && <p className={styles.credentialError} role="alert">{credentialError}</p>}
                {issuedToken && (
                  <div className={styles.tokenNotice} role="status">
                    <b>Copy this credential now.</b> It is shown only once and replaces the previous credential.
                    <code>{issuedToken}</code>
                  </div>
                )}
              </div>
            )}
            {canPropose && (
              <button type="button" className="primary" onClick={() => router.push(`/deployment-plans?deviceId=${encodeURIComponent(selected.id)}`)}>
                Create proposal for this device
              </button>
            )}
          </div>

          <div className={styles.detailTabs} role="tablist" aria-label="Device inventory details">
            <button type="button" role="tab" aria-selected={detailTab === "software"} onClick={() => setDetailTab("software")}>Installed software</button>
            <button type="button" role="tab" aria-selected={detailTab === "patches"} onClick={() => setDetailTab("patches")}>Missing catalog patches</button>
          </div>

          {detailTab === "software" && <div className={styles.detailSection}>
            <h3>Installed software</h3>

            {!selected.installedSoftware?.length ? (
              <p>No installed software data is available for this device.</p>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>SOFTWARE</th>
                      <th>VENDOR</th>
                      <th>INSTALLED VERSION</th>
                      <th>CURRENT VERSION</th>
                      <th>COMPLIANCE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selected.installedSoftware.map((item) => {
                      const upToDate = softwareIsUpToDate(item);

                      return (
                        <tr key={item.id}>
                          <td>{item.software.name}</td>
                          <td>{item.software.vendor}</td>
                          <td>{item.version}</td>
                          <td>{item.software.currentVersion ?? "—"}</td>
                          <td>
                            <span className={`${styles.complianceBadge} ${upToDate ? styles.compliant : styles.nonCompliant}`}>
                              {upToDate ? "Up to date" : "Needs update"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>}

          {detailTab === "patches" && <div className={styles.detailSection}>
            <h3>Missing patches</h3>
            <p>Catalog estimates based on installed versions; separate from Windows Update observations.</p>

            {complianceLoading && <p>Checking patch compliance...</p>}

            {complianceError && (
              <div className={styles.error} role="alert">
                <b>Error</b>
                <p>{complianceError}</p>
              </div>
            )}

            {!complianceLoading &&
              !complianceError &&
              compliance &&
              compliance.missingPatches.length === 0 && (
                <p className={styles.successMessage}>
                  This device has no missing patches.
                </p>
              )}

            {!complianceLoading &&
              !complianceError &&
              compliance &&
              compliance.missingPatches.length > 0 && (
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SOFTWARE</th>
                        <th>INSTALLED VERSION</th>
                        <th>CURRENT VERSION</th>
                        <th>PATCH CODE</th>
                        <th>SEVERITY</th>
                        <th>RESTART REQUIRED</th>
                      </tr>
                    </thead>

                    <tbody>
                      {compliance.missingPatches.map((patch) => (
                        <tr key={patch.patchId}>
                          <td>
                            <b>{patch.softwareName}</b>
                            <br />
                            <small>{patch.vendor}</small>
                          </td>

                          <td>{patch.installedVersion}</td>
                          <td>{patch.currentVersion}</td>

                          <td>
                            <b>{patch.patchCode}</b>
                            <br />
                            <small>{patch.title}</small>
                          </td>

                          <td>
                            <span className={`${styles.severity} ${styles[patch.severity.toLowerCase()]}`}>
                              {patch.severity}
                            </span>
                          </td>

                          <td>
                            {patch.requiresRestart ? "Yes" : "No"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>}
        </section>
      )}
    </section>
  );
  }

function getAgentState(
  agentStatus: AgentStatus | null | undefined,
) {
  if (!agentStatus) {
    return "NOT_INSTALLED" as const;
  }

  if (!agentStatus.isConnected || !agentStatus.lastHeartbeatAt) {
    return "OFFLINE" as const;
  }

  const heartbeatTime = new Date(
    agentStatus.lastHeartbeatAt,
  ).getTime();

  if (Number.isNaN(heartbeatTime)) {
    return "OFFLINE" as const;
  }

  return Date.now() - heartbeatTime <= HEARTBEAT_TIMEOUT_MS
    ? ("CONNECTED" as const)
    : ("OFFLINE" as const);
}

function formatAgentState(
  state: ReturnType<typeof getAgentState>,
) {
  if (state === "CONNECTED") return "Connected";
  if (state === "NOT_INSTALLED") return "Not installed";
  return "Offline";
}

function ScanResult({ status }: { status: AgentStatus | null | undefined }) {
  const result = parseScanResult(status?.lastScanResult);
  if (!result) return <p>No Windows Update scan has been reported by this device.</p>;
  if (result.outcome === AgentScanOutcome.ERROR) {
    return <p className={styles.scanError}>Last scan failed: {result.error ?? "No diagnostic was provided."}</p>;
  }
  if (result.outcome === AgentScanOutcome.NO_UPDATES) {
    return <p className={styles.successMessage}>No available Windows software updates were reported at {formatScanDate(result.completedAt)}.</p>;
  }
  return (
    <>
      <p>{result.updates.length} available Windows software update{result.updates.length === 1 ? "" : "s"} reported at {formatScanDate(result.completedAt)}.</p>
      <div className="tableWrap">
        <table>
          <thead><tr><th>TITLE</th><th>KB ARTICLES</th><th>RESTART</th></tr></thead>
          <tbody>{result.updates.map((update) => <tr key={update.updateId}><td>{update.title}</td><td>{update.kbArticleIds.join(", ") || "—"}</td><td>{update.rebootRequired ? "Required" : "Not required"}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

function formatScanDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "an unknown time" : parsed.toLocaleString("en-US");
}

function parseScanResult(value: unknown): AgentScanResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<AgentScanResult>;
  if (!Object.values(AgentScanOutcome).includes(candidate.outcome as AgentScanOutcome) || typeof candidate.completedAt !== "string" || !Array.isArray(candidate.updates)) return null;
  return candidate as AgentScanResult;
}
