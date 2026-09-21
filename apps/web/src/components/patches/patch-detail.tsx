"use client";

import { PatchItem } from "./patch-table";

interface PatchDetailProps {
  patch: PatchItem;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (patch: PatchItem) => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function severityLabel(
  severity: PatchItem["severity"],
) {
  switch (severity) {
    case "CRITICAL":
      return "Nghiêm trọng";

    case "HIGH":
      return "Cao";

    case "MEDIUM":
      return "Trung bình";

    case "LOW":
      return "Thấp";

    default:
      return severity;
  }
}

export function PatchDetail({
  patch,
  canEdit,
  onClose,
  onEdit,
}: PatchDetailProps) {
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
            <small>PATCH DETAIL</small>

            <h2>{patch.code}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: 24 }}>
          <p>
            <b>Tiêu đề:</b>
            <br />
            {patch.title}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Phần mềm:</b>
            <br />
            {patch.software.name} —{" "}
            {patch.software.vendor}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Mức độ:</b>
            <br />
            {severityLabel(
              patch.severity,
            )}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Phiên bản:</b>
            <br />
            {patch.version ?? "—"}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Ngày phát hành:</b>
            <br />
            {formatDate(
              patch.releasedAt,
            )}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Khởi động lại:</b>
            <br />
            {patch.requiresRestart
              ? "Có"
              : "Không"}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Mô tả:</b>
            <br />
            {patch.description ||
              "Không có mô tả."}
          </p>

          <div style={{ marginTop: 30 }}>
            {canEdit && (
              <button
                type="button"
                className="drawerAction primary"
                onClick={() =>
                  onEdit(patch)
                }
              >
                Chỉnh sửa
              </button>
            )}

            <button
              type="button"
              className="drawerAction"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}