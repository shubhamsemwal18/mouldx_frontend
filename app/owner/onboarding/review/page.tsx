"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import styles from "./ProfileReview.module.css";

interface TimelineStep {
  id: string;
  title: string;
  status: "done" | "pending" | "upcoming";
  meta: string;
}

const REVIEW_META = {
  submittedAt: "Submitted",
  etaHours: 24,
};

export default function ProfileReviewPage() {
  const router = useRouter();
  const { user, ownerProfileVerification, loading, refreshCurrentUser } = useAuth();
  const [checkedServerStatus, setCheckedServerStatus] = useState(false);
  const status = ownerProfileVerification?.status || user?.profileVerificationStatus;
  const submittedAt = ownerProfileVerification?.submittedAt
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ownerProfileVerification.submittedAt))
    : REVIEW_META.submittedAt;
  const steps: TimelineStep[] = [
    { id: "submitted", title: "Profile submitted", status: "done", meta: submittedAt },
    { id: "approval", title: "Admin approval", status: "pending", meta: `Pending · ETA ${REVIEW_META.etaHours}h` },
    { id: "moulds", title: "Mould details", status: "upcoming", meta: "Available after approval" },
  ];

  useEffect(() => {
    if (loading) return;

    refreshCurrentUser()
      .catch(() => undefined)
      .finally(() => setCheckedServerStatus(true));
  }, [loading, refreshCurrentUser]);

  useEffect(() => {
    if (loading || !checkedServerStatus) return;

    if (status === "approved") {
      router.replace("/owner/onboarding/approved");
      return;
    }
    if (status === "rejected") {
      router.replace("/owner/onboarding/rejected");
      return;
    }
    if (status !== "in_review") {
      router.replace("/owner/onboarding/profile");
    }
  }, [checkedServerStatus, loading, router, status]);

  if (loading || !checkedServerStatus || status !== "in_review") {
    return null;
  }

  return (
    <div className={styles.page}>
     

      <div className={styles.content}>
        <h1 className={styles.title}>Profile / KYC Review</h1>
        <p className={styles.subtitle}>MouldX admin reviews the submitted owner profile.</p>

        {/* ---------- Status card ---------- */}
        <div className={styles.statusCard}>
          <span className={styles.statusPill}>UNDER REVIEW</span>
          <h2 className={styles.statusHeading}>Approval pending</h2>
          <p className={styles.statusRemark}>Remarks, if any, sent to POC &amp; company email.</p>
        </div>

        {/* ---------- Progress timeline ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Progress Timeline</h2>

          {steps.map((step, i) => (
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
                {i < steps.length - 1 && <span className={styles.connector} />}
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
