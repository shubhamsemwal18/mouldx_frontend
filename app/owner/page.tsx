"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./OwnerHome.module.css";

const OWNER = {
  earningsMonth: "SEP",
  totalEarnings: 248500,
  vsLastMonth: 18.4,
  utilization: 72,
  totalMoulds: 8,
  available: 3,
  rented: 4,
  maintenance: 1,
  bookingRequests: [
    {
      id: "1",
      mouldCode: "MX-000123",
      mouldName: "Bottle Cap Mould",
      customerName: "Nova Plastics",
      date: "22–26 Sep",
      image: "https://picsum.photos/seed/owner-request-1/600/600",
    },
  ],
  // Counts per star (5 → 1). Average and percentages are calculated from this.
  ratingCounts: { 5: 27, 4: 4, 3: 1, 2: 0, 1: 0 } as Record<number, number>,
  upcoming: [
    {
      id: "u1",
      type: "Pickup",
      name: "Blow Mould — 5L Can",
      mouldCode: "MX-000198",
      customer: "Vector Molds",
      date: "18 Sep",
      image: "https://picsum.photos/seed/owner-upcoming-1/600/600",
    },
    {
      id: "u2",
      type: "Return",
      name: "Die-Cast Housing Mould",
      mouldCode: "MX-000077",
      customer: "Sharma Industries",
      date: "20 Sep",
      image: "https://picsum.photos/seed/owner-upcoming-2/600/600",
    },
  ],
};

interface UpcomingItem {
  id: string;
  type: string;
  name: string;
  mouldCode: string;
  customer: string;
  date: string;
  image: string;
}

interface RequestItem {
  id: string;
  mouldCode: string;
  mouldName: string;
  customerName: string;
  date: string;
  image: string;
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={styles.stars} style={{ fontSize: size }} aria-label={`${value.toFixed(1)} out of 5`}>
      <span className={styles.starsBase} aria-hidden>★★★★★</span>
      <span className={styles.starsFill} style={{ width: `${pct}%` }} aria-hidden>★★★★★</span>
    </span>
  );
}

/* Shared image block used by both cards */
function ItemImage({ src, alt }: { src: string; alt: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={styles.itemImageWrap}>
      {!imgError ? (
        <img
          src={src}
          alt={alt}
          className={styles.itemImage}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={styles.itemPlaceholder} aria-hidden>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
        </div>
      )}
    </div>
  );
}

function UpcomingCard({ item }: { item: UpcomingItem }) {
  return (
    <Link href={`/owner/bookings/${item.id}`} className={styles.itemCard}>
      <div className={styles.itemTop}>
        <ItemImage src={item.image} alt={item.name} />

        <div className={styles.itemInfo}>
          <h3 className={styles.itemName}>{item.name}</h3>
          <p className={styles.itemCompany}>{item.customer}</p>
          <p className={styles.itemLine}>
            <strong>Mould:</strong> {item.mouldCode}
          </p>
          <span
            className={`${styles.itemTag} ${
              item.type === "Pickup" ? styles.itemTagPickup : styles.itemTagReturn
            }`}
          >
            {item.type}
          </span>
        </div>
      </div>

      <hr className={styles.divider} />

      <p className={styles.itemBooking}>
        <span aria-hidden>🗓</span> {item.type}: {item.date}
      </p>
    </Link>
  );
}

function RequestCard({ req }: { req: RequestItem }) {
  return (
    <Link href={`/owner/bookings/${req.id}`} className={styles.itemCard}>
      <div className={styles.itemTop}>
        <ItemImage src={req.image} alt={req.mouldName} />

        <div className={styles.itemInfo}>
          <div className={styles.itemTitleRow}>
            <h3 className={styles.itemName}>New Booking Request</h3>
            <span className={styles.newPill}>NEW</span>
          </div>
          <p className={styles.itemCompany}>{req.customerName}</p>
          <p className={styles.itemLine}>
            <strong>Product:</strong> {req.mouldName}
          </p>
          <p className={styles.itemLine}>
            <strong>Mould:</strong> {req.mouldCode}
          </p>
        </div>
      </div>

      <hr className={styles.divider} />

      <p className={styles.itemBooking}>
        <span aria-hidden>🗓</span> Booking: {req.date}
      </p>
    </Link>
  );
}

