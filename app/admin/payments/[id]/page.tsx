"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./PaymentDetail.module.css";

type TxnStatus = "CAPTURED" | "PROCESSED" | "PROCESSING" | "DISPUTED" | "FAILED";

interface TransactionDetail {
  id: string;
  txnId: string;
  bookingId: string;
  type: string;
  amount: number;
  status: TxnStatus;
  date: string;
  gateway: string;
  customer: string;
  owner: string;
  method: string;
  notes: string;
}

const STATUS_OPTIONS: TxnStatus[] = ["CAPTURED", "PROCESSING", "PROCESSED", "DISPUTED", "FAILED"];

// TEMP dummy data — real Razorpay/ledger API se aayega
const TRANSACTIONS: Record<string, TransactionDetail> = {
  "1": {
    id: "1",
    txnId: "rzp_29xk1",
    bookingId: "BK-24581",
    type: "Booking Payment",
    amount: 27850,
    status: "CAPTURED",
    date: "14 Sep 2026 · 10:22 AM",
    gateway: "Razorpay",
    customer: "Rohit Sharma",
    owner: "Sharma Industries",
    method: "UPI",
    notes: "",
  },
  "2": {
    id: "2",
    txnId: "rzp_29xl9",
    bookingId: "BK-24102",
    type: "Deposit Refund",
    amount: 13500,
    status: "PROCESSED",
    date: "13 Sep 2026 · 4:10 PM",
    gateway: "Razorpay",
    customer: "Neha Kapoor",
    owner: "Nova Plastics",
    method: "Bank Transfer",
    notes: "Refund after damage deduction of ₹6,500.",
  },
  "3": {
    id: "3",
    txnId: "rzp_29xm2",
    bookingId: "BK-24611",
    type: "Booking Payment",
    amount: 31200,
    status: "PROCESSING",
    date: "12 Sep 2026 · 9:05 AM",
    gateway: "Razorpay",
    customer: "Vikram Rao",
    owner: "Vector Molds",
    method: "Credit Card",
    notes: "Awaiting bank confirmation.",
  },
  "4": {
    id: "4",
    txnId: "rzp_29xn7",
    bookingId: "BK-23990",
    type: "Deposit Deduction",
    amount: 4200,
    status: "DISPUTED",
    date: "11 Sep 2026 · 1:40 PM",
    gateway: "Razorpay",
    customer: "Anjali Deshpande",
    owner: "Apex Poly",
    method: "N/A",
    notes: "User disputes the deduction amount — claims damage was pre-existing.",
  },
};

const STATUS_CLASS: Record<TxnStatus, string> = {
  CAPTURED: "statusCaptured",
  PROCESSED: "statusProcessed",
  PROCESSING: "statusProcessing",
  DISPUTED: "statusDisputed",
  FAILED: "statusFailed",
};

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const txn = TRANSACTIONS[id];

  const [status, setStatus] = useState<TxnStatus>(txn?.status ?? "PROCESSING");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!txn) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Transaction not found.</p>
        <Link href="/admin/payments" className={styles.notFoundLink}>
          ← Back to Payments
        </Link>
      </div>
    );
  }

  const handleSave = () => {
    if (submitting) return;
    setSubmitting(true);
    // TODO: call update-transaction-status API with { txnId: id, status, adminNote }
    router.push("/admin/payments");
  };

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{txn.txnId}</h1>
        <span className={`${styles.statusPill} ${styles[STATUS_CLASS[txn.status]]}`}>{txn.status}</span>
      </div>

      {/* ---------- Grid layout ---------- */}
      <div className={styles.layout}>
        <div className={styles.leftCol}>
          {/* Transaction summary */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Transaction Summary</h2>
            <Row label="Booking" value={txn.bookingId} />
            <Row label="Type" value={txn.type} />
            <Row label="Amount" value={`₹${txn.amount.toLocaleString("en-IN")}`} />
            <Row label="Payment Method" value={txn.method} />
            <Row label="Gateway" value={txn.gateway} />
            <Row label="Date" value={txn.date} isLast />
          </div>

          {/* Parties */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Parties</h2>
            <Row label="User" value={txn.customer} />
            <Row label="Host" value={txn.owner} isLast />
          </div>

          {/* Notes, if any */}
          {txn.notes && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Notes</h2>
              <p className={styles.notesText}>{txn.notes}</p>
            </div>
          )}
        </div>

        {/* Status update panel */}
        <div className={styles.rightCol}>
          <div className={styles.statusCard}>
            <h2 className={styles.cardTitle}>Update Status</h2>

            <label className={styles.fieldLabel}>Current Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TxnStatus)}
              className={styles.select}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label className={styles.fieldLabelSpaced}>Admin Note (internal)</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a note about this status change..."
              rows={4}
              className={styles.textarea}
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className={`${styles.saveBtn} btn-primary`}
            >
              {submitting ? "Saving…" : "Save Status"}
            </button>
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