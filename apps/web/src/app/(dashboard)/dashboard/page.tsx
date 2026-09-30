"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@patch-management/shared";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";

type Device = {
  id: string;
  hostname: string;
  operatingSystem: string;
  department?: string | null;
  status: "ONLINE" | "OFFLINE" | "NEEDS_ATTENTION";
  owner?: { name: string } | null;
  installedSoftware?: unknown[];
  agentStatus?: { lastScanAt?: string | null } | null;
};
type Patch = { id: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" };
type Plan = { id: string; name: string; scheduledAt?: string | null; status: string };

const statusLabels: Record<Device["status"], string> = {
  ONLINE: "Online", OFFLINE: "Offline", NEEDS_ATTENTION: "Needs attention",
};

export default function DashboardPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [selected, setSelected] = useState<Device | null>(null);
  const [pending, setPending] = useState({ devices: true, patches: true, plans: true });
  const [ready, setReady] = useState({ devices: false, patches: false, plans: false });
  const [error, setError] = useState("");
  const isUser = getCurrentUser()?.role === Role.USER;
  const refreshing = pending.devices || pending.patches || pending.plans;

  async function loadData() {
    setPending({ devices: true, patches: true, plans: !isUser });
    setError("");
    const fail = (section: string, cause: unknown) => {
      const message = cause instanceof Error ? cause.message : "Request failed";
      setError(current => `${current ? `${current} ` : ""}${section}: ${message}.`);
    };
    await Promise.all([
      apiClient<Device[]>(isUser ? "/devices/me" : "/devices")
        .then(data => {
          setDevices(data);
          setSelected(current => data.find(device => device.id === current?.id) ?? null);
          setReady(current => ({ ...current, devices: true }));
        })
        .catch(cause => fail("Devices", cause))
        .finally(() => setPending(current => ({ ...current, devices: false }))),
      apiClient<Patch[]>("/patches")
        .then(data => {
          setPatches(data);
          setReady(current => ({ ...current, patches: true }));
        })
        .catch(cause => fail("Patches", cause))
        .finally(() => setPending(current => ({ ...current, patches: false }))),
      isUser ? Promise.resolve() : apiClient<Plan[]>("/deployment-plans")
        .then(data => {
          setPlans(data);
          setReady(current => ({ ...current, plans: true }));
        })
        .catch(cause => fail("Plans", cause))
        .finally(() => setPending(current => ({ ...current, plans: false }))),
    ]);
  }

  useEffect(() => { void loadData(); }, []);

  const departments = useMemo(() => Array.from(new Set(devices.map(device => device.department).filter((value): value is string => Boolean(value)))).sort(), [devices]);
  const filtered = useMemo(() => devices.filter(device =>
    (status === "ALL" || device.status === status) &&
    (department === "ALL" || device.department === department) &&
    `${device.hostname} ${device.department ?? ""} ${device.operatingSystem}`.toLowerCase().includes(query.toLowerCase())
  ), [devices, query, status, department]);
  const counts = {
    online: devices.filter(device => device.status === "ONLINE").length,
    offline: devices.filter(device => device.status === "OFFLINE").length,
    attention: devices.filter(device => device.status === "NEEDS_ATTENTION").length,
    critical: patches.filter(patch => patch.severity === "CRITICAL").length,
    high: patches.filter(patch => patch.severity === "HIGH").length,
  };
  const onlineShare = ready.devices && devices.length ? counts.online / devices.length * 100 : 0;
  const assessedShare = ready.devices && devices.length ? (counts.online + counts.attention) / devices.length * 100 : 0;
  const upcoming = plans.filter(plan => plan.scheduledAt && new Date(plan.scheduledAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()).slice(0, 2);

  return <>
    <section className="scopeCard">
      <div className="scopeTitle"><span>ⓘ</span><p><b>Live assessment scope</b><small>Data from the connected database. Use the filters below to narrow the device list.</small></p></div>
      <div className="scopeFilters">
        <label>Department<select value={department} onChange={event => setDepartment(event.target.value)}><option value="ALL">All departments</option>{departments.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <DashboardActionButton onClick={() => void loadData()} disabled={refreshing}>Refresh data</DashboardActionButton>
      </div>
    </section>

    {error && <section className="dataPanel"><div className="panelMessage" role="alert">{error} <DashboardActionButton onClick={() => void loadData()} disabled={refreshing}>Retry</DashboardActionButton></div></section>}

      <section className="summaryGrid" aria-busy={refreshing}>
        <article className="summaryCard"><div className="cardHead"><h2>Device status</h2></div><div className="machineSummary"><div className="ring" style={{ background: `conic-gradient(var(--green) 0 ${onlineShare}%, var(--orange) ${onlineShare}% ${assessedShare}%, #a19f9d ${assessedShare}% 100%)` }}><div><b>{ready.devices ? devices.length : "—"}</b><small>Total devices</small></div></div><ul>
          <li><span className="legend healthy"/><p><b>{ready.devices ? counts.online : "—"}</b><small>Online</small></p></li>
          <li><span className="legend warning"/><p><b>{ready.devices ? counts.attention : "—"}</b><small>Needs attention</small></p></li>
          <li><span className="legend unknown"/><p><b>{ready.devices ? counts.offline : "—"}</b><small>Offline</small></p></li>
        </ul></div><button className="cardLink" onClick={() => router.push("/devices")}>View all devices →</button></article>

        <article className="summaryCard updateCard"><div className="cardHead"><h2>Cataloged patches</h2></div><div className="updateNumber"><span className="shield">♢</span><div><b>{ready.patches ? patches.length : "—"}</b><small>Total patches</small></div></div><div className="updateStats"><div><span className="criticalDot"/><b>{ready.patches ? counts.critical : "—"}</b><small>Critical</small></div><div><span className="securityDot"/><b>{ready.patches ? counts.high : "—"}</b><small>High</small></div><div><span className="otherDot"/><b>{ready.patches ? patches.length - counts.critical - counts.high : "—"}</b><small>Other</small></div></div><button className="cardLink" onClick={() => router.push("/patches")}>View patches →</button></article>

        <article className="summaryCard"><div className="cardHead"><h2>Upcoming maintenance</h2></div>{isUser ? <p className="cardMessage">Deployment plans are available to operations staff.</p> : !ready.plans ? <p className="cardMessage" role="status">{pending.plans ? "Loading plans..." : "Plans are unavailable."}</p> : upcoming.length ? upcoming.map(plan => <div className="schedule" key={plan.id}><div className="dateTile"><b>{new Date(plan.scheduledAt!).getDate()}</b><span>{new Date(plan.scheduledAt!).toLocaleString("en", { month: "short" }).toUpperCase()}</span></div><div><b>{plan.name}</b><p>{new Date(plan.scheduledAt!).toLocaleString()}</p><span className="planned">{plan.status.replaceAll("_", " ")}</span></div></div>) : <p className="cardMessage">No upcoming plans in the database.</p>}{!isUser && <button className="cardLink" onClick={() => router.push("/deployment-plans")}>View deployment plans →</button>}</article>
      </section>

      <section className="dataPanel" aria-busy={pending.devices}><div className="dataHead"><div><h2>Devices</h2><p>Live device inventory and agent assessment status.</p></div></div>
        <div className="tableTools"><label><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by device name, department, or operating system" /></label><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><DashboardActionButton onClick={() => { setQuery(""); setStatus("ALL"); setDepartment("ALL"); }}>Reset</DashboardActionButton></div>
        <div className="tableWrap"><table><thead><tr><th>DEVICE NAME</th><th>DEPARTMENT</th><th>OPERATING SYSTEM</th><th>OWNER</th><th>STATUS</th><th>INSTALLED SOFTWARE</th><th>LAST SCAN</th></tr></thead><tbody>{filtered.map(device => <tr key={device.id} onClick={() => setSelected(device)}><td><button className="machineName" type="button">▣ {device.hostname}</button></td><td>{device.department ?? "—"}</td><td>{device.operatingSystem}</td><td>{device.owner?.name ?? "—"}</td><td><span className={`compliance ${device.status === "ONLINE" ? "ok" : device.status === "NEEDS_ATTENTION" ? "miss" : "na"}`}><i />{statusLabels[device.status]}</span></td><td>{device.installedSoftware?.length ?? 0}</td><td>{device.agentStatus?.lastScanAt ? new Date(device.agentStatus.lastScanAt).toLocaleString() : "Not assessed"}</td></tr>)}</tbody></table>{!ready.devices ? <div className="empty" role="status">{pending.devices ? "Loading devices..." : "Devices are unavailable."}</div> : filtered.length === 0 && <div className="empty">{devices.length ? "No devices match the current filters." : "No devices exist in the database."}</div>}</div>
        <div className="tableFoot"><span>Showing {ready.devices ? filtered.length : "—"} of {ready.devices ? devices.length : "—"} devices</span></div>
      </section>
    {selected && <div className="drawerBackdrop" onClick={() => setSelected(null)}><aside className="drawer" onClick={event => event.stopPropagation()}><div className="drawerHead"><div><small>DEVICE DETAILS</small><h2>▣ {selected.hostname}</h2></div><button type="button" aria-label="Close device details" onClick={() => setSelected(null)}>×</button></div><div className="drawerStatus"><span className={`compliance ${selected.status === "ONLINE" ? "ok" : selected.status === "NEEDS_ATTENTION" ? "miss" : "na"}`}><i />{statusLabels[selected.status]}</span><p>Last assessed: {selected.agentStatus?.lastScanAt ? new Date(selected.agentStatus.lastScanAt).toLocaleString() : "Not assessed"}</p></div><dl><div><dt>Department</dt><dd>{selected.department ?? "—"}</dd></div><div><dt>Operating system</dt><dd>{selected.operatingSystem}</dd></div><div><dt>Owner</dt><dd>{selected.owner?.name ?? "—"}</dd></div><div><dt>Installed software</dt><dd>{selected.installedSoftware?.length ?? 0}</dd></div></dl><button className="drawerAction" type="button" onClick={() => router.push("/devices")}>Open device inventory</button></aside></div>}
  </>;
}
