"use client";

import Link from "next/link";
import styles from "./ProfileApproved.module.css";

// TEMP dummy data — will come from the real admin approval API
const APPROVAL = {
  approvedAt: "15 Sep · 9:10 AM",
  name: "Rohit Sharma",
};

export default function CustomerProfileApprovedPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* ---------- Success icon ---------- */}
        <div className={styles.heroSection}>
          <div className={styles.iconWrap}>
            <span className={styles.pulseRing} />
            <span className={styles.pulseRing2} />
            <svg
              className={styles.checkSvg}
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className={styles.checkCircle}
                cx="26"
                cy="26"
                r="24"
                stroke="#22c55e"
                strokeWidth="2.5"
              />
              <path
                className={styles.checkMark}
                d="M15 27L22.5 34.5L37.5 18"
                stroke="#22c55e"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className={styles.title}>Profile approved!</h1>
          <p className={styles.subtitle}>
            Welcome, {APPROVAL.name} — your account is now verified on MouldX.
          </p>
          <p className={styles.approvedMeta}>Approved · {APPROVAL.approvedAt}</p>
        </div>

        {/* ---------- What's next card ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>What&apos;s next</h2>

          <div className={styles.nextRow}>
            <span className={`${styles.nextDot} ${styles.nextDotDone}`}>
              <span className={styles.nextDotCheck}>✓</span>
            </span>
            <div>
              <p className={styles.nextTitle}>Profile &amp; KYC verified</p>
              <p className={styles.nextMeta}>Completed</p>
            </div>
          </div>

          <div className={styles.nextRow}>
            <span className={`${styles.nextDot} ${styles.nextDotActive}`}>2</span>
            <div>
              <p className={styles.nextTitle}>Browse and book moulds</p>
              <p className={styles.nextMeta}>Explore verified listings near you</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Sticky CTA ---------- */}
      <div className={styles.ctaBar}>
        <Link href="/" className={`${styles.ctaBtn} btn-primary`}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
