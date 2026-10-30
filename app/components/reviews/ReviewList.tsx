"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";
import { reviewApi, type ReviewList as List, type ReviewScope } from "@/app/lib/review-api";
import { RatingSummary, ReviewCard } from "./ReviewElements";
import styles from "./Reviews.module.css";

export default function ReviewList({ scope, slug, showSummary = true }: { scope: ReviewScope; slug?: string; showSummary?: boolean }) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number | undefined>();
  const [attempt, setAttempt] = useState(0);
  const key = `${scope}:${slug || user?._id}:${rating}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: List; loadingMore?: boolean; error?: string } | null>(null);
  const current = state?.key === key ? state : null;
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const moreController = useRef<AbortController | null>(null);
  const enabled = scope === "product" || Boolean(user);
  useEffect(() => {
    if (!enabled) return;
    moreController.current?.abort(); inFlight.current = false;
    const controller = new AbortController();
    reviewApi.list(scope, { page: 1, limit: 10, rating }, controller.signal, slug).then(
      (data) => { if (!controller.signal.aborted) setState({ key, data }); },
      (err) => { if (!controller.signal.aborted) setState({ key, error: getApiErrorMessage(err, "Could not load reviews") }); },
    );
    return () => { controller.abort(); moreController.current?.abort(); };
  }, [enabled, key, rating, scope, slug]);
  const loadMore = useCallback(async () => {
    if (inFlight.current || !current?.data?.pagination.hasNextPage) return;
    inFlight.current = true;
    const controller = new AbortController(); moreController.current = controller;
    setState((prev) => prev?.key === key ? { ...prev, loadingMore: true, error: undefined } : prev);
    try {
      const data = await reviewApi.list(scope, { page: current.data.pagination.page + 1, limit: 10, rating }, controller.signal, slug);
      if (!controller.signal.aborted) setState((prev) => prev?.key === key && prev.data ? { key, data: { ...data,
        reviews: [...prev.data.reviews, ...data.reviews].filter((review, i, all) => all.findIndex((r) => r._id === review._id) === i) } } : prev);
    } catch (err) { if (!controller.signal.aborted) setState((prev) => prev?.key === key ? { ...prev, loadingMore: false, error: getApiErrorMessage(err) } : prev); }
    finally { if (moreController.current === controller) inFlight.current = false; }
  }, [current, key, rating, scope, slug]);
  useEffect(() => {
    if (!sentinel.current || !current?.data?.pagination.hasNextPage || current.loadingMore || current.error) return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) void loadMore(); }, { rootMargin: "200px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [current, loadMore]);
  return <div>
    {showSummary && current?.data && <RatingSummary summary={current.data.summary} label={scope === "customer" ? "Your rating as a customer" : "Product rating"} />}
    <div className={styles.filters} aria-label="Filter reviews by rating"><button type="button" aria-label="Refresh reviews" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={16} /></button>{[undefined, 5, 4, 3, 2, 1].map((value) => <button key={value || "all"} type="button" aria-pressed={rating === value} onClick={() => setRating(value)}>{value ? `${value} ★` : "All reviews"}</button>)}</div>
    {!current && <p className={styles.state} role="status">Loading reviews…</p>}
    {current?.data && !current.data.reviews.length && <p className={styles.state}>{rating ? "No reviews with this rating yet." : "No reviews yet. Reviews are available after a completed booking."}</p>}
    <div className={styles.list}>{current?.data?.reviews.map((review) => <ReviewCard key={review._id} review={review} allowReply={scope === "host"} onReply={(updated) => setState((prev) => prev?.key === key && prev.data ? { ...prev, data: { ...prev.data, reviews: prev.data.reviews.map((r) => r._id === updated._id ? updated : r) } } : prev)} />)}</div>
    {current?.error && <div className={styles.state}><p role="alert" className={styles.error}>{current.error}</p><button className={styles.button} onClick={() => current.data ? void loadMore() : setAttempt((n) => n + 1)}>Try again</button></div>}
    <div ref={sentinel} className={styles.state}>{current?.loadingMore ? "Loading more reviews…" : current?.data?.pagination.hasNextPage && !current.error ? <button className={styles.button} onClick={() => void loadMore()}>Load more reviews</button> : null}</div>
  </div>;
}
