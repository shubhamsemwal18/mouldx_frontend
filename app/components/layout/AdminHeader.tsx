"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLogout } from "@/app/lib/use-logout";
import { useAdminNotifications } from "@/app/lib/admin-notification-context";
import { formatNotificationTime } from "@/app/lib/admin-notification-api";
import { getApiErrorMessage } from "@/app/lib/api";
import styles from "./AdminHeader.module.css";

export default function AdminHeader() {
  const { handleLogout, loggingOut, logoutError } = useLogout("/login");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const [actionError, setActionError] = useState("");
  const { recent, unreadCount, loading, error, busy, refresh, markRead, markAllRead } = useAdminNotifications();
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setNotifOpen(false); setUserOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <header className={styles.header}>
      <span className={styles.spacer} />

      <div className={styles.actions}>
        {/* ---------- Notifications ---------- */}
        <div className={styles.dropdownWrap}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((p) => !p);
              setUserOpen(false);
              if (!notifOpen) void refresh();
            }}
            className={styles.iconBtn}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-controls="admin-notifications-menu"
          >
            🔔
            {unreadCount > 0 && <span className={styles.badge} aria-label={`${unreadCount} unread notifications`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>

          {notifOpen && (
            <>
              <div className={styles.backdrop} onClick={() => setNotifOpen(false)} />
              <div className={styles.notifDropdown} id="admin-notifications-menu">
                <div className={styles.notifHeader}>
                  <span className={styles.notifTitle}>Notifications</span>
                  <Link
                    href="/admin/activity"
                    onClick={() => setNotifOpen(false)}
                    className={styles.notifViewAll}
                  >
                    View all →
                  </Link>
                </div>
                {loading && recent.length === 0 && <p className={styles.notifState} role="status">Loading notifications...</p>}
                {!loading && !error && recent.length === 0 && <p className={styles.notifState}>No notifications yet.</p>}
                {recent.map((n) => (
                  <Link key={n._id} href={n.href} className={styles.notifRow} onClick={() => {
                    setNotifOpen(false); setActionError("");
                    if (!n.readAt && !busy) void markRead([n._id]).catch((err) => setActionError(getApiErrorMessage(err)));
                  }}>
                    <span
                      className={`${styles.notifDot} ${
                        n.readAt ? styles.dotRead : n.tone === "amber" ? styles.dotAmber : styles.dotCyan
                      }`}
                    />
                    <div>
                      <p className={styles.notifText}>{n.title}</p>
                      <p className={styles.notifMeta}>{formatNotificationTime(n.createdAt)}</p>
                    </div>
                  </Link>
                ))}
                {(error || actionError) && <div className={styles.notifState}><p role="alert">{actionError || error}</p><button type="button" className={styles.notifViewAll} onClick={() => { setActionError(""); void refresh(); }}>Try again</button></div>}
                <div className={styles.notifFooter}>
                  <button type="button" className={styles.notifViewAll} disabled={busy || unreadCount === 0} onClick={() => {
                    setActionError("");
                    void markAllRead().catch((err) => setActionError(getApiErrorMessage(err)));
                  }}>Mark all as read</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ---------- User menu ---------- */}
        <div className={styles.dropdownWrap}>
          <button
            type="button"
            onClick={() => {
              setUserOpen((p) => !p);
              setNotifOpen(false);
            }}
            className={styles.userBtn}
            aria-label="Account menu"
          >
            <span className={styles.userAvatar}>A</span>
          </button>

          {userOpen && (
            <>
              <div className={styles.backdrop} onClick={() => setUserOpen(false)} />
              <div className={styles.userDropdown}>
                <div className={styles.userInfo}>
                  <p className={styles.userName}>Admin</p>
                  <p className={styles.userEmail}>admin@mouldx.com</p>
                </div>
                <Link
                  href="/admin/profile"
                  onClick={() => setUserOpen(false)}
                  className={styles.userMenuItem}
                >
                  👤 Profile
                </Link>
                <button type="button" onClick={handleLogout} disabled={loggingOut} className={styles.userMenuItemDanger}>
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
                {logoutError && <p role="alert">{logoutError}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
