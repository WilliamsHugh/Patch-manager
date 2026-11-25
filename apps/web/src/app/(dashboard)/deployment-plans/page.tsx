"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PlanStatus, Role, TaskStatus, type Patch, type User } from "@patch-management/shared";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import { ModuleSearchField } from "@/components/ui/module-search-field";
import styles from "./deployment-plans.module.css";

type Device = {
  id: string;
  hostname: string;
  operatingSystem: string;
  department?: string | null;
};

type DeploymentTask = {
  id: string;
  patchId: string;
  deviceId: string;
  patch: Patch & { software?: { name: string; vendor: string } };
  device: Device;
  status: TaskStatus;
  errorCode?: string | null;
  errorLog?: string | null;
};

type DeploymentPlan = {
  id: string;
  name: string;
  description?: string | null;
  status: PlanStatus;
  scheduledAt?: string | null;
  createdAt: string;
  createdBy: User;
  devices: { deviceId: string; device: Device }[];
  tasks: DeploymentTask[];
  reviewNote?: string | null;
  reviewedBy?: User | null;
};

type PlanPayload = {
  name: string;
  description?: string;
  scheduledAt?: string;
  deviceIds: string[];
  patchIds: string[];
};

const editableStatuses = new Set<PlanStatus>([PlanStatus.DRAFT, PlanStatus.CHANGES_REQUESTED]);
const statusOptions = ["ALL", ...Object.values(PlanStatus)] as const;

const emptyForm = {
  name: "",
  description: "",
  scheduledAt: "",
  deviceIds: [] as string[],
  patchIds: [] as string[],
};

