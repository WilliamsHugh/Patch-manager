import planStyles from "@/app/(dashboard)/deployment-plans/deployment-plans.module.css";
import securityStyles from "@/app/(dashboard)/security-inventory/security-inventory.module.css";
import { ModuleTableLoading, type LoadingModule } from "@/components/ui/module-table-loading";
import { ModuleSearchField } from "@/components/ui/module-search-field";

const columns: Record<string, string[]> = {
  "/security-inventory": ["CVE / PATCH CODE", "TITLE", "SOFTWARE", "SEVERITY", "TARGET VERSION", "AFFECTED DEVICES"],
};

const headings: Record<string, { title: string; description?: string }> = {
  "/users": { title: "User accounts", description: "Administrators can create accounts, assign roles, and manage access." },
  "/software": { title: "Software catalog", description: "Manage software names, vendors, and current versions." },
  "/patches": { title: "Patch list", description: "Manage patches, severity, and affected software." },
  "/security-inventory": { title: "Risk filters", description: "Find patches by CVE reference, software, or severity." },
  "/devices": { title: "Device inventory", description: "Review devices, owners, agent status, and patch compliance." },
  "/deployment-plans": { title: "Deployment plans" },
  "/tickets": { title: "Tickets", description: "Support requests from the connected database." },
  "/reports": { title: "Reports overview", description: "Current operational totals from the connected database." },
  "/policies": { title: "Policies", description: "Update policies from the connected database." },
  "/audit-logs": { title: "Audit Logs", description: "Recent system activity from the connected database." },
  "/profile": { title: "Account details" },
};

function DashboardPreview() {
  return <>
    <section className="scopeCard" aria-busy="true">
      <div className="scopeTitle"><span>ⓘ</span><p><b>Live assessment scope</b><small>Data from the connected database. Use the filters below to narrow the device list.</small></p></div>
      <div className="scopeFilters"><label>Department<select disabled><option>All departments</option></select></label><button className="dashboardActionButton" disabled>Refresh data</button></div>
    </section>

    <section className="summaryGrid" aria-busy="true">
      <article className="summaryCard"><div className="cardHead"><h2>Device status</h2></div><div className="machineSummary"><div className="ring" style={{ background: "#edebe9" }}><div><b>—</b><small>Total devices</small></div></div><ul><li><span className="legend healthy"/><p><b>—</b><small>Online</small></p></li><li><span className="legend warning"/><p><b>—</b><small>Needs attention</small></p></li><li><span className="legend unknown"/><p><b>—</b><small>Offline</small></p></li></ul></div><button className="cardLink" disabled>View all devices →</button></article>
      <article className="summaryCard updateCard"><div className="cardHead"><h2>Cataloged patches</h2></div><div className="updateNumber"><span className="shield">♢</span><div><b>—</b><small>Total patches</small></div></div><div className="updateStats"><div><span className="criticalDot"/><b>—</b><small>Critical</small></div><div><span className="securityDot"/><b>—</b><small>High</small></div><div><span className="otherDot"/><b>—</b><small>Other</small></div></div><button className="cardLink" disabled>View patches →</button></article>
      <article className="summaryCard"><div className="cardHead"><h2>Upcoming maintenance</h2></div><p className="cardMessage">Loading plans...</p><button className="cardLink" disabled>View deployment plans →</button></article>
    </section>

    <section className="dataPanel" aria-busy="true"><div className="dataHead"><div><h2>Devices</h2><p>Live device inventory and agent assessment status.</p></div></div><div className="tableTools"><ModuleSearchField ariaLabel="Search dashboard devices" disabled placeholder="Search by device name, department, or operating system" /><select disabled><option>All statuses</option></select><button className="dashboardActionButton" disabled>Reset</button></div><div className="tableWrap"><table><thead><tr>{["DEVICE NAME", "DEPARTMENT", "OPERATING SYSTEM", "OWNER", "STATUS", "INSTALLED SOFTWARE", "LAST SCAN"].map(column => <th key={column}>{column}</th>)}</tr></thead></table><p className="panelMessage">Loading devices...</p></div><div className="tableFoot"><span>Showing — of — devices</span></div></section>
  </>;
}

