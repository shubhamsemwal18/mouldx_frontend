"use client";

import Link from "next/link";
import styles from "./ListingLive.module.css";

// TEMP dummy data — will come from the real listing API
const LISTING = {
  code: "MX-000123",
  views: 0,
  enquiries: 0,
  bookings: 0,
};

export default function ListingLivePage() {
  return (
    <div className={styles.page}>
    

      <div className={styles.content}>
        <h1 className={styles.title}>Listing Approval</h1>
        <p className={styles.subtitle}>Admin verifies the complete mould listing.</p>

        {/* ---------- Status hero card ---------- */}
        <div className={styles.heroCard}>
          <span className={styles.approvedPill}>
            <span aria-hidden>✓</span> APPROVED
          </span>
          <h2 className={styles.heroHeading}>Mould is LIVE</h2>
          <p className={styles.heroSubtext}>The listing is now visible to users.</p>
        </div>

        {/* ---------- Listing status card ---------- */}
        <div className={styles.card}>
          <div className={styles.statusRow}>
            <h2 className={styles.cardTitle}>Listing status</h2>
            <span className={styles.livePill}>
              <span className={styles.liveDot} aria-hidden />
              LIVE
            </span>
          </div>
          <p className={styles.mouldIdText}>
            Mould ID · <span className={styles.mouldIdValue}>{LISTING.code}</span>
          </p>
        </div>

        {/* ---------- Stats ---------- */}
        <div className={styles.statsGrid}>
          <div className={styles.statChip}>
            <span className={styles.statValue}>{LISTING.views}</span>
            <span className={styles.statLabel}>Views</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statValue}>{LISTING.enquiries}</span>
            <span className={styles.statLabel}>Enquiries</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statValue}>{LISTING.bookings}</span>
            <span className={styles.statLabel}>Bookings</span>
          </div>
        </div>
      </div>

      {/* ---------- CTA ---------- */}
      <div className={styles.ctaBar}>
        <Link href="/owner" className={`${styles.ctaBtn} btn-primary`}>
          Go to Host Home <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}