export default function DeploymentPlansPage() {
  const searchParams = useSearchParams();
  const requestedDeviceId = searchParams.get("deviceId");
  const [plans, setPlans] = useState<DeploymentPlan[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [patches, setPatches] = useState<(Patch & { software?: { name: string; vendor: string } })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("ALL");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const canManage = user?.role === Role.ADMIN;
  const canReview = user?.role === Role.MANAGER;
  const canDeploy = user?.role === Role.ADMIN || user?.role === Role.IT_HELPDESK;
  const selectedPlan = plans.find((plan) => plan.id === selectedId) ?? plans[0] ?? null;

  useEffect(() => {
    setUser(getCurrentUser());
    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DEPLOYING) return;
    let active = true;
    async function refreshTasks() {
      try {
        const snapshot = await apiClient<{ status: PlanStatus; tasks: DeploymentTask[] }>(`/deployment-plans/${selectedPlan!.id}/tasks`);
        if (active) setPlans((current) => current.map((plan) => plan.id === selectedPlan!.id ? { ...plan, status: snapshot.status, tasks: snapshot.tasks } : plan));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to refresh simulated task progress");
      }
    }
    void refreshTasks();
    const timer = window.setInterval(() => void refreshTasks(), 3_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selectedPlan?.id, selectedPlan?.status]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [planData, deviceData, patchData] = await Promise.all([
        apiClient<DeploymentPlan[]>("/deployment-plans"),
        apiClient<Device[]>("/devices"),
        apiClient<(Patch & { software?: { name: string; vendor: string } })[]>("/patches"),
      ]);
      setPlans(planData);
      setDevices(deviceData);
      setPatches(patchData);
      setSelectedId((current) => current ?? planData[0]?.id ?? null);
      if (requestedDeviceId && deviceData.some((device) => device.id === requestedDeviceId)) {
        setForm((current) => current.deviceIds.length ? current : { ...current, deviceIds: [requestedDeviceId] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load deployment plans");
    } finally {
      setLoading(false);
    }
  }

  const filteredPlans = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return plans.filter((plan) => {
      const matchesStatus = statusFilter === "ALL" || plan.status === statusFilter;
      const matchesQuery =
        !normalized ||
        plan.name.toLowerCase().includes(normalized) ||
        plan.createdBy.name.toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [plans, query, statusFilter]);

  const totals = useMemo(
    () => ({
      all: plans.length,
      drafts: plans.filter((plan) => plan.status === PlanStatus.DRAFT).length,
      pending: plans.filter((plan) => plan.status === PlanStatus.PENDING_APPROVAL).length,
    }),
    [plans],
  );

  function startEdit(plan: DeploymentPlan) {
    setEditingId(plan.id);
    setSelectedId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      scheduledAt: plan.scheduledAt ? plan.scheduledAt.slice(0, 16) : "",
      deviceIds: plan.devices.map((item) => item.deviceId),
      patchIds: [...new Set(plan.tasks.map((task) => task.patchId))],
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    if (!form.deviceIds.length || !form.patchIds.length) {
      setError("Select at least one device and one patch");
      return;
    }

    const payload: PlanPayload = {
      name: form.name,
      description: form.description || undefined,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      deviceIds: form.deviceIds,
      patchIds: form.patchIds,
    };

    setSaving(true);
    setError(null);
    try {
      const saved = editingId
        ? await apiClient<DeploymentPlan>(`/deployment-plans/${editingId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiClient<DeploymentPlan>("/deployment-plans", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setPlans((current) => [saved, ...current.filter((plan) => plan.id !== saved.id)]);
      setSelectedId(saved.id);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the deployment plan");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(plan: DeploymentPlan) {
    if (!canManage || !isOwnEditablePlan(plan, user)) return;
    if (!window.confirm(`Delete plan "${plan.name}"? This action cannot be undone.`)) return;

    setSaving(true);
    setError(null);
    try {
      await apiClient<{ deleted: boolean }>(`/deployment-plans/${plan.id}`, { method: "DELETE" });
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      setSelectedId((current) => (current === plan.id ? null : current));
      if (editingId === plan.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the deployment plan");
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview(plan: DeploymentPlan) {
    if (!canManage || !isOwnEditablePlan(plan, user)) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await apiClient<DeploymentPlan>(`/deployment-plans/${plan.id}/submit`, { method: "POST" });
      setPlans((current) => current.map((item) => item.id === saved.id ? saved : item));
      setSelectedId(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit the deployment plan");
    } finally {
      setSaving(false);
    }
  }

  async function reviewPlan(status: PlanStatus.APPROVED | PlanStatus.REJECTED | PlanStatus.CHANGES_REQUESTED) {
    if (!selectedPlan || !canReview || selectedPlan.status !== PlanStatus.PENDING_APPROVAL) return;
    if ((status === PlanStatus.REJECTED || status === PlanStatus.CHANGES_REQUESTED) && !reviewNote.trim()) {
      setError("A review reason is required when rejecting or requesting changes.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await apiClient<DeploymentPlan>(`/deployment-plans/${selectedPlan.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewNote: reviewNote.trim() || undefined }),
      });
      setPlans((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved } : item));
      setReviewNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review the deployment plan");
    } finally {
      setSaving(false);
    }
  }

  async function startSimulation(plan: DeploymentPlan) {
    if (!canDeploy || plan.status !== PlanStatus.APPROVED) return;
    setSaving(true);
    setError(null);
    try {
      const started = await apiClient<{ status: PlanStatus }>(`/deployment-plans/${plan.id}/deploy`, { method: "POST" });
      setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, status: started.status, tasks: item.tasks.map((task) => ({ ...task, status: TaskStatus.PENDING, errorCode: null, errorLog: null })) } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the simulation");
    } finally {
      setSaving(false);
    }
  }

  function toggleSelection(field: "deviceIds" | "patchIds", id: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(id) ? current[field].filter((item) => item !== id) : [...current[field], id],
    }));
  }

  return (
    <div className={styles.page}>
      <section className={styles.metrics} aria-label="Plan overview">
        <div>
          <span>All</span>
          <b>{totals.all}</b>
        </div>
        <div>
          <span>Draft</span>
          <b>{totals.drafts}</b>
        </div>
        <div>
          <span>Pending approval</span>
          <b>{totals.pending}</b>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <ModuleSearchField ariaLabel="Search deployment plans" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Plan name or creator" />
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
          <DashboardActionButton onClick={() => { setQuery(""); setStatusFilter("ALL"); void loadData(); }} disabled={loading}>
            Reset
          </DashboardActionButton>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.contentGrid}>
          <div className={styles.listPane}>
            {loading ? (
              <div className={styles.state}>Loading deployment plans...</div>
            ) : filteredPlans.length === 0 ? (
              <div className={styles.state}>No matching deployment plans found.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Plan name</th>
                    <th>Created by</th>
                    <th>Devices</th>
                    <th>Task</th>
                    <th>Schedule</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id} className={selectedPlan?.id === plan.id ? styles.selected : ""} onClick={() => setSelectedId(plan.id)}>
                      <td>{plan.name}</td>
                      <td>{plan.createdBy.name}</td>
                      <td>{plan.devices.length}</td>
                      <td>{plan.tasks.length}</td>
                      <td>{formatDate(plan.scheduledAt)}</td>
                      <td>
                        <span className={styles.status}>{plan.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside className={styles.detailPane}>
            {selectedPlan ? (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <span>Details</span>
                    <h2>{selectedPlan.name}</h2>
                  </div>
                  {canManage && isOwnEditablePlan(selectedPlan, user) && (
                    <div className={styles.actions}>
                      {canManage && isOwnEditablePlan(selectedPlan, user) && (
                        <>
                          <button type="button" onClick={() => startEdit(selectedPlan)}>
                            Edit
                          </button>
                          <button type="button" onClick={() => deletePlan(selectedPlan)} disabled={saving}>
                            Delete
                          </button>
                          <button type="button" className={styles.primaryAction} onClick={() => void submitForReview(selectedPlan)} disabled={saving}>
                            Submit for approval
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>Created by</dt>
                    <dd>{selectedPlan.createdBy.name}</dd>
                  </div>
                  <div>
                    <dt>Schedule</dt>
                    <dd>{formatDate(selectedPlan.scheduledAt)}</dd>
                  </div>
                  <div>
                    <dt>Devices</dt>
                    <dd>{selectedPlan.devices.map((item) => item.device.hostname).join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Patches</dt>
                    <dd>{uniquePatchLabels(selectedPlan.tasks).join(", ")}</dd>
                  </div>
                  {selectedPlan.reviewNote && <div><dt>Review note</dt><dd>{selectedPlan.reviewNote}</dd></div>}
                </dl>
                <p className={styles.observationNote}>This plan is a proposal. It does not install Windows updates or confirm a catalog-to-KB mapping.</p>
                {canDeploy && selectedPlan.status === PlanStatus.APPROVED && (
                  <button type="button" className={styles.primary} onClick={() => void startSimulation(selectedPlan)} disabled={saving}>
                    {saving ? "Starting simulation..." : "Start deployment simulation"}
                  </button>
                )}
                <section className={styles.taskPanel} aria-label="Simulated deployment tasks">
                  <h3>Task progress [SIMULATION]</h3>
                  <p>Progress here is simulated. No update is installed on a device.</p>
                  {!selectedPlan.tasks.length ? <p>No tasks in this plan.</p> : (
                    <div className={styles.taskList}>
                      {selectedPlan.tasks.map((task) => (
                        <div key={task.id} className={styles.taskRow}>
                          <div><b>{task.device?.hostname ?? task.deviceId}</b><span>{task.patch?.code ?? task.patchId}</span></div>
                          <span className={styles.status}>{task.status}</span>
                          {task.status === TaskStatus.FAILED && task.errorCode && (
                            <details className={styles.taskError}><summary>Failure details</summary><p>{task.errorCode}: {task.errorLog ?? "No further details"}</p></details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                {canReview && selectedPlan.status === PlanStatus.PENDING_APPROVAL && (
                  <div className={styles.reviewPanel}>
                    <label>
                      <span>Review note</span>
                      <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Required for rejection or change requests" />
                    </label>
                    <div className={styles.actions}>
                      <button type="button" className={styles.primaryAction} onClick={() => void reviewPlan(PlanStatus.APPROVED)} disabled={saving}>Approve</button>
                      <button type="button" onClick={() => void reviewPlan(PlanStatus.CHANGES_REQUESTED)} disabled={saving}>Request changes</button>
                      <button type="button" onClick={() => void reviewPlan(PlanStatus.REJECTED)} disabled={saving}>Reject</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.state}>Select a plan to view its details.</div>
            )}
          </aside>
        </div>
      </section>

      {canManage && (
        <section className={styles.formPanel}>
          <div className={styles.formTitle}>
            <h2>{editingId ? "Edit deployment plan" : "Create deployment plan"}</h2>
            {editingId && (
              <button type="button" onClick={resetForm}>
                Cancel editing
              </button>
            )}
          </div>
          <form onSubmit={submitPlan} className={styles.form}>
            <label>
              <span>Plan name</span>
              <input required minLength={3} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              <span>Deployment schedule</span>
              <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
            </label>
            <label className={styles.fullWidth}>
              <span>Description</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>

            <fieldset>
              <legend>Devices</legend>
              <div className={styles.checkGrid}>
                {devices.map((device) => (
                  <label key={device.id}>
                    <input
                      type="checkbox"
                      checked={form.deviceIds.includes(device.id)}
                      onChange={() => toggleSelection("deviceIds", device.id)}
                    />
                    <span>{device.hostname}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Patches</legend>
              <div className={styles.checkGrid}>
                {patches.map((patch) => (
                  <label key={patch.id}>
                    <input type="checkbox" checked={form.patchIds.includes(patch.id)} onChange={() => toggleSelection("patchIds", patch.id)} />
                    <span>
                      {patch.code} - {patch.title}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button className={styles.primary} type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create draft"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function uniquePatchLabels(tasks: DeploymentTask[]) {
  const labels = new Map<string, string>();
  tasks.forEach((task) => labels.set(task.patchId, `${task.patch.code} - ${task.patch.title}`));
  return [...labels.values()];
}

function isOwnEditablePlan(plan: DeploymentPlan, user: User | null) {
  return Boolean(user && plan.createdBy.id === user.id && editableStatuses.has(plan.status));
}
