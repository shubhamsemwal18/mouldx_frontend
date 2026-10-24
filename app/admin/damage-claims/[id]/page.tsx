"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./DamageClaimReview.module.css";

interface EvidenceItem {
  label: string;
  previewUrl: string;
}

interface DamageClaimDetail {
  id: string;
  bookingId: string;
  depositHeld: number;
  ownerClaim: string;
  suggestedDeduction: number;
  evidence: EvidenceItem[];
}

// TEMP dummy data — real admin API se aayega
const CLAIM_DETAILS: Record<string, DamageClaimDetail> = {
  "1": {
    id: "1",
    bookingId: "BK-24102",
    depositHeld: 20000,
    ownerClaim:
      "Cracked mounting plate on return, inconsistent with pre-dispatch condition. Requesting ₹6,500 deduction.",
    suggestedDeduction: 6500,
    evidence: [
      { label: "Pre-dispatch", previewUrl: "https://picsum.photos/seed/claim1a/900/600" },
      { label: "Post-return", previewUrl: "https://picsum.photos/seed/claim1b/900/600" },
      { label: "Damage close-up", previewUrl: "https://picsum.photos/seed/claim1c/900/600" },
    ],
  },
  "2": {
    id: "2",
    bookingId: "BK-23990",
    depositHeld: 18500,
    ownerClaim:
      "Ejector pin bent during return handling. Cavity surface shows minor scoring. Requesting ₹4,000 deduction.",
    suggestedDeduction: 4000,
    evidence: [
      { label: "Pre-dispatch", previewUrl: "https://picsum.photos/seed/claim2a/900/600" },
      { label: "Post-return", previewUrl: "https://picsum.photos/seed/claim2b/900/600" },
    ],
  },
};

export default function DamageClaimReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const claim = CLAIM_DETAILS[id];

  const [deduction, setDeduction] = useState(claim ? String(claim.suggestedDeduction) : "");
  const [submitting, setSubmitting] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceItem | null>(null);

  const deductionAmount = Number(deduction.replace(/[^0-9.]/g, "")) || 0;

  const refundToCustomer = useMemo(() => {
    if (!claim) return 0;
    return Math.max(claim.depositHeld - deductionAmount, 0);
  }, [claim, deductionAmount]);

  if (!claim) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Claim not found.</p>
        <Link href="/admin/damage-claims" className={styles.notFoundLink}>
          ← Back to Damage Claims
        </Link>
      </div>
    );
  }

  const handleDeductionChange = (raw: string) => {
    let cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    if (Number(cleaned) > claim.depositHeld) cleaned = String(claim.depositHeld);
    setDeduction(cleaned);
  };

  const handleApprove = () => {
    if (submitting) return;
    setSubmitting(true);
    // TODO: call approve-claim API with { claimId: id, deductionAmount, refundToCustomer }
    router.push("/admin/damage-claims");
  };

  const handleRejectFullRefund = () => {
    if (submitting) return;
    setSubmitting(true);
    // TODO: call reject-claim API with { claimId: id } — full deposit refunded to customer
    router.push("/admin/damage-claims");
  };

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{claim.bookingId} · Damage Claim</h1>
        <span className={styles.statusPill}>EVIDENCE REVIEW</span>
      </div>

      {/* ---------- Grid layout ---------- */}
      <div className={styles.layout}>
        <div className={styles.leftCol}>
          {/* Evidence */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Evidence — Host vs User</h2>
            <div className={styles.evidenceGrid}>
              {claim.evidence.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={styles.evidenceThumb}
                  onClick={() => setActiveEvidence(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt={item.label} className={styles.evidenceImg} />
                  <span className={styles.evidenceLabel}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Owner's claim */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Host&apos;s Claim</h2>
            <p className={styles.claimText}>{claim.ownerClaim}</p>
          </div>
        </div>

        {/* Deposit Settlement panel */}
        <div className={styles.rightCol}>
          <div className={styles.settlementCard}>
            <h2 className={styles.cardTitle}>Deposit Settlement</h2>

            <div className={styles.settlementRow}>
              <span className={styles.settlementLabel}>Deposit held</span>
              <span className={styles.settlementValue}>₹{claim.depositHeld.toLocaleString("en-IN")}</span>
            </div>

            <label className={styles.fieldLabel}>Deduction Amount</label>
            <div className={styles.amountWrap}>
              <span className={styles.amountPrefix}>₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={deduction}
                onChange={(e) => handleDeductionChange(e.target.value)}
                className={styles.amountInput}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.settlementRow}>
              <span className={styles.refundLabel}>Refund to user</span>
              <span className={styles.refundValue}>₹{refundToCustomer.toLocaleString("en-IN")}</span>
            </div>

            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className={`${styles.approveBtn} btn-primary`}
            >
              Approve Deduction &amp; Release
            </button>
            <button
              type="button"
              onClick={handleRejectFullRefund}
              disabled={submitting}
              className={styles.rejectBtn}
            >
              Reject Claim — Full Refund
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Evidence lightbox ---------- */}
      {activeEvidence && (
        <div className={styles.lightboxOverlay} onClick={() => setActiveEvidence(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <h3 className={styles.lightboxTitle}>{activeEvidence.label}</h3>
              <button
                type="button"
                onClick={() => setActiveEvidence(null)}
                className={styles.lightboxCloseBtn}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className={styles.lightboxBody}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeEvidence.previewUrl} alt={activeEvidence.label} className={styles.lightboxImage} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}