"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PlanStatus, Role, type Patch, type User } from "@patch-management/shared";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
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

  const canManage = user?.role === Role.IT_HELPDESK;
  const selectedPlan = plans.find((plan) => plan.id === selectedId) ?? plans[0] ?? null;

  useEffect(() => {
    setUser(getCurrentUser());
    void loadData();
  }, []);

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
    if (!canManage || !editableStatuses.has(plan.status)) return;
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
          <label>
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Plan name or creator" />
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
          <button type="button" onClick={() => { setQuery(""); setStatusFilter("ALL"); void loadData(); }} disabled={loading}>
            Reset
          </button>
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
                  {canManage && editableStatuses.has(selectedPlan.status) && (
                    <div className={styles.actions}>
                      <button type="button" onClick={() => startEdit(selectedPlan)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => deletePlan(selectedPlan)} disabled={saving}>
                        Delete
                      </button>
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
                </dl>
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
