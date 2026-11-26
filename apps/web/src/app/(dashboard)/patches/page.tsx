"use client";

import { useEffect, useState } from "react";
import {
  PatchSeverity,
  Role,
} from "@patch-management/shared";

import { apiClient, getCachedApiData } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import { PlusIcon } from "@/components/ui/icons";
import { ModuleTableLoading } from "@/components/ui/module-table-loading";
import { ModuleSearchField } from "@/components/ui/module-search-field";

import {
  PatchItem,
  PatchTable,
} from "@/components/patches/patch-table";

import {
  PatchForm,
  PatchFormValue,
  SoftwareOption,
} from "@/components/patches/patch-form";

import { PatchDetail } from "@/components/patches/patch-detail";

type SeverityFilter = "" | PatchSeverity;

export default function Page() {
  const [patches, setPatches] =
    useState<PatchItem[]>(() => getCachedApiData<PatchItem[]>("/patches") ?? []);

  const [software, setSoftware] =
    useState<SoftwareOption[]>(() => getCachedApiData<SoftwareOption[]>("/software") ?? []);

  const [loading, setLoading] =
    useState(() => getCachedApiData<PatchItem[]>("/patches") === undefined);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [severity, setSeverity] =
    useState<SeverityFilter>("");

  const [softwareId, setSoftwareId] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingPatch, setEditingPatch] =
    useState<PatchItem | null>(null);

  const [selectedPatch, setSelectedPatch] =
    useState<PatchItem | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  // Only administrators may create, edit, or delete patches.
  const [isAdmin, setIsAdmin] =
    useState(false);
  const [reviewRole, setReviewRole] = useState<Role | null>(null);

  // ==========================
  // LOAD SOFTWARE
  // ==========================

  async function loadSoftware() {
    try {
      const data =
        await apiClient<SoftwareOption[]>(
          "/software",
        );

      setSoftware(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the software list.",
      );
    }
  }

  // ==========================
  // LOAD PATCHES
  // ==========================

  async function loadPatches(force = false) {
    try {
      setError(null);

      const params =
        new URLSearchParams();

      if (severity) {
        params.set(
          "severity",
          severity,
        );
      }

      if (softwareId) {
        params.set(
          "softwareId",
          softwareId,
        );
      }

      const query =
        params.toString();

      const path = `/patches${query ? `?${query}` : ""}`;
      const cached = force ? undefined : getCachedApiData<PatchItem[]>(path);
      if (cached) setPatches(cached);
      setLoading(cached === undefined);
      const data =
        await apiClient<PatchItem[]>(
          path,
          force ? { cache: "reload" } : {},
        );

      setPatches(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load patches.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================
  // INITIAL LOAD + ROLE
  // ==========================

  useEffect(() => {
    const user = getCurrentUser();

    setIsAdmin(
      user?.role === Role.ADMIN,
    );
    setReviewRole(user?.role ?? null);

    void loadSoftware();
  }, []);

  useEffect(() => {
    void loadPatches();
  }, [severity, softwareId]);

  // ==========================
  // CREATE
  // ==========================

  function openCreateForm() {
    if (!isAdmin) {
      return;
    }

    setEditingPatch(null);
    setSelectedPatch(null);
    setFormError(null);
    setShowForm(true);
  }

  // ==========================
  // EDIT
  // ==========================

  function openEditForm(
    patch: PatchItem,
  ) {
    if (!isAdmin) {
      return;
    }

    setSelectedPatch(null);
    setEditingPatch(patch);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingPatch(null);
    setFormError(null);
  }

  // ==========================
  // DETAIL
  // ==========================

  async function openDetail(
    patch: PatchItem,
  ) {
    try {
      setError(null);

      const detail =
        await apiClient<PatchItem>(
          `/patches/${patch.id}`,
        );

      setSelectedPatch(detail);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load patch details.",
      );
    }
  }

  function closeDetail() {
    setSelectedPatch(null);
  }

  async function saveSecurityReview(note: string, decision: "DEPLOY" | "SKIP") {
    if (!selectedPatch || reviewRole !== Role.SECURITY_ANALYST) return;
    const patch = await apiClient<PatchItem>(`/patches/${selectedPatch.id}/security-review`, {
      method: "POST", body: JSON.stringify({ securityNote: note, securityDecision: decision }),
    });
    setSelectedPatch(patch);
    setPatches((current) => current.map((item) => item.id === patch.id ? patch : item));
  }

  async function saveManagerDecision(decision: "APPROVED" | "REJECTED") {
    if (!selectedPatch || reviewRole !== Role.MANAGER) return;
    const patch = await apiClient<PatchItem>(`/patches/${selectedPatch.id}/manager-decision`, {
      method: "POST", body: JSON.stringify({ managerDecision: decision }),
    });
    setSelectedPatch(patch);
    setPatches((current) => current.map((item) => item.id === patch.id ? patch : item));
  }

  // ==========================
  // CREATE / UPDATE
  // ==========================

  async function handleSubmit(
    form: PatchFormValue,
  ) {
    if (!isAdmin) {
      setFormError(
        "You do not have permission to change patches.",
      );
      return;
    }

    if (!form.code.trim()) {
      setFormError(
        "Patch code is required.",
      );
      return;
    }

    if (!form.title.trim()) {
      setFormError(
        "Title is required.",
      );
      return;
    }

    if (!form.softwareId) {
      setFormError(
        "Select software.",
      );
      return;
    }

    if (!form.releasedAt) {
      setFormError(
        "Select a release date.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const body = {
        code: form.code.trim(),
        title: form.title.trim(),

        description:
          form.description.trim() ||
          null,

        version:
          form.version.trim() ||
          null,

        severity:
          form.severity,

        releasedAt:
          `${form.releasedAt}T00:00:00.000Z`,

        requiresRestart:
          form.requiresRestart,

        softwareId:
          form.softwareId,
      };

      if (editingPatch) {
        await apiClient<PatchItem>(
          `/patches/${editingPatch.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          },
        );
      } else {
        await apiClient<PatchItem>(
          "/patches",
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        );
      }

      closeForm();

      await loadPatches();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not save the patch.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================
  // DELETE
  // ==========================

  async function deletePatch(
    patch: PatchItem,
  ) {
    if (!isAdmin) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete patch "${patch.code}"? This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);

      await apiClient<{
        id: string;
        deleted: boolean;
      }>(
        `/patches/${patch.id}`,
        {
          method: "DELETE",
        },
      );

      if (
        selectedPatch?.id === patch.id
      ) {
        setSelectedPatch(null);
      }

      if (
        editingPatch?.id === patch.id
      ) {
        closeForm();
      }

      await loadPatches();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete the patch.",
      );
    }
  }

  // ==========================
  // LOCAL SEARCH
  // ==========================

  const filteredPatches =
    patches.filter((patch) => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return true;
      }

      return (
        patch.code
          .toLowerCase()
          .includes(keyword) ||
        patch.title
          .toLowerCase()
          .includes(keyword) ||
        patch.software.name
          .toLowerCase()
          .includes(keyword) ||
        patch.software.vendor
          .toLowerCase()
          .includes(keyword)
      );
    });

  // ==========================
  // RESET FILTER
  // ==========================

  function resetFilters() {
    setSearch("");
    setSeverity("");
    setSoftwareId("");
    if (!severity && !softwareId) void loadPatches();
  }

  return (
    <>
      <section className="dataPanel modulePanel">
        {/* HEADER */}

        <div className="dataHead">
          <div>
            <h2>
              Patch list
            </h2>

            <p>
              Manage patches, severity, and affected software.
            </p>
          </div>

          {/* Only administrators can create patches. */}
          {isAdmin && (
            <button
              type="button"
              className="primary"
              onClick={
                openCreateForm
              }
            >
              <PlusIcon size={14} /> Create patch
            </button>
          )}
        </div>

        {/* FILTER */}

        <div className="tableTools">
          <ModuleSearchField
            ariaLabel="Search patches"
            placeholder="Search code, title, or software..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={severity}
            onChange={(event) =>
              setSeverity(
                event.target
                  .value as SeverityFilter,
              )
            }
          >
            <option value="">
              All severities
            </option>

            <option
              value={
                PatchSeverity.LOW
              }
            >
              Low
            </option>

            <option
              value={
                PatchSeverity.MEDIUM
              }
            >
              Medium
            </option>

            <option
              value={
                PatchSeverity.HIGH
              }
            >
              High
            </option>

            <option
              value={
                PatchSeverity.CRITICAL
              }
            >
              Critical
            </option>
          </select>

          <select
            value={softwareId}
            onChange={(event) =>
              setSoftwareId(
                event.target.value,
              )
            }
          >
            <option value="">
              All software
            </option>

            {software.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name} —{" "}
                  {item.vendor}
                </option>
              ),
            )}
          </select>

          <DashboardActionButton onClick={resetFilters}>
            Reset
          </DashboardActionButton>
          <DashboardActionButton onClick={() => void loadPatches(true)} disabled={loading}>
            Refresh
          </DashboardActionButton>
        </div>

        {/* LOADING */}

        {loading && (
          <ModuleTableLoading module="patches" />
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="empty">
            <p
              style={{
                color: "var(--red)",
                marginBottom: 12,
              }}
            >
              {error}
            </p>

            <button
              type="button"
              className="primary"
              onClick={() =>
                void loadPatches(true)
              }
            >
              Try again
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          patches.length === 0 && (
            <div className="empty">
              <b>
                No matching patches
              </b>

              <p>
                Change the filters or check the available data.
              </p>

              {/* Only administrators can create patches. */}
              {isAdmin && (
                <button
                  type="button"
                  className="primary"
                  onClick={
                    openCreateForm
                  }
                >
                  <PlusIcon size={14} /> Create patch
                </button>
              )}
            </div>
          )}

        {/* SEARCH EMPTY */}

        {!loading &&
          !error &&
          patches.length > 0 &&
          filteredPatches.length ===
            0 && (
            <div className="empty">
              No patches match your search.
            </div>
          )}

        {/* TABLE */}

        {!loading &&
          !error &&
          filteredPatches.length >
            0 && (
            <PatchTable
              patches={
                filteredPatches
              }
              canManage={
                isAdmin
              }
              onEdit={
                openEditForm
              }
              onView={
                openDetail
              }
              onDelete={
                deletePatch
              }
            />
          )}
      </section>

      {/* CREATE / EDIT */}

      {showForm &&
        isAdmin && (
          <PatchForm
            patch={
              editingPatch
            }
            software={
              software
            }
            saving={
              saving
            }
            error={
              formError
            }
            onSubmit={
              handleSubmit
            }
            onClose={
              closeForm
            }
          />
        )}

      {/* DETAIL */}

      {selectedPatch && (
        <PatchDetail
          patch={
            selectedPatch
          }
          canEdit={
            isAdmin
          }
          onClose={
            closeDetail
          }
          onEdit={
            openEditForm
          }
          reviewRole={reviewRole}
          onSecurityReview={saveSecurityReview}
          onManagerDecision={saveManagerDecision}
        />
      )}
    </>
  );
}
