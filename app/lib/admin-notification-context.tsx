"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { adminNotificationApi, type AdminNotification } from "./admin-notification-api";
import { getApiErrorMessage } from "./api";

interface AdminNotificationContextValue {
  recent: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string;
  busy: boolean;
  version: number;
  refresh: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (ids: string[]) => Promise<number>;
}
const Context = createContext<AdminNotificationContextValue | null>(null);

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [recent, setRecent] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const active = useRef(false);
  const requestVersion = useRef(0);
  const mutating = useRef(false);
  const fingerprint = useRef<string | null>(null);

  const refreshData = useCallback(async (announce = true) => {
    const request = ++requestVersion.current;
    try {
      const data = await adminNotificationApi.list({ limit: 4 });
      if (!active.current || request !== requestVersion.current) return;
      const nextFingerprint = JSON.stringify([data.notifications.map((n) => [n._id, n.readAt]), data.unreadCount, data.pagination.total]);
      if (announce && fingerprint.current !== null && fingerprint.current !== nextFingerprint) setVersion((v) => v + 1);
      fingerprint.current = nextFingerprint;
      setRecent(data.notifications); setUnreadCount(data.unreadCount); setError("");
    } catch (err) {
      if (active.current && request === requestVersion.current) setError(getApiErrorMessage(err, "Could not load notifications"));
    } finally {
      if (active.current && request === requestVersion.current) setLoading(false);
    }
  }, []);
  const refresh = useCallback(() => refreshData(), [refreshData]);

  useEffect(() => {
    active.current = true;
    const initial = window.setTimeout(() => void refresh(), 0);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, 30000);
    return () => {
      active.current = false; requestVersion.current += 1;
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, refresh]);

  const mutate = useCallback(async <T extends { unreadCount: number },>(action: () => Promise<T>): Promise<T> => {
    if (mutating.current) throw new Error("A notification action is already in progress");
    mutating.current = true; setBusy(true);
    try {
      const result = await action();
      requestVersion.current += 1;
      if (active.current) {
        setUnreadCount(result.unreadCount); setVersion((v) => v + 1);
        await refreshData(false);
      }
      return result;
    } finally {
      mutating.current = false;
      if (active.current) setBusy(false);
    }
  }, [refreshData]);
  const markRead = useCallback(async (ids: string[]) => { await mutate(() => adminNotificationApi.markRead({ ids })); }, [mutate]);
  const markAllRead = useCallback(async () => { await mutate(() => adminNotificationApi.markRead({ all: true })); }, [mutate]);
  const remove = useCallback(async (ids: string[]) => (await mutate(() => adminNotificationApi.remove(ids))).deletedCount, [mutate]);
  const value = useMemo(() => ({ recent, unreadCount, loading, error, busy, version, refresh, markRead, markAllRead, remove }),
    [recent, unreadCount, loading, error, busy, version, refresh, markRead, markAllRead, remove]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminNotifications() {
  const context = useContext(Context);
  if (!context) throw new Error("Admin notifications require their provider");
  return context;
}
