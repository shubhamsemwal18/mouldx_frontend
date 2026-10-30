"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ClaimResolved.module.css";

// TEMP dummy data — real admin settlement API se aayega
const SETTLEMENT: Record<string, { deposit: number; deduction: number }> = {
  "1": { deposit: 50000, deduction: 12000 },
  "2": { deposit: 18000, deduction: 4000 },
  "4": { deposit: 30000, deduction: 6000 },
};

export default function ClaimResolvedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const settlement = SETTLEMENT[id];

  if (!settlement) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Booking not found.</p>
        <Link href="/owner/bookings" className={styles.notFoundLink}>
          ← Back to Bookings
        </Link>
      </div>
    );
  }

  const refund = settlement.deposit - settlement.deduction;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* ---------- Header row with back button ---------- */}
        <div className={styles.titleRow}>
          <Link href={`/owner/bookings/${id}`} className={styles.backBtn} aria-label="Go back">
            ‹
          </Link>
          <h1 className={styles.title}>Claim Resolved</h1>
        </div>

        {/* ---------- Hero settlement card ---------- */}
        <div className={styles.heroCard}>
          <span className={styles.approvedPill}>DEDUCTION APPROVED</span>
          <p className={styles.heroAmount}>₹{settlement.deduction.toLocaleString("en-IN")}</p>
          <p className={styles.heroSubtext}>
            Remainder ₹{refund.toLocaleString("en-IN")} refunded to user.
          </p>
        </div>

        {/* ---------- Claim status card ---------- */}
        <div className={styles.card}>
          <div className={styles.statusRow}>
            <h2 className={styles.cardTitle}>Claim status</h2>
            <span className={styles.resolvedPill}>RESOLVED</span>
          </div>
          <p className={styles.statusText}>
            Evidence: photos/videos · Admin-supervised settlement.
          </p>
        </div>

        {/* ---------- Settlement breakdown ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Settlement Breakdown</h2>

          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Deposit</span>
            <span className={styles.breakdownValue}>
              ₹{settlement.deposit.toLocaleString("en-IN")}
            </span>
          </div>

          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Damage deduction</span>
            <span className={styles.breakdownValueRed}>
              − ₹{settlement.deduction.toLocaleString("en-IN")}
            </span>
          </div>

          <div className={styles.divider} />

          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabelBold}>Refund to user</span>
            <span className={styles.breakdownValueGreen}>₹{refund.toLocaleString("en-IN")}</span>
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