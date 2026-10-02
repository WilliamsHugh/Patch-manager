"use client";

import { LiveModuleTable } from "@/components/ui/live-module-table";

type Ticket = { id: string; title: string; priority: string; status: string; createdAt: string; createdBy?: { name: string } };
const columns = [
  { label: "TITLE", value: (ticket: Ticket) => ticket.title },
  { label: "CREATED BY", value: (ticket: Ticket) => ticket.createdBy?.name ?? "" },
  { label: "PRIORITY", value: (ticket: Ticket) => ticket.priority },
  { label: "STATUS", value: (ticket: Ticket) => ticket.status.replaceAll("_", " ") },
  { label: "CREATED", value: (ticket: Ticket) => new Date(ticket.createdAt).toLocaleString() },
];

export default function TicketsPage() {
  return <LiveModuleTable<Ticket> title="Tickets" description="Support requests from the connected database." endpoint="/tickets" columns={columns} loadingModule="tickets" />;
}
