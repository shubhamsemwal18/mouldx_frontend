"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ActiveBooking.module.css";

interface TimelineStep {
  id: string;
  title: string;
  meta: string;
  status: "done" | "current";
}

const ACTIVE_BOOKINGS: Record<string,
  {
    code: string;
    productName: string;
    dateRange: string;
    customer: string;
    dispatchedAt: string;
    evidenceCount: number;
    dayOfTotal: string;
    steps: TimelineStep[];
  }
> = {
  "1": {
    code: "MX-000123",
    productName: "Bottle Cap Mould",
    dateRange: "14 Sep – 21 Sep",
    customer: "Nova Plastics",
    dispatchedAt: "14 Sep · 11:00 AM",
    evidenceCount: 6,
    dayOfTotal: "Day 4 of 7",
    steps: [
      { id: "accepted", title: "Accepted", meta: "13 Sep", status: "done" },
      { id: "dispatched", title: "Dispatched", meta: "14 Sep · 11:00 AM", status: "done" },
      { id: "inuse", title: "In use", meta: "Day 4 of 7", status: "current" },
    ],
  },
};

export default function ActiveBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const booking = ACTIVE_BOOKINGS[id];
  const [submitting, setSubmitting] = useState(false);

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

  const handleMarkReturned = () => {
    if (submitting) return;
    setSubmitting(true);
    router.push(`/owner/bookings/${id}/return`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* ---------- Header row with back button ---------- */}
        <div className={styles.titleRow}>
          <Link href={`/owner/bookings/${id}`} className={styles.backBtn} aria-label="Go back">
            ‹
          </Link>
          <h1 className={styles.title}>Booking Active</h1>
        </div>

        {/* ---------- Status hero card ---------- */}
        <div className={styles.heroCard}>
          <span className={styles.activePill}>
            <span className={styles.activeDot} aria-hidden />
            ACTIVE · MANUAL
          </span>
          <h2 className={styles.heroCode}>{booking.code}</h2>
          <p className={styles.heroMeta}>
            {booking.dateRange} · {booking.productName}
          </p>
        </div>

        {/* ---------- Info card ---------- */}
        <div className={styles.card}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>User</span>
            <span className={styles.infoValue}>{booking.customer}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Dispatched</span>
            <span className={styles.infoValue}>{booking.dispatchedAt}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Evidence</span>
            <span className={styles.evidencePill}>✓ {booking.evidenceCount} FILES</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>GPS / RFID</span>
            <span className={styles.mvpPill}>NOT IN MVP</span>
          </div>
        </div>

        {/* ---------- Timeline ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Timeline</h2>
          {booking.steps.map((step) => (
            <div key={step.id} className={styles.timelineRow}>
              <span
                className={`${styles.dot} ${
                  step.status === "done" ? styles.dotDone : styles.dotCurrent
                }`}
              />
              <div>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepMeta}>{step.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Sticky CTA ---------- */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          onClick={handleMarkReturned}
          disabled={submitting}
          className={styles.ctaBtn}
        >
          {submitting ? "Updating…" : "User Returned Mould"}
        </button>
      </div>
    </div>
  );
}