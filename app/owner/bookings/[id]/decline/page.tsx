"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./DeclineBooking.module.css";

const DECLINE_REASONS = [
  "Under maintenance",
  "Already booked elsewhere",
  "Dates not available",
  "Pricing mismatch",
  "Other",
];

// TEMP dummy data — real booking API se aayega
const BOOKING_REF: Record<string, { code: string; customer: string }> = {
  "1": { code: "MX-000123", customer: "Nova Plastics" },
  "2": { code: "MX-000198", customer: "Vector Molds" },
  "4": { code: "MX-000045", customer: "Orbit Plast" },
};

export default function DeclineBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const booking = BOOKING_REF[id];

  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (submitting) return;
    setSubmitting(true);
    // TODO: call decline-booking API with { bookingId: id, reason, remarks }
    router.push(`/owner/bookings/${id}?status=declined`);
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

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* ---------- Header row with back button ---------- */}
        <div className={styles.titleRow}>
          <Link href={`/owner/bookings/${id}`} className={styles.backBtn} aria-label="Go back">
            ‹
          </Link>
          <h1 className={styles.title}>Decline Booking</h1>
        </div>
        <p className={styles.subtitle}>No user payment has been made at this stage.</p>

        {/* ---------- Heads up warning ---------- */}
        <div className={styles.warningCard}>
          <span className={styles.warningIcon} aria-hidden>
            !
          </span>
          <div>
            <p className={styles.warningTitle}>Heads up</p>
            <p className={styles.warningText}>
              Frequent declines may impact your listing visibility.
            </p>
          </div>
        </div>

        {/* ---------- Reason form ---------- */}
        <div className={styles.card}>
          <label className={styles.fieldLabel}>
            Decline Reason <span className={styles.required}>*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={styles.select}
          >
            {DECLINE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <label className={styles.fieldLabelSpaced}>Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional explanation to the user..."
            rows={3}
            className={styles.textarea}
          />
        </div>

        {/* ---------- Booking ref card ---------- */}
        <div className={styles.refCard}>
          <div className={styles.refRow}>
            <span className={styles.refLabel}>Booking Ref</span>
            <span className={styles.refValue}>{booking.code}</span>
          </div>
          <div className={styles.refRow}>
            <span className={styles.refLabel}>User</span>
            <span className={styles.refValue}>{booking.customer}</span>
          </div>
        </div>
      </div>

      {/* ---------- Sticky confirm ---------- */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className={styles.confirmBtn}
        >
          {submitting ? "Declining…" : "Confirm Decline"}
        </button>
      </div>
    </div>
  );
}