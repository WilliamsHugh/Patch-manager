"use client";

import { PatchItem } from "./patch-table";

interface PatchDetailProps {
  patch: PatchItem;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (patch: PatchItem) => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US");
}

function severityLabel(
  severity: PatchItem["severity"],
) {
  switch (severity) {
    case "CRITICAL":
      return "Critical";

    case "HIGH":
      return "High";

    case "MEDIUM":
      return "Medium";

    case "LOW":
      return "Low";

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
            aria-label="Close patch details"
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: 24 }}>
          <p>
            <b>Title:</b>
            <br />
            {patch.title}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Software:</b>
            <br />
            {patch.software.name} —{" "}
            {patch.software.vendor}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Severity:</b>
            <br />
            {severityLabel(
              patch.severity,
            )}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Version:</b>
            <br />
            {patch.version ?? "—"}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Release date:</b>
            <br />
            {formatDate(
              patch.releasedAt,
            )}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Restart required:</b>
            <br />
            {patch.requiresRestart
              ? "Yes"
              : "No"}
          </p>

          <p style={{ marginTop: 16 }}>
            <b>Description:</b>
            <br />
            {patch.description ||
              "No description available."}
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
                Edit
              </button>
            )}

            <button
              type="button"
              className="drawerAction"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
