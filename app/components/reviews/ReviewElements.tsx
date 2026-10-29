"use client";
import { useRef, useState } from "react";
import { getApiErrorMessage } from "@/app/lib/api";
import { reviewApi, type RatingSummary as Summary, type Review } from "@/app/lib/review-api";
import { formatBookingDate } from "@/app/lib/booking-dates";
import { BookingProductImage } from "../bookings/BookingVisuals";
import styles from "./Reviews.module.css";

export function Stars({ value }: { value: number }) {
  return <span className={styles.stars} aria-label={`${value.toFixed(1)} out of 5`}>★★★★★<span aria-hidden style={{ width: `${value * 20}%` }}>★★★★★</span></span>;
}

export function RatingSummary({ summary, label = "Overall rating" }: { summary: Summary; label?: string }) {
  return (
    <section className={styles.summary} aria-label={label}>
      <p className={styles.label}>{label}</p>
      <div className={styles.summaryRow}>
        <strong className={styles.average}>{summary.count ? summary.average.toFixed(1) : "—"}</strong>
        <div className={styles.scoreMeta}>
          <Stars value={summary.average} />
          <p className={styles.muted}>{summary.count ? `Based on ${summary.count} ${summary.count === 1 ? "review" : "reviews"}` : "No reviews yet"}</p>
        </div>
      </div>
      <div className={styles.bars}>
        {[5, 4, 3, 2, 1].map((star) => {
          const pct = summary.count ? Math.round((summary.counts[star] || 0) * 100 / summary.count) : 0;
          return (
            <div className={styles.bar} key={star}>
              <span>{star} ★</span>
              <div className={styles.track}><div style={{ width: `${pct}%` }} /></div>
              <span>{pct}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ReviewCard({ review, allowReply = false, onReply }: { review: Review; allowReply?: boolean; onReply?: (review: Review) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.reply?.comment || "");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const initial = (review.authorLabel || "").trim().charAt(0).toUpperCase() || "?";

  const submit = async () => {
    if (inFlight.current || !text.trim()) return;
    inFlight.current = true; setBusy(true); setError("");
    try { onReply?.(await reviewApi.reply(review._id, text.trim())); setEditing(false); }
    catch (err) { setError(getApiErrorMessage(err, "Could not save your reply")); }
    finally { inFlight.current = false; setBusy(false); }
  };

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div className={styles.author}>
          <span className={styles.avatar} aria-hidden>{initial}</span>
          <div className={styles.authorText}>
            <h3>{review.authorLabel}</h3>
            <p className={styles.date}>{formatBookingDate(review.createdAt)}</p>
          </div>
        </div>
        <Stars value={review.rating} />
      </div>

      {review.product && (
        <div className={styles.productRow}>
          <div className={styles.productThumb}>
            <BookingProductImage src={review.product.imageUrl} name={review.product.name} />
          </div>
          <div className={styles.productInfo}>
            <p className={styles.productName}>{review.product.name}</p>
            <p className={styles.productCode}>{review.product.code}</p>
          </div>
        </div>
      )}

      {review.booking && (
        <p className={styles.bookingMeta}>{review.booking.code} · {formatBookingDate(review.booking.startDate)} to {formatBookingDate(review.booking.endDate)}</p>
      )}

      <p className={styles.comment}>{review.comment}</p>

      {review.reply && !editing && (
        <div className={styles.reply}>
          <strong className={styles.replyLabel}>{allowReply ? "Your reply" : "Host reply"}</strong>
          <p>{review.reply.comment}</p>
        </div>
      )}

      {allowReply && !editing && (
        <button className={styles.button} onClick={() => { setText(review.reply?.comment || ""); setEditing(true); }}>
          {review.reply ? "Edit reply" : "Reply to review"}
        </button>
      )}

      {editing && (
        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label>Reply to review<textarea className={styles.textarea} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} disabled={busy} required /></label>
          <p className={styles.muted}>{text.length}/500</p>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.primary}`} disabled={busy || !text.trim()}>{busy ? "Saving…" : "Save reply"}</button>
            <button type="button" className={styles.button} disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </article>
  );
}