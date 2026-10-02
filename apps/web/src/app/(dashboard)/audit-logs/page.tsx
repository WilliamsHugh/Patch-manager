"use client";

import { LiveModuleTable } from "@/components/ui/live-module-table";

type AuditLog = { id: string; createdAt: string; action: string; entityType: string; entityId?: string | null; user?: { name: string } | null };
const columns = [
  { label: "TIME", value: (entry: AuditLog) => new Date(entry.createdAt).toLocaleString() },
  { label: "ACTOR", value: (entry: AuditLog) => entry.user?.name ?? "System" },
  { label: "ACTION", value: (entry: AuditLog) => entry.action.replaceAll("_", " ") },
  { label: "ENTITY", value: (entry: AuditLog) => `${entry.entityType}${entry.entityId ? ` · ${entry.entityId}` : ""}` },
];

export default function AuditLogsPage() {
  return <LiveModuleTable<AuditLog> title="Audit Logs" description="Recent system activity from the connected database." endpoint="/audit-logs" columns={columns} loadingModule="audit-logs" />;
}
