"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, getCachedApiData } from "@/lib/api";
import { DashboardActionButton } from "@/components/ui/dashboard-action-button";
import styles from "./notifications.module.css";

type Notification = {
  id: string;
  title: string;
  message: string;
  status: "UNREAD" | "READ";
  createdAt: string;
};

function broadcastCount(items: Notification[]) {
  window.dispatchEvent(new CustomEvent("patch:notifications-updated", {
    detail: items.filter((item) => item.status === "UNREAD").length,
  }));
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(() => getCachedApiData<Notification[]>("/notifications") ?? []);
  const [loading, setLoading] = useState(() => getCachedApiData<Notification[]>("/notifications") === undefined);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = useMemo(() => items.filter((item) => item.status === "UNREAD").length, [items]);

  const refresh = useCallback(async (force = false) => {
    const cached = force ? undefined : getCachedApiData<Notification[]>("/notifications");
    if (cached) {
      setItems(cached);
      setLoading(false);
      broadcastCount(cached);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiClient<Notification[]>("/notifications", force ? { cache: "reload" } : {});
      setItems(result);
      broadcastCount(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function markRead(item: Notification) {
    if (item.status === "READ" || savingId || markingAll) return;
    setSavingId(item.id);
    setError("");
    try {
      await apiClient(`/notifications/${item.id}/read`, { method: "PATCH" });
      setItems((current) => {
        const next = current.map((entry) => entry.id === item.id ? { ...entry, status: "READ" as const } : entry);
        broadcastCount(next);
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not mark notification as read.");
    } finally {
      setSavingId(null);
    }
  }

  async function markAllRead() {
    if (!unreadCount || markingAll || savingId) return;
    setMarkingAll(true);
    setError("");
    try {
      await apiClient("/notifications/read-all", { method: "POST" });
      setItems((current) => {
        const next = current.map((item) => ({ ...item, status: "READ" as const }));
        broadcastCount(next);
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  return <section className={`dataPanel ${styles.panel}`} aria-label="Notifications">
    <div className="dataHead">
      <div><h2>Notifications</h2><p>Updates and requests for your account.</p></div>
      <div className={styles.actions}>
        <DashboardActionButton onClick={() => void refresh(true)} disabled={loading}>Refresh</DashboardActionButton>
        <button type="button" className={styles.markAll} onClick={() => void markAllRead()} disabled={loading || !unreadCount || markingAll || Boolean(savingId)}>{markingAll ? "Saving..." : "Mark all as read"}</button>
      </div>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading ? <p className="panelMessage" role="status">Loading notifications...</p> : items.length === 0 ? <p className="panelMessage">No notifications yet.</p> : <ul className={styles.list}>
      {[...items].sort((a, b) => Number(b.status === "UNREAD") - Number(a.status === "UNREAD") || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((item) => <li key={item.id} className={item.status === "UNREAD" ? styles.unread : ""}>
        <button type="button" onClick={() => void markRead(item)} disabled={item.status === "READ" || savingId === item.id || markingAll} aria-label={`${item.status === "UNREAD" ? "Mark as read: " : "Read notification: "}${item.title}`}>
          <span className={styles.title}>{item.title}{item.status === "UNREAD" && <span className={styles.badge}>Unread</span>}</span>
          <span className={styles.message}>{item.message}</span>
          <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("en-US")}</time>
        </button>
      </li>)}
    </ul>}
  </section>;
}
