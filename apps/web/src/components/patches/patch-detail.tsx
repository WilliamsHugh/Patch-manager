"use client";

import { PatchItem } from "./patch-table";
import { useState } from "react";
import { Role } from "@patch-management/shared";
import styles from "./patch-review.module.css";

interface PatchDetailProps {
  patch: PatchItem;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (patch: PatchItem) => void;
  reviewRole: Role | null;
  onSecurityReview: (note: string, decision: "DEPLOY" | "SKIP") => Promise<void>;
  onManagerDecision: (decision: "APPROVED" | "REJECTED") => Promise<void>;
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
  reviewRole,
  onSecurityReview,
  onManagerDecision,
}: PatchDetailProps) {
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"DEPLOY" | "SKIP">("DEPLOY");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");

  async function runReview(action: () => Promise<void>) {
    setReviewBusy(true);
    setReviewError("");
    try { await action(); }
    catch (error) { setReviewError(error instanceof Error ? error.message : "Could not save patch review."); }
    finally { setReviewBusy(false); }
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

          <section className={styles.review} aria-label="Patch review">
            <h3>Review</h3>
            <p><b>Status:</b> {(patch.patchStatus ?? "PENDING_REVIEW").replaceAll("_", " ")}</p>
            {patch.securityNote && <p><b>Security report:</b> {patch.securityNote}</p>}
            {patch.securityDecision && <p><b>Security recommendation:</b> {patch.securityDecision}</p>}
            {patch.managerDecision && <p><b>Manager decision:</b> {patch.managerDecision}</p>}
            {reviewRole === Role.SECURITY_ANALYST && (patch.patchStatus ?? "PENDING_REVIEW") === "PENDING_REVIEW" && (
              <form onSubmit={(event) => { event.preventDefault(); void runReview(() => onSecurityReview(note, decision)); }}>
                <label htmlFor="security-note">Security report</label>
                <textarea id="security-note" value={note} onChange={(event) => setNote(event.target.value)} minLength={10} maxLength={4000} required />
                <label htmlFor="security-decision">Recommendation</label>
                <select id="security-decision" value={decision} onChange={(event) => setDecision(event.target.value as "DEPLOY" | "SKIP")}>
                  <option value="DEPLOY">Recommend deployment</option><option value="SKIP">Skip patch</option>
                </select>
                <button className="drawerAction primary" disabled={reviewBusy}>Submit security review</button>
              </form>
            )}
            {reviewRole === Role.MANAGER && patch.patchStatus === "UNDER_REVIEW" && (
              <div className={styles.actions}>
                <button type="button" className="drawerAction primary" disabled={reviewBusy} onClick={() => void runReview(() => onManagerDecision("APPROVED"))}>Approve patch</button>
                <button type="button" className="drawerAction" disabled={reviewBusy} onClick={() => void runReview(() => onManagerDecision("REJECTED"))}>Reject patch</button>
              </div>
            )}
            {reviewError && <p role="alert" className={styles.error}>{reviewError}</p>}
          </section>

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
