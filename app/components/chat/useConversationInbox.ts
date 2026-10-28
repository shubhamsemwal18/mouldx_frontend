"use client";

import { useCallback, useEffect, useState } from "react";
import { chatApi } from "@/app/lib/chat-api";
import { getApiErrorMessage } from "@/app/lib/api";
import type { ConversationFilters, ConversationList } from "@/app/lib/chat-types";

export function useConversationInbox(filters: ConversationFilters, admin: boolean, userId?: string) {
  const { kind, filter, search } = filters;
  const key = JSON.stringify([userId, admin, kind, filter, search]);
  const [request, setRequest] = useState({ key, cursor: null as string | null, attempt: 0 });
  const [result, setResult] = useState<{ key: string; requestKey: string; data?: ConversationList; error?: string }>();
  if (request.key !== key) setRequest({ key, cursor: null, attempt: 0 });
  const cursor = request.key === key ? request.cursor : null;
  const attempt = request.key === key ? request.attempt : 0;
  const requestKey = JSON.stringify([key, cursor, attempt]);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    chatApi.list({ kind, filter, search }, cursor, admin, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      setResult((previous) => {
        const existing = cursor && previous?.key === key ? previous.data?.conversations || [] : [];
        return { key, requestKey, data: { ...data, conversations: [...new Map([...existing, ...data.conversations].map((thread) => [thread._id, thread])).values()] } };
      });
    }, (error) => {
      if (!controller.signal.aborted) setResult((previous) => ({ key, requestKey, data: cursor && previous?.key === key ? previous.data : undefined, error: getApiErrorMessage(error, "Unable to load conversations.") }));
    });
    return () => controller.abort();
  }, [userId, admin, kind, filter, search, cursor, key, requestKey]);
  const current = userId && result?.key === key ? result : undefined;
  const loading = Boolean(userId && current?.requestKey !== requestKey);
  const data = !cursor && loading ? undefined : current?.data;
  const error = loading ? undefined : current?.error;
  const loadMore = useCallback(() => {
    if (loading || error || !data?.pagination.hasMore || !data.pagination.nextCursor) return;
    setRequest((previous) => {
      if (previous.key !== key || previous.cursor !== cursor) return previous;
      return { key, cursor: data.pagination.nextCursor, attempt: 0 };
    });
  }, [loading, error, data, key, cursor, setRequest]);
  const refresh = useCallback(() => setRequest((previous) => ({ key, cursor: null, attempt: previous.attempt + 1 })), [key, setRequest]);
  const retry = useCallback(() => setRequest((previous) => ({ key, cursor, attempt: previous.attempt + 1 })), [key, cursor, setRequest]);
  return { data, error, loading, loadingMore: loading && Boolean(cursor), loadMore, refresh, retry };
}
