"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./BookingApprovalDetail.module.css";

interface BookingDetail {
  id: string;
  bookingId: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  rent: number;
  securityDeposit: number;
  razorpayTxnId: string;
  paymentStatus: "CAPTURED" | "PROCESSING" | "FAILED";
  customer: string;
  customerCity: string;
  owner: string;
  ownerVerified: boolean;
}

// TEMP dummy data — real admin API se aayega
const BOOKING_DETAILS: Record<string, BookingDetail> = {
  "1": {
    id: "1",
    bookingId: "BK-24581",
    status: "PENDING",
    rent: 12600,
    securityDeposit: 15000,
    razorpayTxnId: "rzp_live_29xk1",
    paymentStatus: "CAPTURED",
    customer: "Rohit Sharma",
    customerCity: "Pune",
    owner: "Sharma Industries",
    ownerVerified: true,
  },
  "2": {
    id: "2",
    bookingId: "BK-24602",
    status: "PENDING",
    rent: 15600,
    securityDeposit: 18000,
    razorpayTxnId: "rzp_live_38yl2",
    paymentStatus: "CAPTURED",
    customer: "Neha Kapoor",
    customerCity: "Nashik",
    owner: "Nova Plastics",
    ownerVerified: true,
  },
  "3": {
    id: "3",
    bookingId: "BK-24611",
    status: "PENDING",
    rent: 25200,
    securityDeposit: 20000,
    razorpayTxnId: "rzp_live_47zm3",
    paymentStatus: "PROCESSING",
    customer: "Vikram Rao",
    customerCity: "Aurangabad",
    owner: "Vector Molds",
    ownerVerified: true,
  },
};

export default function BookingApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const booking = BOOKING_DETAILS[id];
  const [submitting, setSubmitting] = useState(false);

  if (!booking) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Booking not found.</p>
        <Link href="/admin/bookings" className={styles.notFoundLink}>
          ← Back to Booking Approvals
        </Link>
      </div>
    );
  }

  const total = booking.rent + booking.securityDeposit;

  const handleApprove = () => {
    if (submitting) return;
    setSubmitting(true);
    // TODO: call approve-booking API with { bookingId: id } — owner notified to dispatch
    router.push("/admin/bookings");
  };

  const handleDecline = () => {
    if (submitting) return;
    setSubmitting(true);
    // TODO: call decline-booking API with { bookingId: id } — triggers refund to customer
    router.push("/admin/bookings");
  };

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{booking.bookingId} · Verify &amp; Approve</h1>
        <span className={styles.statusPill}>{booking.status}</span>
      </div>

      {/* ---------- Grid layout ---------- */}
      <div className={styles.layout}>
        <div className={styles.leftCol}>
          {/* Payment Verification */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Payment Verification</h2>

            <Row label="Rent" value={`₹${booking.rent.toLocaleString("en-IN")}`} />
            <Row label="Security deposit" value={`₹${booking.securityDeposit.toLocaleString("en-IN")}`} />
            <Row label="Razorpay Txn ID" value={booking.razorpayTxnId} />

            <div className={styles.statusRow}>
              <span className={styles.detailLabel}>Status</span>
              <span
                className={`${styles.paymentPill} ${
                  booking.paymentStatus === "CAPTURED"
                    ? styles.paymentCaptured
                    : booking.paymentStatus === "PROCESSING"
                    ? styles.paymentProcessing
                    : styles.paymentFailed
                }`}
              >
                {booking.paymentStatus}
              </span>
            </div>
          </div>

          {/* Parties */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Parties</h2>

            <Row label="User" value={`${booking.customer} · ${booking.customerCity}`} />
            <Row
              label="Host"
              value={`${booking.owner}${booking.ownerVerified ? " · KYC Verified" : ""}`}
              isLast
            />
          </div>
        </div>

        {/* Decision panel */}
        <div className={styles.rightCol}>
          <div className={styles.decisionCard}>
            <h2 className={styles.cardTitle}>Decision</h2>

            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className={`${styles.approveBtn} btn-primary`}
            >
              ✓ Approve Booking
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={submitting}
              className={styles.declineBtn}
            >
              ✕ Decline &amp; Refund
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