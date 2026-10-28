"use client";

import { useCallback, useEffect, useState } from "react";
import { bookingApi, bookingError } from "@/app/lib/booking-api";
import type { BookingFilter, BookingList, BookingStatus, BookingView, RentalPhase } from "@/app/lib/booking-types";

interface Result {
  key: string;
  scope: string;
  requestKey: string;
  data?: BookingList;
  stats?: BookingList["stats"];
  error?: ReturnType<typeof bookingError>;
}

export function useInfiniteBookings(view: BookingView, search: string, status: BookingFilter, userId?: string) {
  const scope = JSON.stringify([userId, view]);
  const key = JSON.stringify([userId, view, search, status]);
  const [request, setRequest] = useState({ key, page: 1, attempt: 0 });
  const [result, setResult] = useState<Result | null>(null);
  if (request.key !== key) setRequest({ key, page: 1, attempt: 0 });
  // A new search/filter/account starts at page one before any effects run.
  const page = request.key === key ? request.page : 1;
  const attempt = request.key === key ? request.attempt : 0;
  const requestKey = JSON.stringify([key, page, attempt]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const phase = ["upcoming", "active", "completed"].includes(status) ? status as RentalPhase : undefined;
    bookingApi.list(view, { search, status: !phase && status ? status as BookingStatus : undefined, phase, page, limit: 12 }, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setResult((previous) => {
          const existing = page > 1 && previous?.key === key ? previous.data?.bookings || [] : [];
          const bookings = [...new Map([...existing, ...data.bookings].map((booking) => [booking._id, booking])).values()];
          return { key, scope, requestKey, data: { ...data, bookings }, stats: data.stats };
        });
      },
      (error) => {
        if (controller.signal.aborted) return;
        setResult((previous) => ({
          key, scope, requestKey,
          data: page > 1 && previous?.key === key ? previous.data : undefined,
          stats: previous?.scope === scope ? previous.stats : undefined,
          error: bookingError(error),
        }));
      },
    );
    return () => controller.abort();
  }, [userId, view, search, status, page, key, scope, requestKey]);

  const current = userId && result?.key === key ? result : undefined;
  const loading = Boolean(userId && current?.requestKey !== requestKey);
  const data = page === 1 && loading ? undefined : current?.data;
  const error = loading ? undefined : current?.error;
  const hasMore = Boolean(data?.pagination.hasNextPage);

  const loadMore = useCallback(() => {
    if (loading || error || !data?.pagination.hasNextPage) return;
    setRequest((previous) => {
      const activePage = previous.key === key ? previous.page : 1;
      // Repeated observer notifications must not skip a page or start duplicates.
      if (activePage !== data.pagination.page) return previous;
      return { key, page: data.pagination.page + 1, attempt: 0 };
    });
  }, [data, error, key, loading, setRequest]);
  const reload = useCallback(() => {
    setRequest((previous) => ({ key, page: 1, attempt: (previous.key === key ? previous.attempt : 0) + 1 }));
  }, [key, setRequest]);
  const retry = useCallback(() => {
    setRequest((previous) => ({ key, page, attempt: (previous.key === key ? previous.attempt : 0) + 1 }));
  }, [key, page, setRequest]);

  return { data, stats: userId && result?.scope === scope ? result.stats : undefined, error, loading, loadingMore: loading && page > 1, hasMore, loadMore, reload, retry };
}
