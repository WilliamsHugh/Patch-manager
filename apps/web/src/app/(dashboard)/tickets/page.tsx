"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TICKET_TRANSITIONS, PatchSeverity, Role, TicketStatus, type User } from "@patch-management/shared";
import { apiClient } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import styles from "./tickets.module.css";

type TicketComment = {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  priority: PatchSeverity;
  status: TicketStatus;
  createdAt: string;
  createdBy: User;
  assignedTo?: { id: string; name: string } | null;
  comments: TicketComment[];
};

type Assignable = { id: string; name: string; role: Role };

const operationRoles: Role[] = [Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK];
const statusOptions = ["ALL", ...Object.values(TicketStatus)] as const;
const emptyForm = { title: "", description: "", priority: PatchSeverity.MEDIUM as PatchSeverity };

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignables, setAssignables] = useState<Assignable[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("ALL");
  const [query, setQuery] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [comment, setComment] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOperations = user ? operationRoles.includes(user.role) : false;
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0] ?? null;

  useEffect(() => {
    setUser(getStoredUser());
    void loadData(false);
  }, []);

  async function loadData(assignedToMe: boolean) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<Ticket[]>(`/tickets${assignedToMe ? "?assignedToMe=true" : ""}`);
      setTickets(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
      if (isOperations || getStoredUser()?.role !== Role.USER) {
        void apiClient<Assignable[]>("/tickets/assignables").then(setAssignables).catch(() => setAssignables([]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tickets");
    } finally {
      setLoading(false);
    }
  }

  const filteredTickets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
      const matchesQuery =
        !normalized ||
        ticket.title.toLowerCase().includes(normalized) ||
        ticket.createdBy.name.toLowerCase().includes(normalized) ||
        (ticket.assignedTo?.name.toLowerCase().includes(normalized) ?? false);
      return matchesStatus && matchesQuery;
    });
  }, [tickets, query, statusFilter]);

  const totals = useMemo(
    () => ({
      all: tickets.length,
      open: tickets.filter((ticket) => ticket.status === TicketStatus.OPEN).length,
      inProgress: tickets.filter((ticket) => ticket.status === TicketStatus.IN_PROGRESS).length,
    }),
    [tickets],
  );

  function nextStatuses(ticket: Ticket): TicketStatus[] {
    return (TICKET_TRANSITIONS[ticket.status] ?? []) as TicketStatus[];
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiClient<Ticket>("/tickets", {
        method: "POST",
        body: JSON.stringify({ title: form.title, description: form.description, priority: form.priority }),
      });
      setTickets((current) => [created, ...current]);
      setSelectedId(created.id);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the ticket");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(ticket: Ticket, status: TicketStatus) {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient<Ticket>(`/tickets/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTickets((current) => current.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the ticket status");
    } finally {
      setSaving(false);
    }
  }

  async function assignTicket(ticket: Ticket, assignedToId: string) {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient<Ticket & { assignedTo?: { id: string; name: string } | null }>(`/tickets/${ticket.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      });
      setTickets((current) =>
        current.map((item) => (item.id === ticket.id ? { ...item, assignedTo: updated.assignedTo ?? null } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign the ticket");
    } finally {
      setSaving(false);
    }
  }

  async function submitComment(ticket: Ticket) {
    if (!comment.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await apiClient<TicketComment>(`/tickets/${ticket.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment.trim() }),
      });
      setTickets((current) =>
        current.map((item) => (item.id === ticket.id ? { ...item, comments: [...item.comments, created] } : item)),
      );
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add the comment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.metrics} aria-label="Ticket overview">
        <div>
          <span>All tickets</span>
          <b>{totals.all}</b>
        </div>
        <div>
          <span>Open</span>
          <b>{totals.open}</b>
        </div>
        <div>
          <span>In progress</span>
          <b>{totals.inProgress}</b>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <label>
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, requester, or assignee" />
          </label>
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number])}>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All" : status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => { setMineOnly(false); void loadData(false); }} disabled={loading}>
            Refresh
          </button>
          {isOperations && (
            <button
              type="button"
              onClick={() => { setMineOnly((current) => { void loadData(!current); return !current; }); }}
              disabled={loading}
            >
              {mineOnly ? "Showing assigned to me" : "Assigned to me"}
            </button>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.contentGrid}>
          <div className={styles.listPane}>
            {loading ? (
              <div className={styles.state}>Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className={styles.state}>No matching tickets found.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Requester</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className={selectedTicket?.id === ticket.id ? styles.selected : ""} onClick={() => setSelectedId(ticket.id)}>
                      <td>{ticket.title}</td>
                      <td>{ticket.createdBy.name}</td>
                      <td>{ticket.assignedTo?.name ?? "Unassigned"}</td>
                      <td>{ticket.priority}</td>
                      <td>{formatDate(ticket.createdAt)}</td>
                      <td>
                        <span className={styles.status}>{ticket.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside className={styles.detailPane}>
            {selectedTicket ? (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <span>Details</span>
                    <h2>{selectedTicket.title}</h2>
                  </div>
                </div>

                {isOperations && nextStatuses(selectedTicket).length > 0 && (
                  <div className={styles.actions}>
                    {nextStatuses(selectedTicket).map((status) => (
                      <button key={status} type="button" disabled={saving} onClick={() => void changeStatus(selectedTicket, status)}>
                        Move to {status}
                      </button>
                    ))}
                  </div>
                )}

                {isOperations && (
                  <div className={styles.inlineControls}>
                    <label>
                      <span>Assignee</span>
                      <select
                        value={selectedTicket.assignedTo?.id ?? ""}
                        disabled={saving}
                        onChange={(event) => void assignTicket(selectedTicket, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {assignables.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name} ({person.role})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <dl className={styles.facts}>
                  <div>
                    <dt>Requester</dt>
                    <dd>{selectedTicket.createdBy.name}</dd>
                  </div>
                  <div>
                    <dt>Assignee</dt>
                    <dd>{selectedTicket.assignedTo?.name ?? "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt>Priority</dt>
                    <dd>{selectedTicket.priority}</dd>
                  </div>
                  <div>
                    <dt>Description</dt>
                    <dd>{selectedTicket.description}</dd>
                  </div>
                </dl>

                <div className={styles.comments}>
                  <h3>Comments ({selectedTicket.comments.length})</h3>
                  {selectedTicket.comments.map((item) => (
                    <div key={item.id} className={styles.comment}>
                      <div className={styles.commentHeader}>
                        <b>{item.author.name}</b>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      <p>{item.content}</p>
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== TicketStatus.CLOSED && (
                  <form
                    className={styles.commentForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitComment(selectedTicket);
                    }}
                  >
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Write a comment..."
                    />
                    <button type="submit" disabled={saving || !comment.trim()}>
                      {saving ? "Sending..." : "Add comment"}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className={styles.state}>Select a ticket to view its details.</div>
            )}
          </aside>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formTitle}>
          <h2>Create ticket</h2>
        </div>
        <form onSubmit={createTicket} className={styles.form}>
          <label>
            <span>Title</span>
            <input required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span>Priority</span>
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as PatchSeverity })}>
              {Object.values(PatchSeverity).map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Description</span>
            <textarea required minLength={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <button className={styles.primary} type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create ticket"}
          </button>
        </form>
      </section>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
