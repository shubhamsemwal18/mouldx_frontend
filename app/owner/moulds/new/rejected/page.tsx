"use client";

import Link from "next/link";
import styles from "./ListingRejected.module.css";

interface Issue {
  label: string;
  flagged: boolean;
}

// TEMP dummy data — will come from the real admin review API
const REJECTION = {
  remarks: "Photos are too dim. Please reshoot the product with better lighting and upload the mould invoice.",
  issues: [
    { label: "Product image quality", flagged: true },
    { label: "Missing invoice", flagged: true },
    { label: "Cavity count mismatch", flagged: false },
  ] as Issue[],
};

export default function ListingRejectedPage() {
  return (
    <div className={styles.page}>
      

      <div className={styles.content}>
        <h1 className={styles.title}>Listing rejected</h1>
        <p className={styles.subtitle}>Fix the issues and resubmit for approval.</p>

        {/* ---------- Admin remarks card ---------- */}
        <div className={styles.remarksCard}>
          <span className={styles.reviewPill}>REVIEW REQUIRED</span>
          <h2 className={styles.remarksTitle}>Admin Remarks</h2>
          <p className={styles.remarksText}>{REJECTION.remarks}</p>
        </div>

        {/* ---------- Issues detected ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Issues detected</h2>

          {REJECTION.issues.map((issue) => (
            <div key={issue.label} className={styles.issueRow}>
              <span className={`${styles.checkBox} ${issue.flagged ? styles.checkBoxOn : ""}`}>
                {issue.flagged && "✓"}
              </span>
              <span className={issue.flagged ? styles.issueTextFlagged : styles.issueText}>
                {issue.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Sticky action ---------- */}
      <div className={styles.ctaBar}>
        <Link href="/owner/moulds" className={`${styles.editBtn} btn-primary`}>
          Edit Listing
        </Link>
      </div>
    </div>
  );
}