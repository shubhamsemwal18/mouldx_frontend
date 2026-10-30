"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./RateCustomer.module.css";

const QUICK_TAGS = ["On-time", "Clean Return", "Good Comm.", "Professional", "Late Pickup", "Careless Handling"];

// TEMP dummy data — real booking API se aayega
const BOOKING_REF: Record<string, { customer: string; code: string; initial: string; gradient: string }> = {
  "1": { customer: "Nova Plastics", code: "MX-000123", initial: "N", gradient: "linear-gradient(135deg, #22d3ee, #2563eb)" },
  "2": { customer: "Vector Molds", code: "MX-000198", initial: "V", gradient: "linear-gradient(135deg, #818cf8, #7c3aed)" },
  "4": { customer: "Orbit Plast", code: "MX-000045", initial: "O", gradient: "linear-gradient(135deg, #34d399, #059669)" },
};

export default function RateCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const booking = BOOKING_REF[id];

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (submitting) return;
    setSubmitting(true);
    // TODO: call rate-customer API with { bookingId: id, rating, review, tags: selectedTags }
    router.push("/owner/bookings");
  };

  if (!booking) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Booking not found.</p>
        <Link href="/owner/bookings" className={styles.notFoundLink}>
          ← Back to Bookings
        </Link>
      </div>
    );
  }

  const displayRating = hoverRating ?? rating;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* ---------- Header row with back button ---------- */}
        <div className={styles.titleRow}>
          <Link href={`/owner/bookings/${id}`} className={styles.backBtn} aria-label="Go back">
            ‹
          </Link>
          <h1 className={styles.title}>Rate User</h1>
        </div>
        <p className={styles.subtitle}>Your rating is part of the MouldX trust experience.</p>

        {/* ---------- Customer card ---------- */}
        <div className={styles.card}>
          <div className={styles.customerBlock}>
            <div className={styles.avatar} style={{ background: booking.gradient }}>
              {booking.initial}
            </div>
            <p className={styles.customerName}>{booking.customer}</p>
            <p className={styles.customerMeta}>Booking · {booking.code}</p>
          </div>

          {/* ---------- Star rating ---------- */}
          <div className={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className={styles.starBtn}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <span className={star <= displayRating ? styles.starFilled : styles.starEmpty}>
                  ★
                </span>
              </button>
            ))}
          </div>

          {/* ---------- Review textarea ---------- */}
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Great communication and clean return. Would rent to them again."
            rows={3}
            className={styles.textarea}
          />
        </div>

        {/* ---------- Quick tags ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Quick tags</h2>
          <div className={styles.tagsRow}>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`${styles.tag} ${selectedTags.includes(tag) ? styles.tagActive : ""}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Sticky submit ---------- */}
      <div className={styles.ctaBar}>
        <button type="button" onClick={handleSubmit} disabled={submitting} className={styles.ctaBtn}>
          {submitting ? "Submitting…" : "Submit Rating"}
        </button>
      </div>
    </div>
  );
}