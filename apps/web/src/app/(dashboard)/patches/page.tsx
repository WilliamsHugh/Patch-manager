"use client";

import { useEffect, useState } from "react";
import {
  PatchSeverity,
  Role,
} from "@patch-management/shared";

import { apiClient } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

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
    useState<PatchItem[]>([]);

  const [software, setSoftware] =
    useState<SoftwareOption[]>([]);

  const [loading, setLoading] =
    useState(true);

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

  // Quyền quản lý Patch:
  // chỉ ADMIN được tạo / sửa / xóa
  const [isAdmin, setIsAdmin] =
    useState(false);

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
          : "Không thể tải danh sách phần mềm.",
      );
    }
  }

  // ==========================
  // LOAD PATCHES
  // ==========================

  async function loadPatches() {
    try {
      setLoading(true);
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

      const data =
        await apiClient<PatchItem[]>(
          `/patches${
            query ? `?${query}` : ""
          }`,
        );

      setPatches(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách bản vá.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================
  // INITIAL LOAD + ROLE
  // ==========================

  useEffect(() => {
    const user = getStoredUser();

    setIsAdmin(
      user?.role === Role.ADMIN,
    );

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
          : "Không thể tải chi tiết bản vá.",
      );
    }
  }

  function closeDetail() {
    setSelectedPatch(null);
  }

  // ==========================
  // CREATE / UPDATE
  // ==========================

  async function handleSubmit(
    form: PatchFormValue,
  ) {
    if (!isAdmin) {
      setFormError(
        "Bạn không có quyền thay đổi bản vá.",
      );
      return;
    }

    if (!form.code.trim()) {
      setFormError(
        "Mã bản vá không được để trống.",
      );
      return;
    }

    if (!form.title.trim()) {
      setFormError(
        "Tiêu đề không được để trống.",
      );
      return;
    }

    if (!form.softwareId) {
      setFormError(
        "Vui lòng chọn phần mềm.",
      );
      return;
    }

    if (!form.releasedAt) {
      setFormError(
        "Vui lòng chọn ngày phát hành.",
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
          : "Không thể lưu bản vá.",
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
        `Bạn có chắc muốn xóa bản vá "${patch.code}" không?`,
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
          : "Không thể xóa bản vá.",
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
  }

  return (
    <>
      <section className="dataPanel modulePanel">
        {/* HEADER */}

        <div className="dataHead">
          <div>
            <h2>
              Danh sách bản vá
            </h2>

            <p>
              Quản lý bản vá, mức độ
              nghiêm trọng và phần mềm
              bị ảnh hưởng.
            </p>
          </div>

          {/* Chỉ ADMIN thấy nút tạo */}
          {isAdmin && (
            <button
              type="button"
              className="primary"
              onClick={
                openCreateForm
              }
            >
              ＋ Tạo bản vá
            </button>
          )}
        </div>

        {/* FILTER */}

        <div className="tableTools">
          <label>
            <span>⌕</span>

            <input
              type="text"
              placeholder="Tìm mã, tiêu đề, phần mềm..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </label>

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
              Tất cả mức độ
            </option>

            <option
              value={
                PatchSeverity.LOW
              }
            >
              Thấp
            </option>

            <option
              value={
                PatchSeverity.MEDIUM
              }
            >
              Trung bình
            </option>

            <option
              value={
                PatchSeverity.HIGH
              }
            >
              Cao
            </option>

            <option
              value={
                PatchSeverity.CRITICAL
              }
            >
              Nghiêm trọng
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
              Tất cả phần mềm
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

          <button
            type="button"
            onClick={
              resetFilters
            }
          >
            ⟳ Đặt lại
          </button>

          <button
            type="button"
            onClick={() =>
              void loadPatches()
            }
          >
            ⟳ Làm mới
          </button>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="empty">
            Đang tải danh sách bản vá...
          </div>
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
                void loadPatches()
              }
            >
              Thử lại
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          patches.length === 0 && (
            <div className="empty">
              <b>
                Không có bản vá phù hợp
              </b>

              <p>
                Hãy thay đổi bộ lọc
                hoặc kiểm tra lại dữ liệu.
              </p>

              {/* Chỉ ADMIN được tạo */}
              {isAdmin && (
                <button
                  type="button"
                  className="primary"
                  onClick={
                    openCreateForm
                  }
                >
                  ＋ Tạo bản vá
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
              Không tìm thấy bản vá
              theo từ khóa.
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
        />
      )}
    </>
  );
}