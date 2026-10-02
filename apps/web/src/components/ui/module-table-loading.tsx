const moduleLoading = {
  users: { columns: ["FULL NAME", "EMAIL", "ROLE", "DEVICES", "STATUS"], message: "Loading user accounts..." },
  software: { columns: ["SOFTWARE NAME", "VENDOR", "VERSION", "PATCHES", "INSTALLATIONS"], message: "Loading software catalog..." },
  patches: { columns: ["PATCH CODE", "TITLE", "SOFTWARE", "SEVERITY", "VERSION", "RELEASE DATE", "RESTART", "ACTIONS"], message: "Loading patches..." },
  devices: { columns: ["HOSTNAME", "OWNER", "DEPARTMENT", "OPERATING SYSTEM", "IP", "STATUS", "AGENT", "HEARTBEAT"], message: "Loading devices..." },
  tickets: { columns: ["TITLE", "CREATED BY", "PRIORITY", "STATUS", "CREATED"], message: "Loading tickets..." },
  policies: { columns: ["POLICY NAME", "MAX DEFERRAL", "FORCE RESTART", "STATUS", "CONFIGURED BY"], message: "Loading policies..." },
  "audit-logs": { columns: ["TIME", "ACTOR", "ACTION", "ENTITY"], message: "Loading audit logs..." },
} satisfies Record<string, { columns: string[]; message: string }>;

export type LoadingModule = keyof typeof moduleLoading;

export function ModuleTableLoading({ module }: { module: LoadingModule }) {
  const { columns, message } = moduleLoading[module];
  return <div className="tableWrap" aria-busy="true">
    <table><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead></table>
    <p className="panelMessage" role="status">{message}</p>
  </div>;
}
