"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Package,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { chatApi } from "@/app/lib/chat-api";
import { getApiErrorMessage } from "@/app/lib/api";
import { chatDay, chatTimestamp } from "@/app/lib/chat-format";
import { useAuth } from "@/app/lib/auth-context";
import type { ChatMessage, Conversation } from "@/app/lib/chat-types";
import styles from "./Chat.module.css";

interface ThreadData {
  thread: Conversation;
  messages: ChatMessage[];
  hasOlder: boolean;
  before: number | null;
  fetchedThrough: number;
}
const mergeMessages = (...groups: ChatMessage[][]) =>
  [
    ...new Map(groups.flat().map((message) => [message._id, message])).values(),
  ].sort((a, b) => a.sequence - b.sequence);

export default function ConversationThread({
  id,
  admin = false,
  ownerArea = false,
}: {
  id: string;
  admin?: boolean;
  ownerArea?: boolean;
}) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <ThreadContent
      key={`${user._id}:${id}:${admin}`}
      id={id}
      admin={admin}
      ownerArea={ownerArea}
    />
  );
}

function ThreadContent({
  id,
  admin,
  ownerArea,
}: {
  id: string;
  admin: boolean;
  ownerArea: boolean;
}) {
  const base = admin ? "/admin/support" : ownerArea ? "/owner/inbox" : "/inbox";
  const [data, setData] = useState<ThreadData>();
  const [attempt, setAttempt] = useState(0);
  const [initialError, setInitialError] = useState<{
    attempt: number;
    message: string;
  }>();
  const [error, setError] = useState("");
  const [readWarning, setReadWarning] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<
    "older" | "refresh" | "send" | "status" | null
  >(null);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const olderSentinel = useRef<HTMLDivElement>(null);
  const pendingMessage = useRef<{
    text: string;
    clientMessageId: string;
  } | null>(null);
  const scrollPlan = useRef<
    { kind: "bottom" } | { kind: "prepend"; height: number; top: number } | null
  >(null);

  const acknowledge = useCallback(
    async (sequence: number, signal?: AbortSignal) => {
      try {
        await chatApi.read(id, sequence, admin);
        if (!signal?.aborted) setReadWarning("");
      } catch {
        if (!signal?.aborted)
          setReadWarning(
            "Read status could not be updated. Refresh to try again.",
          );
      }
    },
    [id, admin],
  );
  useEffect(() => {
    const lifecycle = new AbortController();
    controller.current = lifecycle;
    Promise.all([
      chatApi.get(id, admin, lifecycle.signal),
      chatApi.messages(id, {}, admin, lifecycle.signal),
    ]).then(
      ([thread, page]) => {
        if (lifecycle.signal.aborted) return;
        scrollPlan.current = { kind: "bottom" };
        setData({
          thread,
          messages: page.messages,
          hasOlder: page.pagination.hasMore,
          before: page.pagination.before,
          fetchedThrough: page.messages.at(-1)?.sequence || 0,
        });
        void acknowledge(page.messages.at(-1)?.sequence || 0, lifecycle.signal);
      },
      (err) => {
        if (!lifecycle.signal.aborted)
          setInitialError({
            attempt,
            message: getApiErrorMessage(err, "Conversation not found."),
          });
      },
    );
    return () => lifecycle.abort();
  }, [id, admin, attempt, acknowledge]);

  useLayoutEffect(() => {
    const element = scroller.current;
    const plan = scrollPlan.current;
    if (!element || !plan) return;
    element.scrollTop =
      plan.kind === "bottom"
        ? element.scrollHeight
        : plan.top + element.scrollHeight - plan.height;
    scrollPlan.current = null;
  }, [data?.messages]);

  const loadOlder = useCallback(async () => {
    const signal = controller.current?.signal;
    if (
      !data?.hasOlder ||
      !data.before ||
      !scroller.current ||
      inFlight.current ||
      signal?.aborted
    )
      return;
    inFlight.current = true;
    setBusy("older");
    setError("");
    const position = {
      kind: "prepend" as const,
      height: scroller.current.scrollHeight,
      top: scroller.current.scrollTop,
    };
    try {
      const page = await chatApi.messages(
        id,
        { before: data.before },
        admin,
        signal,
      );
      if (signal?.aborted) return;
      position.top = scroller.current?.scrollTop ?? position.top;
      scrollPlan.current = position;
      setData(
        (previous) =>
          previous && {
            ...previous,
            messages: mergeMessages(page.messages, previous.messages),
            hasOlder: page.pagination.hasMore,
            before: page.pagination.before,
          },
      );
    } catch (err) {
      if (!signal?.aborted)
        setError(getApiErrorMessage(err, "Unable to load earlier messages."));
    } finally {
      if (!signal?.aborted) {
        inFlight.current = false;
        setBusy(null);
      }
    }
  }, [data, id, admin]);
  useEffect(() => {
    const target = olderSentinel.current;
    const root = scroller.current;
    if (!data?.hasOlder || !target || !root || busy || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadOlder();
      },
      { root, rootMargin: "80px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [data?.hasOlder, busy, error, loadOlder]);

  const refresh = async () => {
    const signal = controller.current?.signal;
    if (!data || inFlight.current || signal?.aborted) return;
    inFlight.current = true;
    setBusy("refresh");
    setError("");
    const element = scroller.current;
    const atBottom =
      !element ||
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    try {
      const thread = await chatApi.get(id, admin, signal);
      let after = data.fetchedThrough;
      const incoming: ChatMessage[] = [];
      let target: number | undefined;
      do {
        const page = await chatApi.messages(id, { after }, admin, signal);
        if (signal?.aborted) return;
        target ??= page.latestSequence;
        incoming.push(...page.messages);
        if (!page.pagination.after || page.pagination.after <= after) break;
        after = page.pagination.after;
        if (!page.pagination.hasMore) break;
      } while (after < target);
      if (atBottom) scrollPlan.current = { kind: "bottom" };
      setData(
        (previous) =>
          previous && {
            ...previous,
            thread,
            messages: mergeMessages(previous.messages, incoming),
            fetchedThrough: after,
          },
      );
      await acknowledge(after, signal);
    } catch (err) {
      if (!signal?.aborted)
        setError(
          getApiErrorMessage(err, "Unable to refresh this conversation."),
        );
    } finally {
      if (!signal?.aborted) {
        inFlight.current = false;
        setBusy(null);
      }
    }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    const signal = controller.current?.signal;
    if (
      !text ||
      text.length > 4000 ||
      !data?.thread.canSend ||
      inFlight.current ||
      signal?.aborted
    )
      return;
    if (pendingMessage.current?.text !== text)
      pendingMessage.current = { text, clientMessageId: crypto.randomUUID() };
    inFlight.current = true;
    setBusy("send");
    setError("");
    try {
      const message = await chatApi.send(
        id,
        text,
        pendingMessage.current.clientMessageId,
        admin,
      );
      if (signal?.aborted) return;
      scrollPlan.current = { kind: "bottom" };
      setData(
        (previous) =>
          previous && {
            ...previous,
            thread: { ...previous.thread, status: "open" },
            messages: mergeMessages(previous.messages, [message]),
          },
      );
      setDraft("");
      pendingMessage.current = null;
    } catch (err) {
      if (!signal?.aborted)
        setError(
          getApiErrorMessage(err, "Message could not be sent. Try again."),
        );
    } finally {
      if (!signal?.aborted) {
        inFlight.current = false;
        setBusy(null);
      }
    }
  };
  const toggleStatus = async () => {
    const signal = controller.current?.signal;
    if (!data || !admin || inFlight.current || signal?.aborted) return;
    inFlight.current = true;
    setBusy("status");
    setError("");
    try {
      const thread = await chatApi.status(
        id,
        data.thread.status === "open" ? "resolved" : "open",
        true,
      );
      if (!signal?.aborted)
        setData((previous) => previous && { ...previous, thread });
    } catch (err) {
      if (!signal?.aborted)
        setError(getApiErrorMessage(err, "Unable to update support status."));
    } finally {
      if (!signal?.aborted) {
        inFlight.current = false;
        setBusy(null);
      }
    }
  };

  if (!data)
    return (
      <div className={styles.state}>
        {initialError?.attempt === attempt ? (
          <>
            <p role="alert">{initialError.message}</p>
            <button
              className={styles.textButton}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          </>
        ) : (
          <p role="status">Loading conversation...</p>
        )}
        <Link href={base}>Back to inbox</Link>
      </div>
    );
  const { thread, messages } = data;
  const bookingHref = `${admin ? "/admin/bookings" : thread.viewerRole === "host" ? "/owner/bookings" : "/bookings"}/${thread.booking._id}`;
  return (
    <section
      className={`${styles.chat} ${admin ? styles.adminChat : ""}`}
      aria-label="Conversation"
    >
      <header className={styles.chatHeader}>
        <Link
          href={base}
          className={styles.iconButton}
          aria-label="Back to inbox"
          title="Back to inbox"
        >
          <ArrowLeft size={19} />
        </Link>
        <span
          className={`${styles.avatar} ${thread.kind === "support" ? styles.supportAvatar : ""}`}
        >
          {thread.kind === "support" ? (
            <ShieldCheck size={20} />
          ) : (
            <MessageCircle size={20} />
          )}
        </span>
        <div className={styles.chatIdentity}>
          <h1>{thread.title}</h1>
          <p>
            {thread.booking.code}
            {thread.kind === "support"
              ? ` · ${thread.status === "resolved" ? "Resolved" : "Support"}`
              : " · Booking chat"}
          </p>
        </div>
        {admin && (
          <button
            className={`${styles.iconButton} ${thread.status === "resolved" ? styles.resolveActive : ""}`}
            onClick={toggleStatus}
            disabled={Boolean(busy)}
            aria-label={
              thread.status === "resolved"
                ? "Reopen conversation"
                : "Mark resolved"
            }
            title={
              thread.status === "resolved"
                ? "Reopen conversation"
                : "Mark resolved"
            }
          >
            <CheckCircle2 size={19} />
          </button>
        )}
        <button
          className={styles.iconButton}
          onClick={refresh}
          disabled={Boolean(busy)}
          aria-label="Refresh chat"
          title="Refresh chat"
        >
          <RefreshCw
            size={18}
            className={busy === "refresh" ? styles.spin : undefined}
          />
        </button>
      </header>
      <Link className={styles.bookingContext} href={bookingHref}>
        <span className={styles.contextImage}>
          {thread.booking.product.imageUrl ? (
            <Image
              src={thread.booking.product.imageUrl}
              alt=""
              fill
              sizes="46px"
              unoptimized
            />
          ) : (
            <Package size={22} />
          )}
        </span>
        <div>
          <strong>{thread.booking.product.name}</strong>
          <p>
            {thread.booking.product.code} · {thread.booking.code}
          </p>
        </div>
        <span
          className={styles.bookingStatus}
          data-status={String(thread.booking.status).toLowerCase()}
        >
          {thread.booking.status === "pending"
            ? "Pending"
            : thread.booking.status}
        </span>
      </Link>
      {readWarning && (
        <p className={styles.readWarning} role="status">
          {readWarning}
        </p>
      )}
      {error && (
        <div className={styles.chatError} role="alert">
          {error}
          <button
            className={styles.textButton}
            onClick={() => setError("")}
            disabled={Boolean(busy)}
          >
            Dismiss
          </button>
        </div>
      )}
      <div
        className={styles.messages}
        ref={scroller}
        aria-label="Messages"
        tabIndex={0}
      >
        {data.hasOlder && (
          <div className={styles.older} ref={olderSentinel}>
            <span role="status">
              {busy === "older"
                ? "Loading earlier messages..."
                : "Earlier messages"}
            </span>
            {error && (
              <button className={styles.textButton} onClick={loadOlder}>
                Try again
              </button>
            )}
          </div>
        )}
        {messages.length === 0 && (
          <div className={styles.emptyConversation}>
            <MessageCircle size={32} strokeWidth={1.4} />
            <p>No messages yet.</p>
          </div>
        )}
        {messages.map((message, index) => (
          <Fragment key={message._id}>
            {(index === 0 ||
              chatDay(message.createdAt) !==
                chatDay(messages[index - 1].createdAt)) && (
              <p className={styles.daySeparator}>
                {chatDay(message.createdAt)}
              </p>
            )}
            <div
              className={
                message.sender === "me" ? styles.rowMe : styles.rowOther
              }
            >
              <div
                className={
                  message.sender === "me" ? styles.bubbleMe : styles.bubbleOther
                }
              >
                {admin &&
                  message.senderRole === "admin" &&
                  message.sender !== "me" && (
                    <span className={styles.senderLabel}>MouldX Support</span>
                  )}
                <p>{message.text}</p>
                <time dateTime={message.createdAt}>
                  {chatTimestamp(message.createdAt)}
                </time>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
      <form onSubmit={send} className={styles.composer}>
        <textarea
          rows={1}
          aria-label="Message"
          placeholder={
            thread.canSend ? "Type a message..." : "Booking approval required"
          }
          value={draft}
          disabled={!thread.canSend || busy === "send"}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={4000}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!draft.trim() || !thread.canSend || Boolean(busy)}
          aria-label="Send message"
          title="Send message"
        >
          {busy === "send" ? (
            <RefreshCw size={19} className={styles.spin} />
          ) : (
            <Send size={19} />
          )}
        </button>
      </form>
    </section>
  );
}
