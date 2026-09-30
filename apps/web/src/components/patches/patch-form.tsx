"use client";

import { FormEvent, useEffect, useState } from "react";
import { PatchSeverity } from "@patch-management/shared";

import { PatchItem } from "./patch-table";

export interface SoftwareOption {
  id: string;
  name: string;
  vendor: string;
}

export interface PatchFormValue {
  code: string;
  title: string;
  description: string;
  version: string;
  severity: PatchSeverity;
  releasedAt: string;
  requiresRestart: boolean;
  softwareId: string;
}

interface PatchFormProps {
  patch: PatchItem | null;
  software: SoftwareOption[];
  saving: boolean;
  error: string | null;
  onSubmit: (data: PatchFormValue) => Promise<void>;
  onClose: () => void;
}

const emptyForm: PatchFormValue = {
  code: "",
  title: "",
  description: "",
  version: "",
  severity: PatchSeverity.MEDIUM,
  releasedAt: "",
  requiresRestart: false,
  softwareId: "",
};

function toDateInput(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function PatchForm({
  patch,
  software,
  saving,
  error,
  onSubmit,
  onClose,
}: PatchFormProps) {
  const [form, setForm] =
    useState<PatchFormValue>(emptyForm);

  useEffect(() => {
    if (patch) {
      setForm({
        code: patch.code,
        title: patch.title,
        description: patch.description ?? "",
        version: patch.version ?? "",
        severity: patch.severity,
        releasedAt: toDateInput(
          patch.releasedAt,
        ),
        requiresRestart:
          patch.requiresRestart,
        softwareId: patch.softwareId,
      });

      return;
    }

    setForm(emptyForm);
  }, [patch]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await onSubmit(form);
  }

  return (
    <div
      className="drawerBackdrop"
      onClick={onClose}
    >
      <div
        className="drawer"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="drawerHead">
          <div>
            <small>PATCH INVENTORY</small>

            <h2>
              {patch
                ? "Edit patch"
                : "Create patch"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close patch form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              className="loginError"
              style={{ marginTop: 20 }}
            >
              {error}
            </div>
          )}

          {/* PATCH CODE */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 22,
            }}
          >
            <b>Patch code *</b>

            <input
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
              placeholder="Example: CVE-2026-1234"
              required
            />
          </label>

          {/* TITLE */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 18,
            }}
          >
            <b>Title *</b>

            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Security update"
              required
            />
          </label>

          {/* SOFTWARE */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 18,
            }}
          >
            <b>Software *</b>

            <select
              value={form.softwareId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  softwareId:
                    event.target.value,
                }))
              }
              required
            >
              <option value="">
                Select software
              </option>

              {software.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name} — {item.vendor}
                </option>
              ))}
            </select>
          </label>

          {/* SEVERITY */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 18,
            }}
          >
            <b>Severity *</b>

            <select
              value={form.severity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  severity:
                    event.target
                      .value as PatchSeverity,
                }))
              }
              required
            >
              <option
                value={PatchSeverity.LOW}
              >
                Low
              </option>

              <option
                value={PatchSeverity.MEDIUM}
              >
                Medium
              </option>

              <option
                value={PatchSeverity.HIGH}
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
            <b>Version</b>

            <input
              value={form.version}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  version: event.target.value,
                }))
              }
              placeholder="Example: 129.0"
            />
          </label>

          {/* RELEASE DATE */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 18,
            }}
          >
            <b>Release date *</b>

            <input
              type="date"
              value={form.releasedAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  releasedAt:
                    event.target.value,
                }))
              }
              required
            />
          </label>

          {/* DESCRIPTION */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 18,
            }}
          >
            <b>Description</b>

            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description:
                    event.target.value,
                }))
              }
              rows={4}
              placeholder="Describe this patch..."
            />
          </label>

          {/* RESTART */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 18,
            }}
          >
            <input
              type="checkbox"
              checked={
                form.requiresRestart
              }
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requiresRestart:
                    event.target.checked,
                }))
              }
            />

            <span>
              Device restart required
            </span>
          </label>

          {/* ACTIONS */}
          <div style={{ marginTop: 30 }}>
            <button
              type="submit"
              className="drawerAction primary"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : patch
                  ? "Save changes"
                  : "Create patch"}
            </button>

            <button
              type="button"
              className="drawerAction"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
