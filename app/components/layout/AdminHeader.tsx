"use client";

import { useState } from "react";
import Link from "next/link";
import { useLogout } from "@/app/lib/use-logout";
import styles from "./AdminHeader.module.css";

interface ActivityItem {
  text: string;
  meta: string;
  tone: "cyan" | "amber";
}

// TEMP dummy data — real activity-log API se aayega
const RECENT_NOTIFICATIONS: ActivityItem[] = [
  { text: "KYC approved — Sharma Industries", meta: "10:41 AM", tone: "cyan" },
  { text: "Listing MX-000123 approved", meta: "10:12 AM", tone: "cyan" },
  { text: "Damage claim BK-24102 settled", meta: "Yesterday, 5:02 PM", tone: "cyan" },
  { text: "Booking BK-24611 flagged for manual check", meta: "Pending", tone: "amber" },
];

export default function AdminHeader() {
  const { handleLogout, loggingOut, logoutError } = useLogout("/login");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const pendingCount = RECENT_NOTIFICATIONS.filter((n) => n.tone === "amber").length;

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
            }}
            className={styles.iconBtn}
            aria-label="Notifications"
          >
            🔔
            {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
          </button>

          {notifOpen && (
            <>
              <div className={styles.backdrop} onClick={() => setNotifOpen(false)} />
              <div className={styles.notifDropdown}>
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
                {RECENT_NOTIFICATIONS.map((n, i) => (
                  <div key={i} className={styles.notifRow}>
                    <span
                      className={`${styles.notifDot} ${
                        n.tone === "amber" ? styles.dotAmber : styles.dotCyan
                      }`}
                    />
                    <div>
                      <p className={styles.notifText}>{n.text}</p>
                      <p className={styles.notifMeta}>{n.meta}</p>
                    </div>
                  </div>
                ))}
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
