"use client";
import { useCallback, useRef, useState } from "react";
import { getApiErrorMessage } from "@/app/lib/api";
import { reviewApi } from "@/app/lib/review-api";
import { useBookingQuery } from "../bookings/useBookingQuery";
import { ReviewCard } from "./ReviewElements";
import styles from "./Reviews.module.css";

export default function BookingReviews({ id, host }: { id: string; host: boolean }) {
  const fetcher = useCallback((signal: AbortSignal) => reviewApi.booking(id, signal), [id]);
  const query = useBookingQuery(id, fetcher);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const canReview = host ? query.data?.canReviewCustomer : query.data?.canReviewProduct;
  const submit = async () => {
    if (!rating || !comment.trim() || !canReview || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { await reviewApi.create(id, { type: host ? "customer" : "product", rating, comment: comment.trim() }); setOpen(false); query.reload(); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); inFlight.current = false; }
  };
  return <section className={styles.card} aria-label="Booking reviews"><h3>Ratings & reviews</h3>
    {query.loading && <p className={styles.muted}>Loading reviews…</p>}
    {query.error && <div className={styles.error} role="alert">{query.error.message}<button className={styles.button} onClick={query.reload}>Try again</button></div>}
    {canReview && !open && <><p className={styles.muted}>{host ? "How was your experience with this customer?" : "How was your experience with this product?"}</p><button className={styles.button} onClick={() => setOpen(true)}>{host ? "Review customer" : "Write a review"}</button></>}
    {canReview && open && <form className={styles.form} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <fieldset className={styles.starPicker} disabled={busy}><legend>{host ? "Rate the customer" : "Rate the product"}</legend>{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" aria-label={`${star} ${star === 1 ? "star" : "stars"}`} aria-pressed={rating >= star} onClick={() => setRating(star)}>★</button>)}</fieldset>
      <label>Your review<textarea className={styles.textarea} required minLength={1} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} disabled={busy} placeholder={host ? "Share your experience with the customer…" : "Tell us about the product and rental experience…"} /></label>
      <p className={styles.muted}>{comment.length}/2000 · Reviews cannot be edited after submission.</p>{error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><button className={`${styles.button} ${styles.primary}`} disabled={busy || !rating || !comment.trim()}>{busy ? "Submitting…" : "Submit review"}</button><button className={styles.button} type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
    </form>}
    {query.data?.productReview && <ReviewCard review={query.data.productReview} />}
    {query.data?.customerReview && <><p className={styles.muted}>{host ? "Your customer review" : "Your rating from the host"}</p><ReviewCard review={query.data.customerReview} /></>}
  </section>;
}
