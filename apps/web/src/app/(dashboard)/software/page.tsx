"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Role } from "@patch-management/shared";

import {
  ApiError,
  apiClient,
} from "@/lib/api";

import { getCurrentUser } from "@/lib/auth";

import styles from "./software.module.css";

type Software = {
  id: string;
  name: string;
  vendor: string;
  currentVersion: string | null;
  createdAt: string;
  updatedAt: string;

  _count?: {
    patches: number;
    installations: number;
  };

  patches?: {
    id: string;
    code: string;
    title: string;
    severity: string;
    releasedAt: string;
  }[];
};

type SoftwareForm = {
  name: string;
  vendor: string;
  currentVersion: string;
};

const emptyForm: SoftwareForm = {
  name: "",
  vendor: "",
  currentVersion: "",
};

export default function SoftwarePage() {
  const [items, setItems] =
    useState<Software[]>([]);

  const [selected, setSelected] =
    useState<Software | null>(null);

  const [query, setQuery] =
    useState("");

  const [form, setForm] =
    useState<SoftwareForm>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [isAdmin, setIsAdmin] =
    useState(false);

  // ==========================
  // INITIAL LOAD + ROLE
  // ==========================

  useEffect(() => {
    const user = getCurrentUser();

    setIsAdmin(
      user?.role === Role.ADMIN,
    );

    void loadSoftware();
  }, []);

  // ==========================
  // SEARCH
  // ==========================

  const filtered = useMemo(() => {
    const normalized =
      query.trim().toLowerCase();

    if (!normalized) {
      return items;
    }

    return items.filter((item) => {
      const text = `
        ${item.name}
        ${item.vendor}
        ${item.currentVersion ?? ""}
      `.toLowerCase();

      return text.includes(normalized);
    });
  }, [items, query]);

  // ==========================
  // LOAD SOFTWARE
  // ==========================

  async function loadSoftware() {
    setLoading(true);
    setError("");

    try {
      const data =
        await apiClient<Software[]>(
          "/software",
        );

      setItems(data);

      setSelected((current) => {
        if (!current) {
          return null;
        }

        return (
          data.find(
            (item) =>
              item.id === current.id,
          ) ?? null
        );
      });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not load the software catalog.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================
  // LOAD DETAIL
  // ==========================

  async function loadDetail(
    id: string,
  ) {
    try {
      const detail =
        await apiClient<Software>(
          `/software/${id}`,
        );

      setSelected(detail);
    } catch (err) {
      notify(
        getErrorMessage(
          err,
          "Could not load software details.",
        ),
      );
    }
  }

  // ==========================
  // CREATE / UPDATE
  // ==========================

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    const name = form.name.trim();
    const vendor =
      form.vendor.trim();

    const currentVersion =
      form.currentVersion.trim();

    if (!name) {
      setFormError(
        "Software name is required.",
      );
      return;
    }

    if (!vendor) {
      setFormError(
        "Vendor is required.",
      );
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const body =
        JSON.stringify({
          name,
          vendor,

          currentVersion:
            currentVersion ||
            undefined,
        });

      if (editingId) {
        await apiClient<Software>(
          `/software/${editingId}`,
          {
            method: "PATCH",
            body,
          },
        );

        notify(
          "Software updated.",
        );
      } else {
        await apiClient<Software>(
          "/software",
          {
            method: "POST",
            body,
          },
        );

        notify(
          "Software created.",
        );
      }

      resetForm();

      await loadSoftware();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          "Could not save the software.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================
  // EDIT
  // ==========================

  function startEdit(
    item: Software,
  ) {
    if (!isAdmin) {
      return;
    }

    setSelected(null);

    setEditingId(
      item.id,
    );

    setForm({
      name: item.name,
      vendor: item.vendor,

      currentVersion:
        item.currentVersion ?? "",
    });

    setFormError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ==========================
  // DELETE
  // ==========================

  async function remove(
    item: Software,
  ) {
    if (!isAdmin) {
      return;
    }

    const ok =
      window.confirm(
        `Delete "${item.vendor} ${item.name}"? This action cannot be undone.`,
      );

    if (!ok) {
      return;
    }

    try {
      await apiClient<{
        deleted: boolean;
      }>(
        `/software/${item.id}`,
        {
          method: "DELETE",
        },
      );

      notify(
        "Software deleted.",
      );

      if (
        selected?.id === item.id
      ) {
        setSelected(null);
      }

      if (
        editingId === item.id
      ) {
        resetForm();
      }

      await loadSoftware();
    } catch (err) {
      notify(
        getErrorMessage(
          err,
          "Could not delete the software.",
        ),
      );
    }
  }

  // ==========================
  // RESET FORM
  // ==========================

  function resetForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
    });

    setFormError("");
  }

  // ==========================
  // TOAST
  // ==========================

  function notify(
    message: string,
  ) {
    setToast(message);

    window.setTimeout(
      () => {
        setToast("");
      },
      2600,
    );
  }

  return (
    <>
      <section className="dataPanel">
        {/* ======================
            HEADER
        ====================== */}

        <div className="dataHead">
          <div>
            <h2>
              Software catalog
            </h2>

            <p>
              Manage software names, vendors, and current versions.
            </p>
          </div>

        </div>

        {/* ======================
            ADMIN CREATE / EDIT
        ====================== */}

        {isAdmin && (
          <form
            className={
              styles.formBar
            }
            onSubmit={submit}
          >
            <label>
              Software name

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name:
                      event.target
                        .value,
                  })
                }
                maxLength={120}
                required
                placeholder="Example: Mozilla Firefox"
              />
            </label>

            <label>
              Vendor

              <input
                type="text"
                value={
                  form.vendor
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    vendor:
                      event.target
                        .value,
                  })
                }
                maxLength={120}
                required
                placeholder="Example: Mozilla"
              />
            </label>

            <label>
              Version

              <input
                type="text"
                value={
                  form.currentVersion
                }
                onChange={(event) =>
                  setForm({
                    ...form,

                    currentVersion:
                      event.target
                        .value,
                  })
                }
                maxLength={80}
                placeholder="Optional"
              />
            </label>

            <div
              className={
                styles.formActions
              }
              style={{
                display: "flex",
                alignItems:
                  "flex-end",
                gap: 8,
              }}
            >
              <button
                type="submit"
                className="primary"
                disabled={saving}
                style={{
                  minWidth: 150,
                  minHeight: 34,
                  padding:
                    "0 14px",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "＋ Add software"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  disabled={
                    saving
                  }
                  style={{
                    minHeight: 34,
                    padding:
                      "0 14px",
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {formError && (
              <div
                className={
                  styles.formError
                }
              >
                {formError}
              </div>
            )}
          </form>
        )}

        {/* ======================
            SEARCH
        ====================== */}

        <div className="tableTools">
          <label>
            <span>⌕</span>

            <input
              type="text"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search by name, vendor, or version"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              void loadSoftware();
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>

        {/* ======================
            ERROR
        ====================== */}

        {error && (
          <div
            className={
              styles.stateBox
            }
          >
            <b>
              Could not load data
            </b>

            <p>{error}</p>

            <button
              type="button"
              className="primary"
              onClick={() =>
                void loadSoftware()
              }
            >
              Try again
            </button>
          </div>
        )}

        {/* ======================
            LOADING
        ====================== */}

        {loading &&
          !error && (
            <div
              className={
                styles.stateBox
              }
            >
              Loading software catalog...
            </div>
          )}

        {/* ======================
            TABLE
        ====================== */}

        {!loading &&
          !error && (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      SOFTWARE NAME
                    </th>

                    <th>
                      VENDOR
                    </th>

                    <th>
                      VERSION
                    </th>

                    <th>
                      PATCHES
                    </th>

                    <th>
                      INSTALLATIONS
                    </th>

                    {isAdmin && (
                      <th>
                        ACTIONS
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        onClick={() =>
                          void loadDetail(
                            item.id,
                          )
                        }
                      >
                        <td>
                          <button
                            type="button"
                            className="machineName"
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation();

                              void loadDetail(
                                item.id,
                              );
                            }}
                          >
                            ◫{" "}
                            {
                              item.name
                            }
                          </button>
                        </td>

                        <td>
                          {
                            item.vendor
                          }
                        </td>

                        <td>
                          {item.currentVersion ||
                            "—"}
                        </td>

                        <td>
                          {item
                            ._count
                            ?.patches ??
                            0}
                        </td>

                        <td>
                          {item
                            ._count
                            ?.installations ??
                            0}
                        </td>

                        {isAdmin && (
                          <td
                            className={
                              styles.actions
                            }
                            onClick={(
                              event,
                            ) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(
                                  item,
                                )
                              }
                              title="Edit software"
                              aria-label={`Edit ${item.name}`}
                            >
                              ✎
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void remove(
                                  item,
                                )
                              }
                              title="Delete software"
                              aria-label={`Delete ${item.name}`}
                            >
                              ⌫
                            </button>
                          </td>
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>

              {filtered.length ===
                0 && (
                <div className="empty">
                  No matching software found.
                </div>
              )}
            </div>
          )}

        {/* ======================
            TABLE FOOTER
        ====================== */}

        {!loading &&
          !error && (
            <div className="tableFoot">
              <span>
                Showing{" "}
                {
                  filtered.length
                }{" "}
                / {items.length}{" "}
                software items
              </span>

              <div>
                <button
                  type="button"
                  disabled
                >
                  ‹
                </button>

                <b>1</b>

                <button
                  type="button"
                  disabled
                >
                  ›
                </button>
              </div>
            </div>
          )}
      </section>

      {/* ======================
          DETAIL DRAWER
      ====================== */}

      {selected && (
        <div
          className="drawerBackdrop"
          onClick={() =>
            setSelected(null)
          }
        >
          <aside
            className="drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="drawerHead">
              <div>
                <small>
                  SOFTWARE DETAILS
                </small>

                <h2>
                  ◫{" "}
                  {
                    selected.name
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(
                    null,
                  )
                }
              >
                ×
              </button>
            </div>

            <dl>
              <div>
                <dt>
                  Vendor
                </dt>

                <dd>
                  {
                    selected.vendor
                  }
                </dd>
              </div>

              <div>
                <dt>
                  Current version
                </dt>

                <dd>
                  {selected.currentVersion ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>
                  Patch count
                </dt>

                <dd>
                  {selected
                    ._count
                    ?.patches ??
                    selected
                      .patches
                      ?.length ??
                    0}
                </dd>
              </div>

              <div>
                <dt>
                  Installations
                </dt>

                <dd>
                  {selected
                    ._count
                    ?.installations ??
                    0}
                </dd>
              </div>

              <div>
                <dt>
                  Last updated
                </dt>

                <dd>
                  {new Date(
                    selected.updatedAt,
                  ).toLocaleString(
                    "en-US",
                  )}
                </dd>
              </div>
            </dl>

            {selected.patches
              ?.length ? (
              <>
                <h3>
                  Related patches
                </h3>

                <div
                  className={
                    styles.patchList
                  }
                >
                  {selected.patches
                    .slice(0, 6)
                    .map(
                      (
                        patch,
                      ) => (
                        <span
                          key={
                            patch.id
                          }
                        >
                          {
                            patch.code
                          }{" "}
                          ·{" "}
                          {
                            patch.severity
                          }
                        </span>
                      ),
                    )}
                </div>
              </>
            ) : (
              <div className="infoBox">
                ⓘ No related patches are available.
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                className="drawerAction primary"
                onClick={() =>
                  startEdit(
                    selected,
                  )
                }
              >
                ✎ Edit software
              </button>
            )}
          </aside>
        </div>
      )}

      {/* ======================
          TOAST
      ====================== */}

      <div
        className={`toast ${
          toast
            ? "show"
            : ""
        }`}
      >
        ✓ {toast}
      </div>
    </>
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof ApiError &&
    Array.isArray(
      error.message,
    )
  ) {
    return error.message.join(
      ", ",
    );
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}
