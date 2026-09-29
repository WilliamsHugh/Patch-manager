"use client";

import { PatchSeverity } from "@patch-management/shared";

export interface PatchSoftware {
  id: string;
  name: string;
  vendor: string;
  currentVersion: string | null;
}

export interface PatchItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  version: string | null;
  severity: PatchSeverity;
  releasedAt: string;
  requiresRestart: boolean;
  softwareId: string;
  createdAt: string;
  software: PatchSoftware;
}

interface PatchTableProps {
  patches: PatchItem[];
  canManage: boolean;
  onEdit: (patch: PatchItem) => void;
  onView: (patch: PatchItem) => void;
  onDelete: (patch: PatchItem) => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function severityLabel(severity: PatchSeverity) {
  switch (severity) {
    case PatchSeverity.CRITICAL:
      return "Nghiêm trọng";
    case PatchSeverity.HIGH:
      return "Cao";
    case PatchSeverity.MEDIUM:
      return "Trung bình";
    case PatchSeverity.LOW:
      return "Thấp";
    default:
      return severity;
  }
}

export function PatchTable({
  patches,
  canManage,
  onEdit,
  onView,
  onDelete,
}: PatchTableProps) {
  return (
    <>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>MÃ BẢN VÁ</th>
              <th>TIÊU ĐỀ</th>
              <th>PHẦN MỀM</th>
              <th>MỨC ĐỘ</th>
              <th>PHIÊN BẢN</th>
              <th>NGÀY PHÁT HÀNH</th>
              <th>KHỞI ĐỘNG LẠI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>

          <tbody>
            {patches.map((patch) => (
              <tr key={patch.id}>
                <td>
                  <button
                    className="machineName"
                    type="button"
                    onClick={() => onView(patch)}
                  >
                    {patch.code}
                  </button>
                </td>

                <td>{patch.title}</td>

                <td>
                  <b>{patch.software.name}</b>
                  <div>
                    <small>{patch.software.vendor}</small>
                  </div>
                </td>

                <td>{severityLabel(patch.severity)}</td>

                <td>{patch.version ?? "—"}</td>

                <td>{formatDate(patch.releasedAt)}</td>

                <td>
                  {patch.requiresRestart ? "Có" : "Không"}
                </td>

                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onView(patch)}
                      style={{
                        border: 0,
                        background: "none",
                        color: "var(--azure)",
                        cursor: "pointer",
                      }}
                    >
                      Xem
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(patch)}
                          style={{
                            border: 0,
                            background: "none",
                            color: "var(--azure)",
                            cursor: "pointer",
                          }}
                        >
                          Chỉnh sửa
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(patch)}
                          style={{
                            border: 0,
                            background: "none",
                            color: "var(--red)",
                            cursor: "pointer",
                          }}
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tableFoot">
        <span>
          Tổng cộng: <b>{patches.length}</b> bản vá
        </span>
      </div>
    </>
  );
}