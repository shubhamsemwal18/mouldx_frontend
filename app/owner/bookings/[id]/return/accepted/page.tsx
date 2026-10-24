"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ConditionMatches.module.css";

// TEMP dummy data — real booking API se aayega
const RETURN_SUMMARY: Record<string, { depositReleased: number; deductions: number }> = {
  "1": { depositReleased: 50000, deductions: 0 },
  "2": { depositReleased: 18000, deductions: 0 },
  "4": { depositReleased: 30000, deductions: 0 },
};

export default function ConditionMatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const summary = RETURN_SUMMARY[id];

  if (!summary) {
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
          <Link href={`/owner/bookings/${id}/return`} className={styles.backBtn} aria-label="Go back">
            ‹
          </Link>
          <h1 className={styles.title}>Condition Matches</h1>
        </div>

        {/* ---------- Status hero card ---------- */}
        <div className={styles.heroCard}>
          <span className={styles.acceptedPill}>
            <span aria-hidden>✓</span> RETURN ACCEPTED
          </span>
          <h2 className={styles.heroHeading}>Security Deposit</h2>
          <p className={styles.heroSubtext}>Full security deposit released to user.</p>
        </div>

        {/* ---------- Booking status card ---------- */}
        <div className={styles.card}>
          <div className={styles.statusRow}>
            <h2 className={styles.cardTitle}>Booking Status</h2>
            <span className={styles.completedPill}>COMPLETED</span>
          </div>
          <p className={styles.statusText}>
            User receives the full security deposit through the admin-supervised payment flow.
          </p>
        </div>

        {/* ---------- Deposit / deductions ---------- */}
        <div className={styles.statsGrid}>
          <div className={styles.statChip}>
            <span className={styles.statValueGreen}>
              ₹{summary.depositReleased.toLocaleString("en-IN")}
            </span>
            <span className={styles.statLabel}>Deposit Released</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statValue}>₹{summary.deductions.toLocaleString("en-IN")}</span>
            <span className={styles.statLabel}>Deductions</span>
          </div>
        </div>
      </div>

      {/* ---------- Sticky CTA ---------- */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          onClick={() => router.push(`/owner/bookings/${id}/rate`)}
          className={styles.ctaBtn}
        >
          <span aria-hidden>★</span> Rate User
        </button>
      </div>
    </div>
  );
}