"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { useActiveRole } from "@/app/lib/active-role";
import styles from "./ProfileApproved.module.css";

export default function ProfileApprovedPage() {
  const router = useRouter();
  const { user, ownerProfileVerification, loading } = useAuth();
  const { activeRole } = useActiveRole(user?.profileVerificationStatus === "approved" && Boolean(user.approvedRoles.includes("owner")));
  const isHostMode = activeRole === "owner" && Boolean(user?.approvedRoles.includes("owner"));
  const status = ownerProfileVerification?.status || user?.profileVerificationStatus;
  const approvedAt = ownerProfileVerification?.reviewedAt
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ownerProfileVerification.reviewedAt))
    : "Approved";
  const firmName = ownerProfileVerification?.firmDetails?.name || "Your firm";

  useEffect(() => {
    if (loading) return;

    if (status === "in_review") {
      router.replace("/onboarding/review");
      return;
    }

    if (status === "rejected") {
      router.replace("/onboarding/rejected");
      return;
    }

    if (status !== "approved") {
      router.replace("/onboarding/profile");
    }
  }, [loading, router, status]);

  if (loading || status !== "approved") {
    return null;
  }

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
            {firmName} is now verified on MouldX.
          </p>
          <p className={styles.approvedMeta}>Approved · {approvedAt}</p>
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
              <p className={styles.nextTitle}>{isHostMode ? "List your first mould" : "Find your next mould"}</p>
              <p className={styles.nextMeta}>{isHostMode ? "Add your mould and product details" : "Browse available moulds"}</p>
            </div>
          </div>

          <div className={styles.nextRow}>
            <span className={styles.nextDot}>3</span>
            <div>
              <p className={styles.nextTitle}>{isHostMode ? "Submit your listing for approval" : "Request a booking"}</p>
              <p className={styles.nextMeta}>{isHostMode ? "Approved listings appear in the catalogue" : "Select dates and send your request"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Sticky CTA ---------- */}
      <div className={styles.ctaBar}>
        <Link href={isHostMode ? "/owner/moulds/new/product" : "/"} className={`${styles.ctaBtn} btn-primary`}>
          {isHostMode ? "+ List a Mould" : "Explore Moulds"}
        </Link>
        <Link href="/" className={styles.skipLink}>
          Go to Home
        </Link>
      </div>
    </div>
  );
}
