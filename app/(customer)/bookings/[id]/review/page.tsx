"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import styles from "./Review.module.css";

interface ReviewBooking {
  id: string;
  code: string;
  name: string;
  dateRange: string;
  image: string;
  rating?: number;
  review?: string;
  tags?: string[];
}

const BOOKINGS: Record<string, ReviewBooking> = {
  "BK-23988": {
    id: "BK-23988",
    code: "MX-000045",
    name: "Single Cavity Chair Mould",
    dateRange: "10 – 15 Aug",
    image: "https://picsum.photos/seed/mould-4/800/600",
  },
  "BK-23700": {
    id: "BK-23700",
    code: "MX-000156",
    name: "Die-Cast Gear Mould",
    dateRange: "20 – 26 Jul",
    image: "https://picsum.photos/seed/mould-6/800/600",
    rating: 4,
    review: "Mould was in good condition and the host was cooperative.",
    tags: ["Good condition", "Easy pickup"],
  },
};

const TAGS = [
  "Good condition",
  "As described",
  "Easy pickup",
  "Fair price",
  "Responsive host",
  "Needs maintenance",
];

const RATING_LABEL: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

const MAX_CHARS = 500;

async function submitReview(payload: {
  bookingId: string;
  rating: number;
  review: string;
  tags: string[];
}) {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return payload;
}

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const booking = BOOKINGS[params.id];

  const [rating, setRating] = useState(booking?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(booking?.review ?? "");
  const [tags, setTags] = useState<string[]>(booking?.tags ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);

  if (!booking) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1 className={styles.title}>Booking not found</h1>
          <p className={styles.subtitle}>This booking is not available for review.</p>
          <Link href="/bookings" className={styles.primaryBtn}>
            Back to bookings
          </Link>
        </div>
      </div>
    );
  }

  const isEdit = typeof booking.rating === "number";
  const shown = hover || rating;

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating === 0 || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await submitReview({ bookingId: booking.id, rating, review: review.trim(), tags });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden>
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className={styles.title}>Thank you!</h1>
          <p className={styles.subtitle}>
            Your review for {booking.name} has been {isEdit ? "updated" : "submitted"}.
          </p>
          <button type="button" className={styles.primaryBtn} onClick={() => router.push("/bookings")}>
            Back to bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/bookings" className={styles.back}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </Link>

        <h1 className={styles.title}>{isEdit ? "Edit your review" : "Rate your experience"}</h1>

        <div className={styles.bookingCard}>
          <div className={styles.thumb}>
            {!imgError ? (
              <img
                src={booking.image}
                alt={booking.name}
                className={styles.thumbImg}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={styles.thumbPlaceholder} aria-hidden />
            )}
          </div>
          <div className={styles.bookingInfo}>
            <p className={styles.bookingName}>{booking.name}</p>
            <p className={styles.bookingMeta}>
              {booking.code} · {booking.dateRange}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <section className={styles.section}>
            <h2 className={styles.label}>Overall rating</h2>
            <div
              className={styles.starRow}
              role="radiogroup"
              aria-label="Rating"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className={`${styles.starBtn} ${n <= shown ? styles.starOn : styles.starOff}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>
            <p className={styles.ratingLabel}>{shown ? RATING_LABEL[shown] : "Tap a star to rate"}</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.label}>What went well?</h2>
            <div className={styles.tags}>
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={tags.includes(tag)}
                  className={`${styles.tag} ${tags.includes(tag) ? styles.tagActive : ""}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <label htmlFor="review" className={styles.label}>
              Write a review <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="review"
              className={styles.textarea}
              rows={5}
              maxLength={MAX_CHARS}
              placeholder="Share details about the mould condition, pickup and the host..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
            <p className={styles.counter}>
              {review.length}/{MAX_CHARS}
            </p>
          </section>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.primaryBtn} disabled={rating === 0 || submitting}>
            {submitting ? "Submitting..." : isEdit ? "Update review" : "Submit review"}
          </button>
        </form>
      </div>
    </div>
  );
}