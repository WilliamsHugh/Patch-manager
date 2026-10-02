"use client";

import { LiveModuleTable } from "@/components/ui/live-module-table";

type Policy = { id: string; name: string; maxDeferralHours: number; forceRestart: boolean; isActive: boolean; configuredBy?: { name: string } };
const columns = [
  { label: "POLICY NAME", value: (policy: Policy) => policy.name },
  { label: "MAX DEFERRAL", value: (policy: Policy) => `${policy.maxDeferralHours} hours` },
  { label: "FORCE RESTART", value: (policy: Policy) => policy.forceRestart ? "Yes" : "No" },
  { label: "STATUS", value: (policy: Policy) => policy.isActive ? "Active" : "Inactive" },
  { label: "CONFIGURED BY", value: (policy: Policy) => policy.configuredBy?.name ?? "" },
];

export default function PoliciesPage() {
  return <LiveModuleTable<Policy> title="Policies" description="Update policies from the connected database." endpoint="/policies" columns={columns} loadingModule="policies" />;
}
