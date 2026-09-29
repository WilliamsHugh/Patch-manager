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
                ? "Chỉnh sửa bản vá"
                : "Tạo bản vá"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
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

          {/* MÃ BẢN VÁ */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 22,
            }}
          >
            <b>Mã bản vá *</b>

            <input
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
              placeholder="Ví dụ: CVE-2026-1234"
              required
            />
          </label>

          {/* TIÊU ĐỀ */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 18,
            }}
          >
            <b>Tiêu đề *</b>

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

          {/* PHẦN MỀM */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 18,
            }}
          >
            <b>Phần mềm *</b>

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
                Chọn phần mềm
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
            <b>Mức độ *</b>

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
                Thấp
              </option>

              <option
                value={PatchSeverity.MEDIUM}
              >
                Trung bình
              </option>

              <option
                value={PatchSeverity.HIGH}
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
            <b>Phiên bản</b>

            <input
              value={form.version}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  version: event.target.value,
                }))
              }
              placeholder="Ví dụ: 129.0"
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
            <b>Ngày phát hành *</b>

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
            <b>Mô tả</b>

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
              placeholder="Mô tả nội dung bản vá..."
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
              Yêu cầu khởi động lại thiết bị
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
                ? "Đang lưu..."
                : patch
                  ? "Lưu thay đổi"
                  : "Tạo bản vá"}
            </button>

            <button
              type="button"
              className="drawerAction"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}