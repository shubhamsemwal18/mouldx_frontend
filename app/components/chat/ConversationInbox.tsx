"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { chatTimestamp } from "@/app/lib/chat-format";
import { formatBookingDate } from "@/app/lib/booking-dates";
import { useConversationInbox } from "./useConversationInbox";
import type { ConversationFilters } from "@/app/lib/chat-types";
import styles from "./Chat.module.css";

export default function ConversationInbox({
  admin = false,
  ownerArea = false,
}: {
  admin?: boolean;
  ownerArea?: boolean;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState("all");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(input.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [input]);
  const filters: ConversationFilters = {
    search,
    ...(admin
      ? { filter: tab as ConversationFilters["filter"] }
      : { kind: tab === "all" ? undefined : (tab as "booking" | "support") }),
  };
  const query = useConversationInbox(filters, admin, user?._id);
  const { loadMore, loading, error } = query;
  const hasMore = query.data?.pagination.hasMore;
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore || loading || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, error, loadMore]);
  const tabs = admin
    ? [
        { key: "all", label: "All" },
        { key: "unread", label: "Unread" },
      ]
    : [
        { key: "all", label: "All" },
        { key: "booking", label: "Booking" },
        { key: "support", label: "Support" },
      ];
  const base = admin ? "/admin/support" : ownerArea ? "/owner/inbox" : "/inbox";
  return (
    <div className={`${styles.inbox} ${admin ? styles.adminInbox : ""}`}>
      <div className={styles.inboxHeading}>
        <h1>{admin ? "Support" : "Inbox"}</h1>
        <button
          className={styles.iconButton}
          onClick={query.refresh}
          disabled={query.loading}
          aria-label="Refresh inbox"
          title="Refresh inbox"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      {admin ? (
        <div className={styles.searchRow}>
          <div className={styles.search}>
            <Search size={18} />
            <input
              aria-label="Search conversations"
              placeholder="Search name, product or booking"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={100}
            />
          </div>
          <select
            className={styles.filterSelect}
            aria-label="Conversation filter"
            value={tab}
            onChange={(e) => setTab(e.target.value)}
          >
            {tabs.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className={styles.search}>
            <Search size={18} />
            <input
              aria-label="Search conversations"
              placeholder="Search product or booking"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={100}
            />
          </div>
          <div
            className={styles.tabs}
            role="group"
            aria-label="Conversation filters"
          >
            {tabs.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={tab === option.key}
                onClick={() => setTab(option.key)}
                className={tab === option.key ? styles.activeTab : ""}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
      {query.loading && !query.data && (
        <p className={styles.state} role="status">
          Loading conversations...
        </p>
      )}
      {query.error && !query.data && (
        <div className={styles.error} role="alert">
          {query.error}
          <button onClick={query.retry}>Try again</button>
        </div>
      )}
      <div className={styles.threadList}>
        {query.data?.conversations.map((thread) => (
          <Link
            key={thread._id}
            href={`${base}/${thread._id}`}
            className={`${styles.threadCard} ${thread.unreadCount > 0 ? styles.threadUnread : ""}`}
          >
            <span
              className={`${styles.avatar} ${thread.kind === "support" ? styles.supportAvatar : ""}`}
            >
              {thread.kind === "support" ? (
                <ShieldCheck size={21} />
              ) : (
                <MessageCircle size={21} />
              )}
            </span>
            <div className={styles.threadInfo}>
              <div className={styles.threadName}>
                <h2>{thread.title}</h2>
                {admin && (
                  <span className={styles.roleTag}>
                    {thread.party === "host" ? "Host" : "Customer"}
                  </span>
                )}
              </div>
              <p className={styles.threadMeta}>
                {thread.booking.code}
                {thread.booking.startDate
                  ? ` · ${formatBookingDate(thread.booking.startDate)}`
                  : ""}
              </p>
              <p className={styles.threadProduct}>
                {thread.booking.product.name}
              </p>
              <p className={styles.preview}>
                {thread.lastMessage
                  ? `${thread.lastMessage.fromMe ? "You: " : ""}${thread.lastMessage.text}`
                  : "No messages yet"}
              </p>
            </div>
            <div className={styles.threadAside}>
              <time dateTime={thread.lastActivityAt}>
                {chatTimestamp(thread.lastActivityAt, true)}
              </time>
              {thread.unreadCount > 0 ? (
                <span
                  className={styles.unread}
                  aria-label={`${thread.unreadCount} unread messages`}
                >
                  {thread.unreadCount}
                </span>
              ) : thread.status === "resolved" ? (
                <span className={styles.resolvedTag}>Resolved</span>
              ) : thread.kind === "support" ? (
                <span className={styles.supportTag}>Support</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
      {query.data?.conversations.length === 0 && (
        <div className={styles.empty}>
          <MessageCircle size={36} strokeWidth={1.5} />
          <h2>No conversations found</h2>
        </div>
      )}
      {query.data && query.data.conversations.length > 0 && (
        <div ref={sentinel} className={styles.loadMore}>
          {query.error ? (
            <div className={styles.error} role="alert">
              {query.error}
              <button onClick={query.retry}>Try again</button>
            </div>
          ) : (
            <p role="status">
              {query.loadingMore
                ? "Loading more conversations..."
                : `${query.data.conversations.length} of ${query.data.pagination.total} conversations`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