export default function OwnerHomePage() {
  const counts = OWNER.ratingCounts;
  const reviewCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const ratingSum = Object.entries(counts).reduce((a, [star, c]) => a + Number(star) * c, 0);
  const rating = reviewCount ? ratingSum / reviewCount : 0;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <p className={styles.subtitle}>Your MouldX business at a glance.</p>

        <div className={styles.earningsCard}>
          <span className={styles.earningsPill}>TOTAL EARNINGS · {OWNER.earningsMonth}</span>
          <p className={styles.earningsValue}>₹{OWNER.totalEarnings.toLocaleString("en-IN")}</p>
          <p className={styles.earningsDelta}>↑ {OWNER.vsLastMonth}% vs last month</p>
        </div>

        <div className={styles.quickActions}>
          <Link href="/owner/moulds/new/product" className={styles.quickAction}>
            <span className={styles.quickActionIcon} aria-hidden>➕</span>
            <span className={styles.quickActionLabel}>List a Mould</span>
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.utilizationHeader}>
            <h2 className={styles.cardTitle}>Mould Utilization</h2>
            <span className={styles.utilizationPercent}>{OWNER.utilization}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${OWNER.utilization}%` }} />
          </div>

          {/* Each chip opens My Moulds (filtered by status) */}
          <div className={styles.statsGrid}>
            <Link href="/owner/moulds" className={styles.statChip}>
              <span className={styles.statValue}>{String(OWNER.totalMoulds).padStart(2, "0")}</span>
              <span className={styles.statLabel}>Total Moulds</span>
            </Link>

            <Link href="/owner/moulds?status=available" className={styles.statChip}>
              <span className={`${styles.statValue} ${styles.statValueGreen}`}>
                {String(OWNER.available).padStart(2, "0")}
              </span>
              <span className={styles.statLabel}>Available</span>
            </Link>

            <Link href="/owner/moulds?status=rented" className={styles.statChip}>
              <span className={`${styles.statValue} ${styles.statValueAmber}`}>
                {String(OWNER.rented).padStart(2, "0")}
              </span>
              <span className={styles.statLabel}>Rented</span>
            </Link>

            <Link href="/owner/moulds?status=maintenance" className={styles.statChip}>
              <span className={`${styles.statValue} ${styles.statValueRed}`}>
                {String(OWNER.maintenance).padStart(2, "0")}
              </span>
              <span className={styles.statLabel}>Maintenance</span>
            </Link>
          </div>
        </div>

        {/* Rating card — same design as the Your Ratings page summary */}
        <Link href="/owner/reviews" className={styles.ratingCard}>
          <div className={styles.ratingHeader}>
            <p className={styles.ratingLabel}>Your Rating</p>
            <span className={styles.ratingArrow} aria-hidden>→</span>
          </div>

          <div className={styles.ratingSummary}>
            <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
            <div>
              <Stars value={rating} size={16} />
              <p className={styles.ratingMeta}>Based on {reviewCount} reviews</p>
            </div>
          </div>

          <div className={styles.ratingBars}>
            {[5, 4, 3, 2, 1].map((star) => {
              const pct = reviewCount ? Math.round((counts[star] / reviewCount) * 100) : 0;
              return (
                <div key={star} className={styles.ratingBarRow}>
                  <span className={styles.ratingBarLabel}>{star} ★</span>
                  <div className={styles.ratingBarTrack}>
                    <div className={styles.ratingBarFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.ratingBarPercent}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </Link>

       <div className={styles.sectionHeader}>
  <h2 className={styles.actionTitle}>Ending Soon</h2>
  <Link href="/owner/bookings?tab=active" className={styles.sectionLink}>
    View all →
  </Link>
</div>

        <div className={styles.itemList}>
          {OWNER.bookingRequests.map((req) => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>

        <div className={styles.sectionHeader}>
  <h2 className={styles.actionTitle}>Upcoming</h2>
  <Link href="/owner/bookings?tab=upcoming" className={styles.sectionLink}>
    View all →
  </Link>
</div>

        <div className={styles.itemList}>
          {OWNER.upcoming.map((item) => (
            <UpcomingCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}