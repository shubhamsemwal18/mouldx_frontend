"use client";

import styles from "./ProfileReview.module.css";

interface TimelineStep {
  id: string;
  title: string;
  status: "done" | "pending" | "upcoming";
  meta: string;
}

// TEMP dummy data — will come from the real profile-submission API
const REVIEW = {
  submittedAt: "14 Sep · 10:22 AM",
  etaHours: 12,
  steps: [
    { id: "submitted", title: "Profile submitted", status: "done", meta: "14 Sep · 10:22 AM" },
    { id: "approval", title: "Admin approval", status: "pending", meta: "Pending · ETA 12h" },
    { id: "access", title: "Dashboard access", status: "upcoming", meta: "Available after approval" },
  ] as TimelineStep[],
};

export default function CustomerProfileReviewPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Profile / KYC Review</h1>
        <p className={styles.subtitle}>MouldX admin reviews every submitted user profile.</p>

        {/* ---------- Status card ---------- */}
        <div className={styles.statusCard}>
          <span className={styles.statusPill}>UNDER REVIEW</span>
          <h2 className={styles.statusHeading}>Approval pending</h2>
          <p className={styles.statusRemark}>Remarks, if any, will be sent to your registered email.</p>
        </div>

        {/* ---------- Progress timeline ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Progress Timeline</h2>

          {REVIEW.steps.map((step, i) => (
            <div key={step.id} className={styles.timelineRow}>
              <div className={styles.timelineDotCol}>
                <span
                  className={`${styles.dot} ${
                    step.status === "done"
                      ? styles.dotDone
                      : step.status === "pending"
                      ? styles.dotPending
                      : styles.dotUpcoming
                  }`}
                />
                {i < REVIEW.steps.length - 1 && <span className={styles.connector} />}
              </div>
              <div className={styles.timelineText}>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepMeta}>{step.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}