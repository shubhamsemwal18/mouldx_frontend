"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ConfirmPay.module.css";

type PaymentMode = "online" | "cash";

// TEMP dummy data - the real booking summary will come from the API
const BOOKING_SUMMARY = {
  dateRange: "14 – 20 Sep",
  days: 7,
  pricePerDay: 1800,
  securityDeposit: 15000,
  platformFee: 0,
};

const PAYMENT_OPTIONS: { value: PaymentMode; title: string; desc: string }[] = [
  {
    value: "online",
    title: "Pay Online to Host",
    desc: "Transfer rent & deposit directly to the host via UPI or bank transfer.",
  },
  {
    value: "cash",
    title: "Pay in Cash",
    desc: "Hand over rent & deposit to the host in cash at the time of pickup.",
  },
];

export default function ConfirmPayPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PaymentMode>("online");
  const [acknowledged, setAcknowledged] = useState(false);

  const rent = BOOKING_SUMMARY.pricePerDay * BOOKING_SUMMARY.days;
  const total = rent + BOOKING_SUMMARY.securityDeposit + BOOKING_SUMMARY.platformFee;

  const canProceed = acknowledged;

  const handleSelectMode = (next: PaymentMode) => {
    setMode(next);
    setAcknowledged(false);
  };

  const handleProceed = () => {
    if (!canProceed) return;
    // TODO: submit booking for owner approval (no payment yet), include the selected mode
    router.push(`/booking-success?status=pending-approval&mode=${mode}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Confirm &amp; pay</h1>
        <p className={styles.subtitle}>
          {BOOKING_SUMMARY.dateRange} · {BOOKING_SUMMARY.days} days
        </p>

        {/* ---------- Fare breakdown ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Fare Breakdown</h2>

          <div className={styles.fareRow}>
            <span className={styles.fareLabel}>
              Rent ({BOOKING_SUMMARY.days} × ₹{BOOKING_SUMMARY.pricePerDay.toLocaleString("en-IN")})
            </span>
            <span className={styles.fareValue}>₹{rent.toLocaleString("en-IN")}</span>
          </div>

          <div className={styles.fareRow}>
            <span className={styles.fareLabel}>Security deposit</span>
            <span className={styles.fareValue}>
              ₹{BOOKING_SUMMARY.securityDeposit.toLocaleString("en-IN")}
            </span>
          </div>

          <div className={styles.fareRow}>
            <span className={styles.fareLabel}>Platform fee</span>
            <span className={styles.fareValue}>
              ₹{BOOKING_SUMMARY.platformFee.toLocaleString("en-IN")}
            </span>
          </div>

          <div className={styles.divider} />

          <div className={styles.fareRow}>
            <span className={styles.totalLabel}>Total payable</span>
            <span className={styles.totalValue}>₹{total.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* ---------- Payment method selection ---------- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>How do you want to pay?</h2>

          {PAYMENT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`${styles.methodOption} ${
                mode === option.value ? styles.methodOptionActive : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                checked={mode === option.value}
                onChange={() => handleSelectMode(option.value)}
                className={styles.radio}
              />
              <div className={styles.methodInfo}>
                <p className={styles.methodTitle}>{option.title}</p>
                <p className={styles.methodDesc}>{option.desc}</p>
              </div>
            </label>
          ))}

          {/* ---------- Direct-to-owner warning ---------- */}
          <div className={styles.warningBox}>
            <p className={styles.warningText}>
              If you pay the host directly
              {mode === "cash" ? " in cash" : " online"}, MouldX will not be responsible
              for any issues with the payment, deposit, or mould condition.
              {mode === "cash"
                ? " Please ask the host for a written receipt when you hand over the cash."
                : " Please keep a screenshot or reference number of your transfer."}{" "}
              Your booking will be sent for host approval instead of payment.
            </p>
            <label className={styles.ackRow}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className={styles.checkbox}
              />
              I understand and agree to proceed without platform protection.
            </label>
          </div>
        </div>
      </div>

      {/* ---------- Sticky CTA ---------- */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          disabled={!canProceed}
          onClick={handleProceed}
          className={`${styles.ctaBtn} ${canProceed ? "btn-primary" : styles.ctaBtnDisabled}`}
        >
          Send for Approval →
        </button>
      </div>
    </div>
  );
}