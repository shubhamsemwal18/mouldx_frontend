"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SUPPORT_THREADS, SupportMessage } from "../data";
import styles from "./SupportChat.module.css";

export default function AdminSupportThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const thread = SUPPORT_THREADS.find((t) => t.id === id);
  const [messages, setMessages] = useState<SupportMessage[]>(thread?.messages ?? []);
  const [resolved, setResolved] = useState(thread?.status === "resolved");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!thread) {
    return (
      <div className={styles.notFound}>
        <p>Conversation not found.</p>
        <Link href="/admin/support" className={styles.backLink}>← Back to Support</Link>
      </div>
    );
  }

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `m${Date.now()}`, sender: "admin", text, time: "Just now" },
    ]);
    setDraft("");
    setResolved(false);
    // TODO: POST to API / socket
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <Link href="/admin/support" className={styles.backBtn} aria-label="Back to support list">←</Link>

        <div className={styles.avatarWrap}>
          <div className={styles.avatar} style={{ background: thread.color }}>{thread.initial}</div>
          {thread.online && <span className={styles.onlineDot} />}
        </div>

        <div className={styles.who}>
          <p className={styles.name}>
            {thread.name}
            <span className={`${styles.roleTag} ${thread.role === "owner" ? styles.roleOwner : styles.roleCustomer}`}>
              {thread.role === "owner" ? "Host" : "User"}
            </span>
          </p>
          <p className={styles.meta}>
            {thread.topic}
            {thread.bookingCode ? ` · ${thread.bookingCode}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setResolved((r) => !r)}
          className={`${styles.resolveBtn} ${resolved ? styles.resolveBtnDone : ""}`}
        >
          {resolved ? "Resolved" : "Mark resolved"}
        </button>
      </header>

      <div className={styles.messages}>
        {messages.map((m) => (
          <div key={m.id} className={m.sender === "admin" ? styles.rowMe : styles.rowOther}>
            <div className={m.sender === "admin" ? styles.bubbleMe : styles.bubbleOther}>
              <p className={styles.text}>{m.text}</p>
              <span className={m.sender === "admin" ? styles.timeMe : styles.timeOther}>{m.time}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputBar}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={`Reply to ${thread.name}...`}
          className={styles.input}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          className={styles.sendBtn}
          aria-label="Send reply"
        >
          →
        </button>
      </div>
    </div>
  );
}