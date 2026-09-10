"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

interface Software {
  id: string;
  name: string;
  vendor: string;
  currentVersion: string | null;

  _count?: {
    patches: number;
    installations: number;
  };
}

interface SoftwareForm {
  name: string;
  vendor: string;
  currentVersion: string;
}

const emptyForm: SoftwareForm = {
  name: "",
  vendor: "",
  currentVersion: "",
};

export default function Page() {
  const [software, setSoftware] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingSoftware, setEditingSoftware] =
    useState<Software | null>(null);

  const [form, setForm] = useState<SoftwareForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ==========================
  // GET /api/software
  // ==========================

  async function loadSoftware() {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient<Software[]>("/software");

      setSoftware(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách phần mềm."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSoftware();
  }, []);

  // ==========================
  // CREATE
  // ==========================

  function openCreateForm() {
    setEditingSoftware(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  // ==========================
  // EDIT
  // ==========================

  function openEditForm(item: Software) {
    setEditingSoftware(item);

    setForm({
      name: item.name,
      vendor: item.vendor,
      currentVersion: item.currentVersion ?? "",
    });

    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingSoftware(null);
    setForm(emptyForm);
    setFormError(null);
  }

  // ==========================
  // SUBMIT CREATE / EDIT
  // ==========================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError("Tên phần mềm không được để trống.");
      return;
    }

    if (!form.vendor.trim()) {
      setFormError("Nhà cung cấp không được để trống.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const body = {
        name: form.name.trim(),
        vendor: form.vendor.trim(),
        currentVersion: form.currentVersion.trim() || null,
      };

      if (editingSoftware) {
        // PATCH /api/software/:id

        await apiClient<Software>(
          `/software/${editingSoftware.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          }
        );
      } else {
        // POST /api/software

        await apiClient<Software>("/software", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      closeForm();

      // Load lại table
      await loadSoftware();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Không thể lưu phần mềm."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================
  // SEARCH
  // ==========================

  const filteredSoftware = software.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      item.name.toLowerCase().includes(keyword) ||
      item.vendor.toLowerCase().includes(keyword) ||
      (item.currentVersion ?? "")
        .toLowerCase()
        .includes(keyword)
    );
  });

  return (
    <>
      <section className="dataPanel modulePanel">

        {/* HEADER */}
        <div className="dataHead">
          <div>
            <h2>Danh sách phần mềm</h2>
            <p>
              Quản lý danh mục phần mềm và phiên bản hiện tại.
            </p>
          </div>

          <button
            className="primary"
            onClick={openCreateForm}
          >
            ＋ Tạo mới
          </button>
        </div>

        {/* SEARCH */}
        <div className="tableTools">
          <label>
            <span>⌕</span>

            <input
              type="text"
              placeholder="Tìm kiếm phần mềm..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <button
            onClick={() => setSearch("")}
          >
            ⟳ Đặt lại
          </button>

          <button onClick={loadSoftware}>
            ⟳ Làm mới
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="empty">
            Đang tải danh sách phần mềm...
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
              className="primary"
              onClick={loadSoftware}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          software.length === 0 && (
            <div className="empty">
              <b>Chưa có phần mềm nào</b>

              <p>
                Hãy thêm phần mềm đầu tiên vào hệ thống.
              </p>

              <button
                className="primary"
                onClick={openCreateForm}
              >
                ＋ Tạo phần mềm
              </button>
            </div>
          )}

        {/* NO SEARCH RESULT */}
        {!loading &&
          !error &&
          software.length > 0 &&
          filteredSoftware.length === 0 && (
            <div className="empty">
              Không tìm thấy phần mềm phù hợp.
            </div>
          )}

        {/* TABLE */}
        {!loading &&
          !error &&
          filteredSoftware.length > 0 && (
            <>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>TÊN PHẦN MỀM</th>
                      <th>NHÀ CUNG CẤP</th>
                      <th>PHIÊN BẢN</th>
                      <th>BẢN VÁ</th>
                      <th>THIẾT BỊ ĐÃ CÀI</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSoftware.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <button
                            className="machineName"
                            onClick={() =>
                              openEditForm(item)
                            }
                          >
                            {item.name}
                          </button>
                        </td>

                        <td>{item.vendor}</td>

                        <td>
                          {item.currentVersion ?? "—"}
                        </td>

                        <td>
                          {item._count?.patches ?? 0}
                        </td>

                        <td>
                          {item._count?.installations ??
                            0}
                        </td>

                        <td>
                          <button
                            style={{
                              border: 0,
                              background: "none",
                              color: "var(--azure)",
                            }}
                            onClick={() =>
                              openEditForm(item)
                            }
                          >
                            Chỉnh sửa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tableFoot">
                <span>
                  Tổng cộng:{" "}
                  <b>{filteredSoftware.length}</b>{" "}
                  phần mềm
                </span>
              </div>
            </>
          )}
      </section>

      {/* CREATE / EDIT DRAWER */}
      {showForm && (
        <div
          className="drawerBackdrop"
          onClick={closeForm}
        >
          <div
            className="drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="drawerHead">
              <div>
                <small>
                  SOFTWARE INVENTORY
                </small>

                <h2>
                  {editingSoftware
                    ? "Chỉnh sửa phần mềm"
                    : "Tạo phần mềm"}
                </h2>
              </div>

              <button onClick={closeForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && (
                <div
                  className="loginError"
                  style={{ marginTop: 20 }}
                >
                  {formError}
                </div>
              )}

              {/* NAME */}
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  marginTop: 22,
                }}
              >
                <b>Tên phần mềm *</b>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="Ví dụ: Google Chrome"
                  style={{
                    height: 38,
                    padding: "0 10px",
                    border:
                      "1px solid var(--line)",
                  }}
                />
              </label>

              {/* VENDOR */}
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  marginTop: 18,
                }}
              >
                <b>Nhà cung cấp *</b>

                <input
                  type="text"
                  value={form.vendor}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vendor: event.target.value,
                    })
                  }
                  placeholder="Ví dụ: Google"
                  style={{
                    height: 38,
                    padding: "0 10px",
                    border:
                      "1px solid var(--line)",
                  }}
                />
              </label>

              {/* VERSION */}
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  marginTop: 18,
                }}
              >
                <b>Phiên bản hiện tại</b>

                <input
                  type="text"
                  value={form.currentVersion}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      currentVersion:
                        event.target.value,
                    })
                  }
                  placeholder="Ví dụ: 140.0.7339.81"
                  style={{
                    height: 38,
                    padding: "0 10px",
                    border:
                      "1px solid var(--line)",
                  }}
                />
              </label>

              {/* BUTTONS */}
              <div
                style={{
                  marginTop: 30,
                }}
              >
                <button
                  type="submit"
                  className="drawerAction primary"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingSoftware
                    ? "Lưu thay đổi"
                    : "Tạo phần mềm"}
                </button>

                <button
                  type="button"
                  className="drawerAction"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}