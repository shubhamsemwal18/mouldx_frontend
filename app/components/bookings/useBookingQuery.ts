"use client";

import { useEffect, useState } from "react";
import { bookingError } from "@/app/lib/booking-api";

/** A changed key hides stale data immediately; cancellation also prevents late responses. */
export function useBookingQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>, enabled = true, scopeKey = key) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${key}:${attempt}`;
  const [result, setResult] = useState<{
    key: string; scopeKey: string; data?: T; error?: ReturnType<typeof bookingError>;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetcher(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key: requestKey, scopeKey, data }); },
      (error) => { if (!controller.signal.aborted) setResult({ key: requestKey, scopeKey, error: bookingError(error) }); },
    );
    return () => controller.abort();
  }, [enabled, fetcher, requestKey, scopeKey]);

  const current = enabled && result?.key === requestKey ? result : null;
  return { data: current?.data, previousData: enabled && result?.scopeKey === scopeKey ? result.data : undefined, error: current?.error, loading: enabled && !current, reload: () => setAttempt((n) => n + 1) };
}
