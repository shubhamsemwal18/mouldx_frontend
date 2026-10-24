"use client";

import { useRouter } from "next/navigation";
import styles from "./BookingSuccess.module.css";

interface TimelineStep {
  id: string;
  title: string;
  status: "done" | "pending" | "upcoming";
  meta: string;
}

const BOOKING = {
  id: "BK-24581",
  steps: [
    { id: "payment", title: "Payment received", status: "done", meta: "Just now" },
    { id: "approval", title: "Host approval", status: "pending", meta: "Pending · ETA 6h" },
    { id: "dispatch", title: "Dispatch", status: "upcoming", meta: "Scheduled after approval" },
  ] as TimelineStep[],
};

export default function BookingSuccessPage() {
  const router = useRouter();

  return (
    <div
      className={`${styles.page} flex h-screen flex-col justify-between overflow-hidden bg-white px-6 pt-5 pb-8`}
    >
      <div>
        {/* ---------- Animated success icon ---------- */}
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

          <h1 className={styles.title}>Booking confirmed!</h1>
          <p className={styles.bookingIdText}>
            Booking ID <span className={styles.bookingIdValue}>{BOOKING.id}</span>
          </p>
          <p className={styles.subtitle}>Awaiting host approval &amp; dispatch.</p>
        </div>

        {/* ---------- Timeline ---------- */}
        <div className={styles.timelineCard}>
          {BOOKING.steps.map((step, i) => (
            <div key={step.id} className={styles.timelineRow}>
              <div className={styles.timelineDotCol}>
                <span
                  className={`${styles.dot} ${step.status === "done"
                      ? styles.dotDone
                      : step.status === "pending"
                        ? styles.dotPending
                        : styles.dotUpcoming
                    }`}
                >
                  {step.status === "done" && <span className={styles.dotCheck}>✓</span>}
                </span>
                {i < BOOKING.steps.length - 1 && <span className={styles.connector} />}
              </div>

              <div className={styles.timelineText}>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepMeta}>{step.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- CTA ---------- */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => router.push(`/bookings/${BOOKING.id}`)}
          className={`${styles.ctaBtn} btn-primary`}
        >
          View Booking
        </button>
      </div>
    </div>
  );
}