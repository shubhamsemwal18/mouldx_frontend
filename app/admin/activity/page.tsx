"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCheck, ChevronLeft, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import { adminNotificationApi, formatNotificationTime, type AdminNotificationList } from "@/app/lib/admin-notification-api";
import { useAdminNotifications } from "@/app/lib/admin-notification-context";
import { getApiErrorMessage } from "@/app/lib/api";
import styles from "./ActivityLog.module.css";

export default function ActivityLogPage() {
  const { unreadCount, version, busy, refresh, markRead, markAllRead, remove } = useAdminNotifications();
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<AdminNotificationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectPage = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setLoadError("");
      try {
        const result = await adminNotificationApi.list({ page, limit: 20 }, controller.signal);
        if (controller.signal.aborted) return;
        if (page > Math.max(1, result.pagination.pages)) { setPage(Math.max(1, result.pagination.pages)); return; }
        setData(result);
        setSelected((current) => new Set(result.notifications.filter((n) => current.has(n._id)).map((n) => n._id)));
      } catch (err) {
        if (!controller.signal.aborted) setLoadError(getApiErrorMessage(err, "Could not load notifications"));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [page, version, reload]);

  const notifications = data?.notifications || [];
  const allSelected = notifications.length > 0 && notifications.every((n) => selected.has(n._id));
  useEffect(() => {
    if (selectPage.current) selectPage.current.indeterminate = selected.size > 0 && !allSelected;
  }, [selected, allSelected]);

  const act = async (action: "read" | "readAll" | "delete") => {
    setActionError(""); setNotice("");
    try {
      if (action === "delete") {
        const count = await remove([...selected]);
        setSelected(new Set());
        setNotice(`${count} notification${count === 1 ? "" : "s"} permanently deleted.`);
      } else {
        if (action === "readAll") await markAllRead();
        else await markRead([...selected]);
        setNotice(action === "readAll" ? "All notifications marked as read." : "Selected notifications marked as read.");
      }
    } catch (err) { setActionError(getApiErrorMessage(err)); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Admin Activity Log</h1>
        <span className={styles.pill}>{unreadCount} UNREAD</span>
      </div>
      <div className={styles.toolbar}>
        <label className={styles.selection}>
          <input ref={selectPage} type="checkbox" className={styles.checkbox} checked={allSelected} disabled={loading || busy || notifications.length === 0}
            onChange={(event) => setSelected(event.target.checked ? new Set(notifications.map((n) => n._id)) : new Set())} />
          Select this page{selected.size > 0 ? ` (${selected.size})` : ""}
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.actionButton} disabled={busy || unreadCount === 0} onClick={() => void act("readAll")}><CheckCheck size={15} />Mark all as read</button>
          {selected.size > 0 && <button type="button" className={styles.actionButton} disabled={busy || loading} onClick={() => void act("read")}><CheckCheck size={15} />Mark selected as read</button>}
          <button type="button" className={`${styles.actionButton} ${styles.deleteButton}`} disabled={busy || loading || selected.size === 0}
            onClick={() => void act("delete")}><Trash2 size={15} />Delete selected</button>
          <button type="button" className={styles.actionButton} aria-label="Refresh notifications" title="Refresh notifications" disabled={loading || busy}
            onClick={() => { setReload((v) => v + 1); void refresh(); }}><RefreshCw size={15} /></button>
        </div>
      </div>
      {actionError && <p className={styles.error} role="alert">{actionError}</p>}
      {notice && <p className={styles.feedback} role="status">{notice}</p>}
      <div className={styles.card} aria-busy={loading || busy}>
        {loadError && <div className={styles.state}><p className={styles.error} role="alert">{loadError}</p><button type="button" className={styles.actionButton} onClick={() => setReload((v) => v + 1)}>Try again</button></div>}
        {loading && !data && <p className={styles.state} role="status">Loading notifications...</p>}
        {!loading && !loadError && notifications.length === 0 && <p className={styles.state}>No notifications yet.</p>}
        {notifications.map((entry, index) => (
          <div key={entry._id} className={`${styles.row} ${index < notifications.length - 1 ? styles.rowBorder : ""}`}>
            <input type="checkbox" className={styles.checkbox} aria-label={`Select notification: ${entry.title}`} checked={selected.has(entry._id)} disabled={loading || busy}
              onChange={(event) => setSelected((current) => {
                const next = new Set(current);
                if (event.target.checked) next.add(entry._id); else next.delete(entry._id);
                return next;
              })} />
            <span className={`${styles.dot} ${entry.readAt ? styles.dotRead : entry.tone === "amber" ? styles.dotAmber : styles.dotCyan}`} aria-label={entry.readAt ? "Read" : "Unread"} />
            <div className={styles.content}>
              <Link href={entry.href} className={styles.text} onClick={() => {
                if (!entry.readAt && !busy) void markRead([entry._id]).catch((err) => setActionError(getApiErrorMessage(err)));
              }}>{entry.title}</Link>
              <p className={styles.meta}>By {entry.actorLabel} · <time dateTime={entry.createdAt}>{formatNotificationTime(entry.createdAt)}</time></p>
            </div>
          </div>
        ))}
      </div>
      {data && data.pagination.total > 0 && <div className={styles.pagination}>
        <span>{data.pagination.total} notification{data.pagination.total === 1 ? "" : "s"} · Page {page} of {Math.max(1, data.pagination.pages)}</span>
        <div className={styles.actions}>
          <button type="button" className={styles.actionButton} aria-label="Previous page" disabled={busy || loading || page === 1} onClick={() => { setSelected(new Set()); setPage((p) => p - 1); }}><ChevronLeft size={16} /></button>
          <button type="button" className={styles.actionButton} aria-label="Next page" disabled={busy || loading || !data.pagination.hasNextPage} onClick={() => { setSelected(new Set()); setPage((p) => p + 1); }}><ChevronRight size={16} /></button>
        </div>
      </div>}
    </div>
  );
}
