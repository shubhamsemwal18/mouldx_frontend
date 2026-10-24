"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./ListingSubmitted.module.css";
import { productApi } from "@/app/lib/product-api";
import type { Product } from "@/app/lib/types";

interface TimelineStep {
  id: string;
  title: string;
  status: "done" | "pending" | "upcoming";
  meta: string;
}

const formatSubmittedAt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Just now";

const buildSteps = (listing: Product | null): TimelineStep[] => [
  {
    id: "submitted",
    title: "Listing submitted",
    status: "done",
    meta: formatSubmittedAt(listing?.submittedAt),
  },
  { id: "review", title: "Admin review", status: "pending", meta: "Pending" },
  {
    id: "live",
    title: "Live to users",
    status: "upcoming",
    meta: "Visible in Explore after approval",
  },
];

export default function ListingSubmittedPage() {
  const [listing, setListing] = useState<Product | null>(null);

  // Shows the listing that was just submitted (the newest one under review).
  useEffect(() => {
    let cancelled = false;

    productApi
      .list({ status: "in_review", limit: 1 })
      .then((data) => {
        if (!cancelled) setListing(data.products[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setListing(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const steps = buildSteps(listing);

  return (
    <div className={styles.page}>
     

      <div className={styles.content}>
        <h1 className={styles.title}>Listing Review</h1>
        <p className={styles.subtitle}>MouldX admin reviews every listing before it goes live.</p>

        {/* ---------- Status card ---------- */}
        <div className={styles.statusCard}>
          <span className={styles.statusPill}>UNDER REVIEW</span>
          <h2 className={styles.statusHeading}>Approval pending</h2>
          <p className={styles.listingName}>{listing?.name || "Your listing"}</p>
          <p className={styles.listingCode}>{listing?.code || ""}</p>
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
                >
                  {step.status === "done" && <span className={styles.dotCheck}>✓</span>}
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

        {/* ---------- Info note ---------- */}
        <div className={styles.infoFlag}>
          <span className={styles.infoIcon} aria-hidden>
            i
          </span>
          <p className={styles.infoText}>
            This mould will not appear in user search or Explore until admin approval is complete.
          </p>
        </div>
      </div>

      {/* ---------- Actions ---------- */}
      <div className={styles.ctaBar}>
        <Link href="/owner" className={`${styles.dashboardBtn} btn-primary`}>
          Go to Dashboard
        </Link>
        <Link href="/owner/moulds" className={styles.myMouldsLink}>
          View My Moulds
        </Link>
      </div>
    </div>
  );
}