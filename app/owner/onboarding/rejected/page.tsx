"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import styles from "./ProfileRejected.module.css";

export default function ProfileRejectedPage() {
  const router = useRouter();
  const { user, ownerProfileVerification, loading, refreshCurrentUser } = useAuth();
  const [checkedServerStatus, setCheckedServerStatus] = useState(false);
  const status = ownerProfileVerification?.status || user?.profileVerificationStatus;
  const remarks =
    ownerProfileVerification?.rejectionReason ||
    "Please review the admin remarks and resubmit your profile.";

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

    if (status === "in_review") {
      router.replace("/owner/onboarding/review");
      return;
    }

    if (status !== "rejected") {
      router.replace("/owner/onboarding/profile");
    }
  }, [checkedServerStatus, loading, router, status]);

  const handleResubmit = () => {
    router.push("/owner/onboarding/profile");
  };

  if (loading || !checkedServerStatus || status !== "rejected") {
    return null;
  }

  return (
    <div className={styles.page}>
     
      <div className={styles.content}>
        <h1 className={styles.title}>Profile rejected</h1>
        <p className={styles.subtitle}>Please review the admin remarks and resubmit.</p>

        {/* ---------- Admin remarks card ---------- */}
        <div className={styles.remarksCard}>
          <span className={styles.reviewPill}>REVIEW REQUIRED</span>
          <h2 className={styles.remarksTitle}>Admin Remarks</h2>
          <p className={styles.remarksText}>{remarks}</p>
        </div>

        {/* ---------- Documents to fix ---------- */}
        <div className={styles.docsCard}>
          <span className={styles.docsIcon} aria-hidden>
            !
          </span>
          <div>
            <p className={styles.docsTitle}>Documents to fix</p>
            <p className={styles.docsList}>Update the requested details and upload fresh documents.</p>
          </div>
        </div>
      </div>

      {/* ---------- Sticky actions ---------- */}
      <div className={styles.ctaBar}>
        <button type="button" onClick={handleResubmit} className={`${styles.resubmitBtn} btn-primary`}>
          Resubmit Profile
        </button>
        <Link href="/inbox/admin-support" className={styles.supportBtn}>
          Contact Support
        </Link>
      </div>
    </div>
  );
}
