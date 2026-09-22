"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Machine = {
  name: string; group: string; os: string; type: string; status: "Up to date" | "Missing patches" | "Not assessed"; updates: number; checked: string;
};

const machines: Machine[] = [
  { name: "ACC-PC-012", group: "rg-accounting", os: "Windows 11 Pro", type: "Azure Arc", status: "Missing patches", updates: 4, checked: "10 minutes ago" },
  { name: "DEV-WS-028", group: "rg-engineering", os: "Windows 11 Pro", type: "Azure VM", status: "Up to date", updates: 0, checked: "18 minutes ago" },
  { name: "HR-LAP-007", group: "rg-human-resources", os: "Windows 10 Pro", type: "Azure Arc", status: "Missing patches", updates: 2, checked: "34 minutes ago" },
  { name: "SRV-APP-01", group: "rg-servers", os: "Ubuntu 22.04 LTS", type: "Azure VM", status: "Up to date", updates: 0, checked: "1 hour ago" },
  { name: "MKT-PC-021", group: "rg-marketing", os: "Windows 11 Pro", type: "Azure Arc", status: "Not assessed", updates: 0, checked: "No data" },
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<Machine | null>(null);
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => machines.filter(machine =>
    (status === "All statuses" || machine.status === status) &&
    `${machine.name} ${machine.group} ${machine.os}`.toLowerCase().includes(query.toLowerCase())
  ), [query, status]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <>
          <section className="scopeCard">
            <div className="scopeTitle"><span>ⓘ</span><p><b>Assessment scope</b><small>Aggregated data for the selected resource scope.</small></p></div>
            <div className="scopeFilters"><label>Subscription<select><option>All subscriptions</option><option>PT-TKHT Subscription</option></select></label><label>Resource group<select><option>All resource groups</option><option>rg-accounting</option><option>rg-engineering</option></select></label><label>Machine type<select><option>All machine types</option><option>Azure VM</option><option>Azure Arc</option></select></label><button onClick={() => notify("New scope applied")}>Apply</button></div>
          </section>

          <section className="summaryGrid">
            <article className="summaryCard"><div className="cardHead"><h2>Machine status</h2><button>•••</button></div><div className="machineSummary"><div className="ring"><div><b>128</b><small>Total machines</small></div></div><ul><li><span className="legend healthy"/><p><b>96</b><small>Up to date</small></p><em>75%</em></li><li><span className="legend warning"/><p><b>24</b><small>Missing patches</small></p><em>19%</em></li><li><span className="legend unknown"/><p><b>8</b><small>Not assessed</small></p><em>6%</em></li></ul></div><button className="cardLink" onClick={() => router.push("/devices")}>View all machines →</button></article>

            <article className="summaryCard updateCard"><div className="cardHead"><div><h2>Available updates</h2><p>Last assessed: 10 minutes ago</p></div><button>•••</button></div><div className="updateNumber"><span className="shield">♢</span><div><b>31</b><small>Pending updates</small></div></div><div className="updateStats"><div><span className="criticalDot"/><b>3</b><small>Critical</small></div><div><span className="securityDot"/><b>12</b><small>Security</small></div><div><span className="otherDot"/><b>16</b><small>Other</small></div></div><button className="cardLink" onClick={() => router.push("/patches")}>View updates →</button></article>

            <article className="summaryCard"><div className="cardHead"><div><h2>Upcoming maintenance</h2><p>Within the next 7 days</p></div><button>•••</button></div><div className="schedule"><div className="dateTile"><b>26</b><span>AUG</span></div><div><b>August Windows Update</b><p>21:00 – 23:00 · Office division</p><span className="approved">Approved</span></div></div><div className="schedule second"><div className="dateTile"><b>29</b><span>AUG</span></div><div><b>Linux server patching</b><p>22:00 – 23:30 · 12 machines</p><span className="planned">Scheduled</span></div></div><button className="cardLink">View maintenance configuration →</button></article>
          </section>

          <section className="dataPanel">
            <div className="dataHead"><div><h2>Machines requiring attention</h2><p>Machines with missing updates or no recent assessment.</p></div><button className="primary" onClick={() => notify("Starting a new deployment schedule")}>＋ Schedule updates</button></div>
            <div className="tableTools"><label><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by machine name or resource group" /></label><select value={status} onChange={e => setStatus(e.target.value)}><option>All statuses</option><option>Up to date</option><option>Missing patches</option><option>Not assessed</option></select><button onClick={() => {setQuery("");setStatus("All statuses")}}>⟳ Reset</button></div>
            <div className="tableWrap"><table><thead><tr><th><input type="checkbox" aria-label="Select all" /></th><th>MACHINE NAME ↕</th><th>RESOURCE GROUP</th><th>OPERATING SYSTEM</th><th>TYPE</th><th>STATUS</th><th>MISSING PATCHES</th><th>LAST ASSESSED</th></tr></thead><tbody>{filtered.map(machine => <tr key={machine.name} onClick={() => setSelected(machine)}><td onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${machine.name}`} /></td><td><button className="machineName">▣ {machine.name}</button></td><td>{machine.group}</td><td>{machine.os}</td><td>{machine.type}</td><td><span className={`compliance ${machine.status === "Up to date" ? "ok" : machine.status === "Missing patches" ? "miss" : "na"}`}><i />{machine.status}</span></td><td className={machine.updates ? "updateCount" : ""}>{machine.updates || "—"}</td><td>{machine.checked}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No machines match the current filters.</div>}</div>
            <div className="tableFoot"><span>Showing {filtered.length} of {machines.length} machines</span><div><button disabled>‹</button><b>1</b><button disabled>›</button></div></div>
          </section>
      {selected && <div className="drawerBackdrop" onClick={() => setSelected(null)}><aside className="drawer" onClick={e => e.stopPropagation()}><div className="drawerHead"><div><small>MACHINE DETAILS</small><h2>▣ {selected.name}</h2></div><button onClick={() => setSelected(null)}>×</button></div><div className="drawerStatus"><span className={`compliance ${selected.status === "Up to date" ? "ok" : selected.status === "Missing patches" ? "miss" : "na"}`}><i />{selected.status}</span><p>Last assessed: {selected.checked}</p></div><dl><div><dt>Resource group</dt><dd>{selected.group}</dd></div><div><dt>Operating system</dt><dd>{selected.os}</dd></div><div><dt>Resource type</dt><dd>{selected.type}</dd></div><div><dt>Missing updates</dt><dd>{selected.updates}</dd></div></dl><h3>Quick actions</h3><button className="drawerAction primary" onClick={() => notify(`Assessing ${selected.name}`)}>↻ Assess now</button><button className="drawerAction" onClick={() => notify(`${selected.name} added to the update schedule`)}>◷ Schedule updates</button><div className="infoBox">ⓘ Deployment can begin only after a Manager approves the plan.</div></aside></div>}
      <div className={`toast ${toast ? "show" : ""}`}>✓ {toast}</div>
    </>
  );
}
