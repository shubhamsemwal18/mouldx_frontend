"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/app/lib/admin-api";
import { getApiErrorMessage } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";
import { getPrivateFilePreviewUrl } from "@/app/lib/upload-api";
import type { MediaRef, OwnerProfileVerification, User } from "@/app/lib/types";
import styles from "./KycReviewDetail.module.css";

function getUser(verification: OwnerProfileVerification) {
  return typeof verification.user === "string" ? null : verification.user;
}

function getDocuments(verification: OwnerProfileVerification) {
  const documents: { label: string; file?: MediaRef }[] = [
    { label: "PAN Card", file: verification.personalDetails?.panCard },
    { label: "GST Certificate", file: verification.firmDetails?.gstCertificate },
    { label: "MSME Certificate", file: verification.firmDetails?.msmeCertificate },
    { label: "Electricity Bill", file: verification.firmDetails?.electricityBill },
  ];

  return documents.filter((doc) => doc.file?.key);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function KycReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [kyc, setKyc] = useState<OwnerProfileVerification | null>(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = Boolean(authUser?.approvedRoles.includes("admin"));

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return;

    let cancelled = false;

    adminApi
      .getProfileVerification(id)
      .then((data) => {
        if (!cancelled) {
          setKyc(data);
          setRemarks(data.rejectionReason || "");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load KYC request"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, id, isAdmin]);

  const documents = useMemo(() => (kyc ? getDocuments(kyc) : []), [kyc]);
  const ownerUser = kyc ? (getUser(kyc) as User | null) : null;
  const isFinal = kyc?.status === "approved" || kyc?.status === "rejected";

  const openDocument = async (file?: MediaRef) => {
    if (!file?.key) return;
    try {
      const url = await getPrivateFilePreviewUrl(file.key);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not open document"));
    }
  };

  const handleApprove = async () => {
    if (!kyc || submitting || isFinal) return;

    try {
      setSubmitting(true);
      await adminApi.reviewProfileVerification(kyc._id, { status: "approved" });
      router.push("/admin/kyc");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not approve KYC"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!kyc || submitting || isFinal) return;
    if (!remarks.trim()) {
      setError("Please add remarks explaining the rejection.");
      return;
    }

    try {
      setSubmitting(true);
      await adminApi.reviewProfileVerification(kyc._id, {
        status: "rejected",
        reason: remarks.trim(),
      });
      router.push("/admin/kyc");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not reject KYC"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !isAdmin) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Admin login is required to view this KYC request.</p>
        <Link href="/login" className={styles.notFoundLink}>
          Login
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className={styles.notFoundText}>Loading KYC request...</p>;
  }

  if (!kyc) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>{error || "KYC request not found."}</p>
        <Link href="/admin/kyc" className={styles.notFoundLink}>
          ← Back to KYC Approvals
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className="min-w-0">
          <h1 className={styles.title}>
            {ownerUser?.fullName || "User"} · {kyc.firmDetails?.name || "Firm"}
          </h1>
        </div>
        <div className={styles.headerPills}>
          <span className={styles.statusPill}>{kyc.status === "in_review" ? "PENDING REVIEW" : kyc.status.toUpperCase()}</span>
        </div>
      </div>

      {error && <p className={styles.notFoundText}>{error}</p>}

      <div className={styles.layout}>
        <div className={`${styles.card} ${styles.docsArea}`}>
          <h2 className={styles.cardTitle}>Submitted Documents</h2>
          <div className={styles.docsGrid}>
            {documents.map((doc) => (
              <button
                key={doc.label}
                type="button"
                className={styles.docThumb}
                onClick={() => openDocument(doc.file)}
              >
                <span className={styles.docIcon} aria-hidden>
                  📄
                </span>
                <span className={styles.docLabel}>{doc.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.decisionArea}>
          <div className={styles.decisionCard}>
            <h2 className={styles.cardTitle}>Decision</h2>

            <label className={styles.fieldLabel}>Remarks sent to user</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks if rejecting..."
              rows={4}
              className={styles.textarea}
              disabled={isFinal}
            />

            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting || isFinal}
              className={`${styles.approveBtn} btn-primary`}
            >
              ✓ Approve KYC
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={submitting || isFinal}
              className={styles.rejectBtn}
            >
              ✕ Reject with Remarks
            </button>
          </div>
        </div>

        <div className={styles.detailsArea}>
          <div className={styles.detailsGrid}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Personal Details</h2>
              <Row label="Name" value={ownerUser?.fullName || "-"} />
              <Row label="Phone No." value={ownerUser?.phone || "-"} />
              <Row label="Email ID – POC" value={ownerUser?.email || "-"} />
              <Row label="PAN" value={kyc.personalDetails?.panNumber || "-"} isLast />
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Firm Details</h2>
              <Row label="Email ID" value={kyc.firmDetails?.email || "-"} />
              <Row label="Firm Name" value={kyc.firmDetails?.name || "-"} />
              <Row label="Address" value={kyc.firmDetails?.address || "-"} />
              <Row label="GST No." value={kyc.firmDetails?.gstNumber || "-"} isLast />
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Payout Details</h2>
              <Row label="Bank A/C No." value={kyc.payoutDetails?.bankAccountNumber || "Hidden"} />
              <Row label="IFSC Code" value={kyc.payoutDetails?.ifscCode || "-"} />
              <Row label="Account Holder" value={kyc.payoutDetails?.accountHolderName || "-"} />
              <Row label="Bank Name" value={kyc.payoutDetails?.bankName || "-"} />
              <Row label="UPI ID" value={kyc.payoutDetails?.upiId || "-"} isLast />
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Submission</h2>
              <Row label="Submitted At" value={formatDate(kyc.submittedAt)} />
              <Row label="Reviewed At" value={formatDate(kyc.reviewedAt)} />
              <Row label="Rejection Reason" value={kyc.rejectionReason || "-"} isLast />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className={`${styles.detailRow} ${isLast ? styles.detailRowLast : ""}`}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}
