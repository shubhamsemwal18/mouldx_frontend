"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SUPPORT_THREADS } from "./data";
import styles from "./SupportInbox.module.css";

type TabKey = "all" | "unread" | "resolved";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "resolved", label: "Resolved" },
];

export default function AdminSupportPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return SUPPORT_THREADS.filter((t) => {
      if (tab === "unread" && t.unreadCount === 0) return false;
      if (tab === "resolved" && t.status !== "resolved") return false;
      if (tab !== "resolved" && tab !== "all" && t.status === "resolved") return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q) ||
        (t.bookingCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [tab, query]);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Support</h1>
        <p className={styles.sub}>Users and hosts who wrote to MouldX Support</p>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, topic or booking code"
          className={styles.search}
        />

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`${styles.tabBtn} ${tab === t.key ? styles.tabBtnActive : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

      </div>

      <div className={styles.list}>
        {filtered.map((t) => {
          const last = t.messages[t.messages.length - 1];
          return (
            <Link key={t.id} href={`/admin/support/${t.id}`} className={styles.card}>
              <div className={styles.avatar} style={{ background: t.color }}>
                {t.initial}
              </div>

              <div className={styles.cardInfo}>
                <div className={styles.nameRow}>
                  <p className={styles.cardName}>{t.name}</p>
                  <span className={`${styles.roleTag} ${t.role === "owner" ? styles.roleOwner : styles.roleCustomer}`}>
                    {t.role === "owner" ? "Host" : "User"}
                  </span>
                </div>
                <p className={styles.cardMeta}>
                  {t.topic}
                  {t.bookingCode ? ` · ${t.bookingCode}` : ""}
                </p>
                <p className={styles.cardMessage}>
                  {last.sender === "admin" ? "You: " : ""}
                  {last.text}
                </p>
              </div>

              <div className={styles.right}>
                <span className={styles.time}>{last.time}</span>
                {t.unreadCount > 0 ? (
                  <span className={styles.unreadBadge}>{t.unreadCount}</span>
                ) : t.status === "resolved" ? (
                  <span className={styles.resolvedBadge}>Resolved</span>
                ) : null}
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && <p className={styles.emptyText}>No conversations found.</p>}
      </div>
    </div>
  );
}