"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getApiErrorMessage } from "@/app/lib/api";
import { productApi } from "@/app/lib/product-api";
import type { ProductDetail } from "@/app/lib/types";
import styles from "./ListingSubmitted.module.css";

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
}) : "Submitted";

export default function ListingSubmittedPage() {
  const id = useSearchParams().get("id");
  const [result, setResult] = useState<{ id: string | null; detail?: ProductDetail; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let detail: ProductDetail;
        if (id) detail = await productApi.get(id);
        else {
          const data = await productApi.list({ status: "in_review", limit: 1 });
          if (!data.products[0]) throw new Error("No listing is currently awaiting approval.");
          detail = { product: data.products[0], moulds: [] };
        }
        if (!cancelled) setResult({ id, detail });
      } catch (error) {
        if (!cancelled) setResult({ id, error: getApiErrorMessage(error, "Could not load this listing.") });
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [id, attempt]);
  const detail = result?.id === id ? result.detail : undefined;
  if (!detail) return <div className={styles.page}><div className={styles.content}>
    <p role={result?.error ? "alert" : "status"}>{result?.error || "Loading listing status..."}</p>
    {result?.error && <button className={styles.dashboardBtn} type="button" onClick={() => { setResult(undefined); setAttempt((value) => value + 1); }}>Try again</button>}
    <Link href="/owner/moulds" className={styles.myMouldsLink}>View My Products</Link>
  </div></div>;

  const update = detail.pendingUpdate;
  const product = update?.product || detail.product;
  const status = update?.status || detail.product.status;
  const pending = status === "in_review";
  const rejected = status === "rejected";
  const approved = !update && status === "approved";
  const steps = [
    { title: update ? "Update submitted" : "Listing submitted", done: true, meta: formatDate(update?.submittedAt || detail.product.submittedAt) },
    { title: "Admin review", done: approved || rejected, meta: rejected ? "Changes requested" : approved ? "Approved" : "Pending" },
    { title: update ? "Publish approved changes" : "Live to users", done: approved, meta: update ? "Current published version remains unchanged" : approved ? "Published" : "Available after approval" },
  ];
  return <div className={styles.page}>
    <div className={styles.content}>
      <h1 className={styles.title}>{update ? "Listing Update" : "Listing Review"}</h1>
      <p className={styles.subtitle}>{update ? "Your changes need admin approval before they are published." : "MouldX admin reviews every listing before it goes live."}</p>
      <div className={styles.statusCard} role="status">
        <span className={styles.statusPill}>{pending ? "UNDER REVIEW" : rejected ? "CHANGES REQUESTED" : approved ? "APPROVED" : "DRAFT"}</span>
        <h2 className={styles.statusHeading}>{pending ? "Approval pending" : rejected ? "Update your details" : approved ? "Listing approved" : "Draft saved"}</h2>
        <p className={styles.listingName}>{product.name}</p><p className={styles.listingCode}>{product.code}</p>
        {rejected && <p>{update?.rejectionReason || detail.product.rejectionReason}</p>}
      </div>
      <div className={styles.card}><h2 className={styles.cardTitle}>Progress Timeline</h2>
        {steps.map((step, index) => <div key={step.title} className={styles.timelineRow}>
          <div className={styles.timelineDotCol}><span className={`${styles.dot} ${step.done ? styles.dotDone : index === 1 ? styles.dotPending : styles.dotUpcoming}`} />{index < steps.length - 1 && <span className={styles.connector} />}</div>
          <div className={styles.timelineText}><p className={styles.stepTitle}>{step.title}</p><p className={styles.stepMeta}>{step.meta}</p></div>
        </div>)}
      </div>
      {(update || !approved) && <div className={styles.infoFlag}><p className={styles.infoText}>{update ? detail.product.availability === "maintenance" ? "Your published details stay unchanged. This product remains unavailable for new bookings while under maintenance." : "Customers can still view and book the current published version until your update is approved." : "This listing will appear in Explore after admin approval."}</p></div>}
    </div>
    <div className={styles.ctaBar}><Link href={`/owner/moulds/${detail.product._id}`} className={`${styles.dashboardBtn} btn-primary`}>View Product</Link><Link href="/owner/moulds" className={styles.myMouldsLink}>View My Products</Link></div>
  </div>;
}
