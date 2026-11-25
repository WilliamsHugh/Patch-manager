"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PatchSeverity, Role, TicketStatus, type User } from "@patch-management/shared";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import { ModuleSearchField } from "@/components/ui/module-search-field";
import { ModuleTableLoading } from "@/components/ui/module-table-loading";
import styles from "./tickets.module.css";

type TicketUser = {
  id: string;
  name: string;
  email?: string;
  role?: Role;
};

type TicketComment = {
  id: string;
  content: string;
  createdAt: string;
  author: TicketUser;
};

type TicketItem = {
  id: string;
  title: string;
  description: string;
  priority: PatchSeverity;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  assignedToId?: string | null;
  createdBy: TicketUser;
  assignedTo?: TicketUser | null;
  comments: TicketComment[];
};

const statusOptions = ["ALL", ...Object.values(TicketStatus)] as const;
const severityOptions = Object.values(PatchSeverity);

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "Open",
  [TicketStatus.IN_PROGRESS]: "In Progress",
  [TicketStatus.WAITING_USER]: "Waiting User",
  [TicketStatus.RESOLVED]: "Resolved",
  [TicketStatus.CLOSED]: "Closed",
};

const PRIORITY_LABELS: Record<PatchSeverity, string> = {
  [PatchSeverity.LOW]: "Low",
  [PatchSeverity.MEDIUM]: "Medium",
  [PatchSeverity.HIGH]: "High",
  [PatchSeverity.CRITICAL]: "Critical",
};

const emptyCreateForm = {
  title: "",
  description: "",
  priority: PatchSeverity.MEDIUM as PatchSeverity,
};