function SecurityInventoryPreview() {
  return <section className={securityStyles.page} data-route-preview="/security-inventory" role="status" aria-label="Loading security risk inventory" aria-busy="true">
    <section className="dataPanel"><div className="dataHead"><div><h2>Risk filters</h2><p>Find patches by CVE reference, software, or severity.</p></div></div><div className={securityStyles.filters}><ModuleSearchField ariaLabel="Search risk inventory" disabled placeholder="Search CVE, patch title, or software..." /><select disabled aria-label="Filter by severity"><option>All severities</option></select><button className="primary" disabled>Apply</button><button className="dashboardActionButton" disabled>Reset</button></div></section>
    <section className={securityStyles.summary} aria-label="Risk overview"><article><span>Total patches</span><strong>—</strong></article><article className={securityStyles.summaryCritical}><span>Critical</span><strong>—</strong></article><article className={securityStyles.summaryHigh}><span>High</span><strong>—</strong></article><article className={securityStyles.summaryMedium}><span>Medium</span><strong>—</strong></article><article className={securityStyles.summaryDevices}><span>Affected devices</span><strong>—</strong></article></section>
    <section className="dataPanel"><div className="dataHead"><div><h2>Patch risk inventory</h2><p>Review affected software and devices.</p></div></div><div className={securityStyles.tableWrap}><table><thead><tr>{columns["/security-inventory"].map(column => <th key={column}>{column}</th>)}</tr></thead></table><p className="panelMessage">Loading security risks...</p></div></section>
  </section>;
}

function DeploymentPlansPreview() {
  return <div className={planStyles.page} data-route-preview="/deployment-plans" role="status" aria-label="Loading deployment plans" aria-busy="true">
    <section className={planStyles.metrics} aria-label="Plan overview"><div><span>All</span><b>—</b></div><div><span>Draft</span><b>—</b></div><div><span>Pending approval</span><b>—</b></div></section>
    <section className={planStyles.panel}><div className={planStyles.toolbar}><ModuleSearchField ariaLabel="Search deployment plans" disabled placeholder="Plan name or creator" /><label><span>Status</span><select disabled><option>All</option></select></label><button className="dashboardActionButton" disabled>Reset</button></div><div className={planStyles.contentGrid}><div className={planStyles.listPane}><div className={planStyles.state}>Loading deployment plans...</div></div><aside className={planStyles.detailPane}><div className={planStyles.state}>Select a plan to view its details.</div></aside></div></section>
  </div>;
}

function ReportsPreview() {
  return <section className="dataPanel modulePanel" data-route-preview="/reports" role="status" aria-label="Loading reports" aria-busy="true">
    <div className="dataHead"><div><h2>Reports overview</h2><p>Current operational totals from the connected database.</p></div><button className="dashboardActionButton" disabled>Refresh data</button></div>
    <div className="tableWrap"><table><thead><tr><th>METRIC</th><th>CURRENT VALUE</th></tr></thead><tbody>{["Total devices", "Devices needing attention", "Plans pending approval", "Failed deployment tasks", "Open or in-progress tickets"].map(label => <tr key={label}><td>{label}</td><td>—</td></tr>)}</tbody></table></div>
  </section>;
}

function PatchesPreview() {
  return <section className="dataPanel modulePanel" data-route-preview="/patches" role="status" aria-label="Loading patches" aria-busy="true">
    <div className="dataHead"><div><h2>Patch list</h2><p>Manage patches, severity, and affected software.</p></div></div>
    <div className="tableTools"><ModuleSearchField ariaLabel="Search patches" disabled placeholder="Search code, title, or software..." /><select disabled><option>All severities</option></select><select disabled><option>All software</option></select><button className="dashboardActionButton" disabled>Reset</button></div>
    <ModuleTableLoading module="patches" />
  </section>;
}

export function RouteContentPreview({ path }: { path: string }) {
  if (path === "/dashboard") {
    return <div data-route-preview={path} role="status" aria-label="Loading dashboard"><DashboardPreview /></div>;
  }
  if (path === "/security-inventory") return <SecurityInventoryPreview />;
  if (path === "/deployment-plans") return <DeploymentPlansPreview />;
  if (path === "/reports") return <ReportsPreview />;
  if (path === "/patches") return <PatchesPreview />;

  const route = Object.keys(headings).find(key => path === key || path.startsWith(`${key}/`)) ?? "/reports";
  const { title, description } = headings[route];
  if (route === "/profile") {
    return <section className="profilePage" data-route-preview={path} role="status" aria-label="Loading profile" aria-busy="true">
      <div className="profileHero"><span className="profileAvatar">—</span><div><h2>Account details</h2><p>Loading profile...</p></div></div>
      <div className="profileGrid"><article className="profileCard"><h3>Account information</h3><dl><div><dt>Full name</dt><dd>—</dd></div><div><dt>Email</dt><dd>—</dd></div><div><dt>Role</dt><dd>—</dd></div><div><dt>Account ID</dt><dd>—</dd></div></dl></article><article className="profileCard"><h3>Assigned devices</h3><p className="profileEmpty">Loading devices...</p></article></div>
    </section>;
  }

  return <section className="dataPanel modulePanel" data-route-preview={path} role="status" aria-label={`Loading ${title}`} aria-busy="true">
    <div className="dataHead"><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>
    {route !== "/reports" && <div className="tableTools"><ModuleSearchField ariaLabel={`Search ${title.toLowerCase()}`} disabled placeholder={`Search ${title.toLowerCase()}...`} /><button className="dashboardActionButton" disabled>Reset</button></div>}
    <ModuleTableLoading module={route.slice(1) as LoadingModule} />
  </section>;
}
