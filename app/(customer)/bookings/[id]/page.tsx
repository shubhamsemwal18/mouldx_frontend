"use client";

import { use } from "react";
import Link from "next/link";
import styles from "./BookingDetail.module.css";
import ActiveRentalPanel from "./ActiveRentalPanel";

interface TimelineStep {
  id: string;
  title: string;
  status: "done" | "pending" | "upcoming";
  meta: string;
}

interface BookingDetailRaw {
  id: string;
  code: string;
  name: string;
  image: string;
  city: string;
  dateRange: string;
  days: number;
  pricePerDay: number;
  securityDeposit: number;
  platformFee: number;
  paymentMethod: "Platform" | "Direct to Host";
  status: string;
  steps: TimelineStep[];
  returnDueAt?: string;
}

interface BookingDetail extends BookingDetailRaw {
  awaitingReceipt: boolean;
}

const DUMMY_BOOKINGS: Record<string, BookingDetailRaw> = {
  "BK-24581": {
    id: "BK-24581",
    code: "MX-000123",
    name: "2-Cavity Injection Mould",
    image: "https://picsum.photos/seed/mould1/800/600",
    city: "Pune",
    dateRange: "14 – 20 Sep",
    days: 7,
    pricePerDay: 1800,
    securityDeposit: 15000,
    platformFee: 0,
    paymentMethod: "Platform",
    status: "Approval Pending",
    steps: [
      { id: "payment", title: "Payment received", status: "done", meta: "Just now" },
      { id: "approval", title: "Host approval", status: "pending", meta: "Pending · ETA 6h" },
      { id: "dispatch", title: "Dispatch", status: "upcoming", meta: "Scheduled after approval" },
    ],
  },
  "BK-24512": {
    id: "BK-24512",
    code: "MX-000198",
    name: "Blow Mould — 5L Can",
    image: "https://picsum.photos/seed/mould2/800/600",
    city: "Nashik",
    dateRange: "22 – 28 Sep",
    days: 6,
    pricePerDay: 2400,
    securityDeposit: 18000,
    platformFee: 0,
    paymentMethod: "Platform",
    status: "Arrived",
    steps: [
      { id: "payment", title: "Payment received", status: "done", meta: "2 days ago" },
      { id: "approval", title: "Host approval", status: "done", meta: "Approved" },
      { id: "dispatch", title: "Dispatch", status: "done", meta: "Arrived at your location" },
    ],
  },
  "BK-24390": {
    id: "BK-24390",
    code: "MX-000077",
    name: "Die-Cast Housing Mould",
    image: "https://picsum.photos/seed/mould3/800/600",
    city: "Aurangabad",
    dateRange: "5 – 12 Sep",
    days: 7,
    pricePerDay: 2000,
    securityDeposit: 20000,
    platformFee: 0,
    paymentMethod: "Platform",
    status: "In Progress",
    returnDueAt: "2026-09-20T18:00:00",
    steps: [
      { id: "payment", title: "Payment received", status: "done", meta: "8 days ago" },
      { id: "approval", title: "Host approval", status: "done", meta: "Approved" },
      { id: "dispatch", title: "Dispatch", status: "done", meta: "Delivered" },
    ],
  },
  "BK-23988": {
    id: "BK-23988",
    code: "MX-000045",
    name: "Single Cavity Chair Mould",
    image: "https://picsum.photos/seed/mould4/800/600",
    city: "Pune",
    dateRange: "10 – 15 Aug",
    days: 5,
    pricePerDay: 1500,
    securityDeposit: 12000,
    platformFee: 0,
    paymentMethod: "Platform",
    status: "Completed",
    steps: [
      { id: "payment", title: "Payment received", status: "done", meta: "1 month ago" },
      { id: "approval", title: "Host approval", status: "done", meta: "Approved" },
      { id: "dispatch", title: "Dispatch", status: "done", meta: "Returned" },
    ],
  },
  "BK-23850": {
    id: "BK-23850",
    code: "MX-000210",
    name: "Blow Mould — Bottle 1L",
    image: "https://picsum.photos/seed/mould5/800/600",
    city: "Nashik",
    dateRange: "1 – 6 Aug",
    days: 5,
    pricePerDay: 1900,
    securityDeposit: 14000,
    platformFee: 0,
    paymentMethod: "Platform",
    status: "Cancelled",
    steps: [
      { id: "payment", title: "Payment received", status: "done", meta: "1 month ago" },
      { id: "approval", title: "Host approval", status: "pending", meta: "Cancelled by host" },
      { id: "dispatch", title: "Dispatch", status: "upcoming", meta: "—" },
    ],
  },
};

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const raw = DUMMY_BOOKINGS[id];

  if (!raw) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Booking not found.</p>
        <Link href="/bookings" className={styles.notFoundLink}>
          ← Back to My Bookings
        </Link>
      </div>
    );
  }

  const booking: BookingDetail = {
    ...raw,
    awaitingReceipt: raw.status === "Arrived",
  };

  const isActiveRental = raw.status === "In Progress" && Boolean(raw.returnDueAt);

  const rent = booking.pricePerDay * booking.days;
  const total = rent + booking.securityDeposit + booking.platformFee;

  return (
    <div className={`${styles.page} ${booking.awaitingReceipt ? styles.pageWithCta : ""}`}>
      <div className={styles.content}>
        {isActiveRental && raw.returnDueAt && (
          <ActiveRentalPanel
            bookingId={booking.id}
            mouldName={booking.name}
            mouldCode={booking.code}
            returnDueAt={raw.returnDueAt}
          />
        )}

        {booking.awaitingReceipt && (
          <div className={styles.receiptBanner}>
            <span className={styles.receiptIcon} aria-hidden>📦</span>
            <div>
              <p className={styles.receiptTitle}>Mould has arrived</p>
              <p className={styles.receiptSubtitle}>
                Confirm receipt by uploading a photo — this starts your rental timer.
              </p>
            </div>
          </div>
        )}

        <div className={styles.mouldCard}>
          <div className={styles.mouldImageWrap}>
            <img src={booking.image} alt={booking.name} className={styles.mouldImage} />
            <span
              className={`${styles.statusBadge} ${styles.statusOnImage} ${
                isActiveRental ? styles.statusBadgeActive : ""
              }`}
            >
              {booking.status}
            </span>
          </div>

          <div className={styles.mouldBody}>
            <p className={styles.mouldName}>{booking.name}</p>
            <p className={styles.mouldMeta}>
              {booking.code} · {booking.city}
            </p>
            <p className={styles.mouldMeta}>
              {booking.dateRange} · {booking.days} days
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Booking Status</h2>
          {booking.steps.map((step, i) => (
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
                {i < booking.steps.length - 1 && <span className={styles.connector} />}
              </div>
              <div className={styles.timelineText}>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepMeta}>{step.meta}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Fare Breakdown</h2>

          <div className={styles.fareRow}>
            <span className={styles.fareLabel}>
              Rent ({booking.days} × ₹{booking.pricePerDay.toLocaleString("en-IN")})
            </span>
            <span className={styles.fareValue}>₹{rent.toLocaleString("en-IN")}</span>
          </div>

          <div className={styles.fareRow}>
            <span className={styles.fareLabel}>Security deposit</span>
            <span className={styles.fareValue}>
              ₹{booking.securityDeposit.toLocaleString("en-IN")}
            </span>
          </div>

          <div className={styles.fareRow}>
            <span className={styles.fareLabel}>Platform fee</span>
            <span className={styles.fareValue}>₹{booking.platformFee.toLocaleString("en-IN")}</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.fareRow}>
            <span className={styles.totalLabel}>Total paid</span>
            <span className={styles.totalValue}>₹{total.toLocaleString("en-IN")}</span>
          </div>

          <p className={styles.paymentMethodText}>Paid via {booking.paymentMethod}</p>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Need help?</h2>
          <div className={styles.supportRow}>
            <Link href="/inbox" className={`${styles.supportBtn} btn-primary`}>
              Message Host
            </Link>
            <button type="button" className={styles.supportBtnOutline}>
              Raise an Issue
            </button>
          </div>
        </div>
      </div>

      {booking.awaitingReceipt && (
        <div className={styles.ctaBar}>
          <Link href={`/bookings/${booking.id}/receive`} className={`${styles.ctaBtn} btn-primary`}>
            Confirm Receipt →
          </Link>
        </div>
      )}
    </div>
  );
}