export default function TicketsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TicketItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("ALL");
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [commentText, setCommentText] = useState("");
  const activeTicketIdRef = useRef<string | null>(null);

  const canCreate = user?.role === Role.USER || user?.role === Role.IT_HELPDESK;
  const canComment = user?.role === Role.USER || user?.role === Role.IT_HELPDESK;
  const canAssign = user?.role === Role.IT_HELPDESK;
  const canChangeStatus =
    user?.role === Role.IT_HELPDESK || user?.role === Role.MANAGER || user?.role === Role.ADMIN;

  const fetchTicketDetail = useCallback(async (ticketId: string) => {
    activeTicketIdRef.current = ticketId;
    setDetailLoading(true);
    try {
      const detail = await apiClient<TicketItem>(`/tickets/${ticketId}`);
      if (activeTicketIdRef.current !== ticketId) return;
      setSelectedDetail(detail);
      setTickets((current) => current.map((item) => (item.id === detail.id ? detail : item)));
    } catch (err) {
      if (activeTicketIdRef.current !== ticketId) return;
      setSelectedDetail((prev) => (prev?.id === ticketId ? prev : null));
      setError(err instanceof Error ? err.message : "Unable to load ticket details.");
    } finally {
      if (activeTicketIdRef.current === ticketId) {
        setDetailLoading(false);
      }
    }
  }, []);

  const loadTickets = useCallback(async (preferredId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<TicketItem[]>("/tickets");
      setTickets(data);
      const nextId =
        preferredId && data.some((ticket) => ticket.id === preferredId)
          ? preferredId
          : data[0]?.id ?? null;
      setSelectedId(nextId);
      if (nextId) {
        await fetchTicketDetail(nextId);
      } else {
        activeTicketIdRef.current = null;
        setDetailLoading(false);
        setSelectedDetail(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [fetchTicketDetail]);

  useEffect(() => {
    setUser(getCurrentUser());
    void loadTickets(null);
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
      const matchesQuery =
        !normalized ||
        ticket.title.toLowerCase().includes(normalized) ||
        ticket.createdBy.name.toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [tickets, query, statusFilter]);

  const totals = useMemo(
    () => ({
      all: tickets.length,
      active: tickets.filter(
        (ticket) =>
          ticket.status === TicketStatus.OPEN ||
          ticket.status === TicketStatus.IN_PROGRESS ||
          ticket.status === TicketStatus.WAITING_USER,
      ).length,
      resolved: tickets.filter(
        (ticket) =>
          ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED,
      ).length,
    }),
    [tickets],
  );

  function selectTicket(ticketId: string) {
    setSelectedId(ticketId);
    setNotice(null);
    setError(null);
    void fetchTicketDetail(ticketId);
  }

  function handleReset() {
    setQuery("");
    setStatusFilter("ALL");
    setNotice(null);
    void loadTickets(selectedId);
  }

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;

    const title = createForm.title.trim();
    const description = createForm.description.trim();
    if (title.length < 3) {
      setError("Ticket title must be at least 3 characters.");
      return;
    }
    if (description.length < 5) {
      setError("Ticket description must be at least 5 characters.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await apiClient<TicketItem>("/tickets", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          priority: createForm.priority,
        }),
      });
      setCreateForm(emptyCreateForm);
      setShowCreateForm(false);
      setNotice("Ticket created successfully.");
      await loadTickets(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDetail || !canComment) return;

    const trimmed = commentText.trim();
    if (!trimmed) {
      setError("Please enter a comment before submitting.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await apiClient(`/tickets/${selectedDetail.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: trimmed }),
      });
      setCommentText("");
      setNotice("Comment added.");
      await fetchTicketDetail(selectedDetail.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add comment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignToMe() {
    if (!selectedDetail || !canAssign || !user) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiClient<TicketItem>(`/tickets/${selectedDetail.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedToId: user.id }),
      });
      setSelectedDetail(updated);
      setTickets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice("Ticket assigned to you.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(nextStatus: TicketStatus) {
    if (!selectedDetail || !canChangeStatus || nextStatus === selectedDetail.status) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiClient<TicketItem>(`/tickets/${selectedDetail.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setSelectedDetail(updated);
      setTickets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(`Status updated to ${STATUS_LABELS[nextStatus]}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update ticket status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseTicket() {
    if (!selectedDetail || user?.role !== Role.USER) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiClient<TicketItem>(`/tickets/${selectedDetail.id}/close`, {
        method: "POST",
      });
      setSelectedDetail(updated);
      setTickets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice("Ticket confirmed resolved and closed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to close ticket.");
    } finally {
      setSaving(false);
    }
  }

  const canConfirmResolved =
    Boolean(selectedDetail) &&
    selectedDetail?.id === selectedId &&
    user?.role === Role.USER &&
    selectedDetail?.createdBy.id === user.id &&
    selectedDetail?.status === TicketStatus.RESOLVED;

  return (
    <section className={styles.page}>
      <section className={styles.metrics} aria-label="Ticket overview">
        <div>
          <span>All tickets</span>
          <b>{totals.all}</b>
        </div>
        <div>
          <span>Open or active</span>
          <b>{totals.active}</b>
        </div>
        <div>
          <span>Resolved or closed</span>
          <b>{totals.resolved}</b>
        </div>
      </section>

      {showCreateForm && canCreate && (
        <section className={styles.formPanel} aria-label="Create support ticket">
          <div className={styles.formTitle}>
            <h2>Create support ticket</h2>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm(emptyCreateForm);
              }}
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleCreateTicket} className={styles.form}>
            <label>
              <span>Title</span>
              <input
                required
                minLength={3}
                placeholder="Summarize the patch or workstation issue"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Priority</span>
              <select
                aria-label="Ticket priority"
                value={createForm.priority}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    priority: event.target.value as PatchSeverity,
                  }))
                }
              >
                {severityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.fullWidth}>
              <span>Description</span>
              <textarea
                required
                minLength={5}
                placeholder="Provide affected hostname, patch code, or error details"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                {saving ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Support tickets</h2>
            <p>Track support requests, assign helpdesk owners, and collaborate through comments.</p>
          </div>
          {canCreate && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                setError(null);
                setNotice(null);
                setShowCreateForm((current) => !current);
              }}
            >
              {showCreateForm ? "Close Form" : "+ Create ticket"}
            </button>
          )}
        </div>

        <div className={styles.toolbar}>
          <ModuleSearchField
            ariaLabel="Search tickets"
            placeholder="Search by ticket title or creator"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={loading}
          />
          <label>
            <span>Status</span>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as (typeof statusOptions)[number])
              }
              disabled={loading}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All statuses" : STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <DashboardActionButton onClick={handleReset} disabled={loading}>
            Reset
          </DashboardActionButton>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}
        {notice && !error && (
          <div className={styles.successBanner} role="status">
            {notice}
          </div>
        )}

        <div className={styles.contentGrid}>
          <div className={styles.listPane}>
            {loading && !tickets.length ? (
              <ModuleTableLoading module="tickets" />
            ) : filteredTickets.length === 0 ? (
              <div className={styles.state}>
                {tickets.length === 0
                  ? error
                    ? "Unable to load tickets."
                    : "No support tickets have been created yet."
                  : "No tickets match the current search or status filter."}
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>TITLE</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                    <th>CREATED BY</th>
                    <th>ASSIGNEE</th>
                    <th>CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={selectedId === ticket.id ? styles.selectedRow : ""}
                      onClick={() => selectTicket(ticket.id)}
                    >
                      <td className={styles.titleCell} title={ticket.title}>
                        {ticket.title}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${priorityBadgeClass(ticket.priority)}`}>
                          {PRIORITY_LABELS[ticket.priority]}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${statusBadgeClass(ticket.status)}`}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </td>
                      <td className={styles.nowrap}>{ticket.createdBy.name}</td>
                      <td className={styles.nowrap}>{ticket.assignedTo?.name ?? "Unassigned"}</td>
                      <td className={styles.nowrap}>{formatDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside className={styles.detailPane} aria-label="Ticket details">
            {detailLoading && selectedDetail?.id !== selectedId ? (
              <div className={styles.state} role="status">
                Loading ticket details...
              </div>
            ) : selectedDetail && selectedDetail.id === selectedId ? (
              <>
                <div className={styles.detailHeader}>
                  <span>Ticket details</span>
                  <h2>{selectedDetail.title}</h2>
                  <div className={styles.badgeRow}>
                    <span
                      className={`${styles.badge} ${priorityBadgeClass(selectedDetail.priority)}`}
                    >
                      Priority: {PRIORITY_LABELS[selectedDetail.priority]}
                    </span>
                    <span className={`${styles.badge} ${statusBadgeClass(selectedDetail.status)}`}>
                      {STATUS_LABELS[selectedDetail.status]}
                    </span>
                  </div>
                </div>

                <p className={styles.description}>{selectedDetail.description}</p>

                <dl className={styles.facts}>
                  <div>
                    <dt>Created by</dt>
                    <dd>{selectedDetail.createdBy.name}</dd>
                  </div>
                  <div>
                    <dt>Assignee</dt>
                    <dd>{selectedDetail.assignedTo?.name ?? "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDate(selectedDetail.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Last updated</dt>
                    <dd>{formatDate(selectedDetail.updatedAt)}</dd>
                  </div>
                </dl>

                {(canAssign || canChangeStatus || canConfirmResolved) && (
                  <div className={styles.actionsBox}>
                    {canAssign && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => void handleAssignToMe()}
                        disabled={saving || selectedDetail.assignedTo?.id === user?.id}
                      >
                        {selectedDetail.assignedTo?.id === user?.id
                          ? "Assigned to you"
                          : "Assign to me"}
                      </button>
                    )}

                    {canChangeStatus && (
                      <label className={styles.statusControl}>
                        <span>Change Status</span>
                        <select
                          aria-label="Change Status"
                          value={selectedDetail.status}
                          disabled={saving}
                          onChange={(event) =>
                            void handleStatusChange(event.target.value as TicketStatus)
                          }
                        >
                          {Object.values(TicketStatus).map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {canConfirmResolved && (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => void handleCloseTicket()}
                        disabled={saving}
                      >
                        Confirm Resolved
                      </button>
                    )}
                  </div>
                )}

                <div className={styles.commentsSection}>
                  <h3>Comment timeline ({selectedDetail.comments.length})</h3>
                  {selectedDetail.comments.length === 0 ? (
                    <div className={styles.state}>No comments yet.</div>
                  ) : (
                    <ul className={styles.timeline}>
                      {selectedDetail.comments.map((comment) => (
                        <li key={comment.id} className={styles.commentItem}>
                          <div className={styles.commentMeta}>
                            <div>
                              <span className={styles.commentAuthor}>{comment.author.name}</span>
                              {comment.author.role && (
                                <span className={styles.commentRole}>{comment.author.role}</span>
                              )}
                            </div>
                            <span className={styles.commentDate}>
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className={styles.commentBody}>{comment.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {canComment && (
                    <form onSubmit={handleAddComment} className={styles.commentForm}>
                      <label>
                        <span>Add a comment</span>
                        <textarea
                          placeholder="Write an update or reply..."
                          value={commentText}
                          onChange={(event) => setCommentText(event.target.value)}
                          disabled={saving}
                        />
                      </label>
                      <button
                        type="submit"
                        className={styles.primaryBtn}
                        disabled={saving || !commentText.trim()}
                      >
                        {saving ? "Posting..." : "Add Comment"}
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : selectedId && !detailLoading && (!selectedDetail || selectedDetail.id !== selectedId) ? (
              <div className={styles.state}>Unable to load details for the selected ticket.</div>
            ) : (
              <div className={styles.state}>Select a ticket to view its details.</div>
            )}
          </aside>
        </div>
      </section>
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusBadgeClass(status: TicketStatus) {
  switch (status) {
    case TicketStatus.OPEN:
      return styles.statusOpen;
    case TicketStatus.IN_PROGRESS:
      return styles.statusInProgress;
    case TicketStatus.WAITING_USER:
      return styles.statusWaitingUser;
    case TicketStatus.RESOLVED:
      return styles.statusResolved;
    case TicketStatus.CLOSED:
      return styles.statusClosed;
  }
}

function priorityBadgeClass(priority: PatchSeverity) {
  switch (priority) {
    case PatchSeverity.LOW:
      return styles.priorityLow;
    case PatchSeverity.MEDIUM:
      return styles.priorityMedium;
    case PatchSeverity.HIGH:
      return styles.priorityHigh;
    case PatchSeverity.CRITICAL:
      return styles.priorityCritical;
  }
}
