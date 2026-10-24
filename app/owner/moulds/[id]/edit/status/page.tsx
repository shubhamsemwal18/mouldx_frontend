"use client";

import Link from "next/link";
import styles from "../EditStatus.module.css";
import { useEditMould } from "../EditMouldProvider";

function formatDateTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EditStatusPage() {
  const { id, listing, product } = useEditMould();
  const { approval, stats } = listing;

  if (approval.status === "PENDING") {
    const steps = [
      { id: "submitted", title: "Changes submitted", state: "done", meta: formatDateTime(approval.submittedAt) },
      { id: "review", title: "Admin review", state: "pending", meta: `Pending · ETA ${approval.etaHours ?? 12}h` },
      { id: "live", title: "Live to users", state: "upcoming", meta: "Updated listing goes live after approval" },
    ];

    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.title}>Listing Review</h1>
          <p className={styles.subtitle}>MouldX admin reviews every change before it goes live.</p>

          <div className={styles.statusCard}>
            <span className={styles.statusPill}>UNDER REVIEW</span>
            <h2 className={styles.statusHeading}>Approval pending</h2>
            <p className={styles.listingName}>{product.productName}</p>
            <p className={styles.listingCode}>{listing.code}</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Progress Timeline</h2>
            {steps.map((step, i) => (
              <div key={step.id} className={styles.timelineRow}>
                <div className={styles.timelineDotCol}>
                  <span
                    className={`${styles.dot} ${
                      step.state === "done"
                        ? styles.dotDone
                        : step.state === "pending"
                        ? styles.dotPending
                        : styles.dotUpcoming
                    }`}
                  >
                    {step.state === "done" && <span className={styles.dotCheck}>✓</span>}
                  </span>
                  {i < steps.length - 1 && <span className={styles.connector} />}
                </div>
                <div className={styles.timelineText}>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={styles.stepMeta}>{step.meta}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.infoFlag}>
            <span className={styles.infoIcon} aria-hidden>
              i
            </span>
            <p className={styles.infoText}>
              This mould will not appear in user search or Explore until admin approval is complete.
            </p>
          </div>
        </div>

        <div className={styles.ctaBar}>
          <Link href="/owner" className={styles.primaryBtn}>
            Go to Dashboard
          </Link>
          <Link href="/owner/moulds" className={styles.secondaryLink}>
            View My Moulds
          </Link>
        </div>
      </div>
    );
  }

  if (approval.status === "REJECTED") {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.title}>Listing rejected</h1>
          <p className={styles.subtitle}>Fix the issues and resubmit for approval.</p>

          <div className={styles.remarksCard}>
            <span className={styles.reviewPill}>REVIEW REQUIRED</span>
            <h2 className={styles.remarksTitle}>Admin Remarks</h2>
            <p className={styles.remarksText}>{approval.remarks}</p>
          </div>

          {approval.issues && approval.issues.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Issues detected</h2>
              {approval.issues.map((issue) => (
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
          )}
        </div>

        <div className={styles.ctaBar}>
          <Link href={`/owner/moulds/${id}/edit/technical`} className={styles.primaryBtn}>
            Edit Listing
          </Link>
          <Link href="/owner/moulds" className={styles.secondaryLink}>
            View My Moulds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Listing Approval</h1>
        <p className={styles.subtitle}>Admin has verified the complete mould listing.</p>

        <div className={styles.heroCard}>
          <span className={styles.approvedPill}>
            <span aria-hidden>✓</span> APPROVED
          </span>
          <h2 className={styles.heroHeading}>Mould is LIVE</h2>
          <p className={styles.heroSubtext}>The listing is now visible to users.</p>
        </div>

        <div className={styles.card}>
          <div className={styles.statusRow}>
            <h2 className={styles.cardTitle}>Listing status</h2>
            <span className={styles.livePill}>
              <span className={styles.liveDot} aria-hidden />
              LIVE
            </span>
          </div>
          <p className={styles.mouldIdText}>
            Mould ID · <span className={styles.mouldIdValue}>{listing.code}</span>
          </p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statChip}>
            <span className={styles.statValue}>{stats.views}</span>
            <span className={styles.statLabel}>Views</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statValue}>{stats.enquiries}</span>
            <span className={styles.statLabel}>Enquiries</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statValue}>{stats.bookings}</span>
            <span className={styles.statLabel}>Bookings</span>
          </div>
        </div>
      </div>

      <div className={styles.ctaBar}>
        <Link href="/owner" className={styles.primaryBtn}>
          Go to Host Home <span aria-hidden>→</span>
        </Link>
        <Link href="/owner/moulds" className={styles.secondaryLink}>
          View My Moulds
        </Link>
      </div>
    </div>
  );
}