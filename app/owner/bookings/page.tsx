"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./OwnerBookings.module.css";

type TabKey = "all" | "upcoming" | "active" | "done";
type BookingStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "REQUESTED";

interface Booking {
  id: string;
  code: string;
  customer: string;
  dateRange: string;
  amount: number;
  status: BookingStatus;
  tab: Exclude<TabKey, "all">;
  image: string;
}

const PAGE_SIZE = 10;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "active", label: "Active" },
  { key: "done", label: "Done" },
];

// TEMP dummy data (24 records so pagination can be tested) — will be replaced by the real bookings API
const CUSTOMERS = [
  "Nova Plastics",
  "Vector Molds",
  "Apex Poly",
  "Orbit Plast",
  "Sharma Industries",
  "Delta Polymers",
];

const STATUS_CYCLE: { status: BookingStatus; tab: Exclude<TabKey, "all"> }[] = [
  { status: "UPCOMING", tab: "upcoming" },
  { status: "ACTIVE", tab: "active" },
  { status: "COMPLETED", tab: "done" },
  { status: "REQUESTED", tab: "upcoming" },
];

const BOOKINGS: Booking[] = Array.from({ length: 24 }, (_, i) => {
  const { status, tab } = STATUS_CYCLE[i % STATUS_CYCLE.length];
  const day = (i % 25) + 1;

  return {
    id: String(i + 1),
    code: `MX-${String(100 + i * 7).padStart(6, "0")}`,
    customer: CUSTOMERS[i % CUSTOMERS.length],
    dateRange: `${String(day).padStart(2, "0")}–${String(day + 4).padStart(2, "0")} Sep`,
    amount: 60000 + (i % 7) * 12000,
    status,
    tab,
    image: `https://picsum.photos/seed/owner-booking-${i + 1}/600/600`,
  };
});

const STATUS_CLASS: Record<BookingStatus, string> = {
  UPCOMING: "badgeUpcoming",
  ACTIVE: "badgeActive",
  COMPLETED: "badgeCompleted",
  REQUESTED: "badgeRequested",
};

function BookingImage({ src, alt }: { src: string; alt: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={styles.imageWrap}>
      {!imgError ? (
        <img
          src={src}
          alt={alt}
          className={styles.image}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={styles.placeholder} aria-hidden>
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

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Link href={`/owner/bookings/${booking.id}`} className={styles.card}>
      <div className={styles.cardTop}>
        <BookingImage src={booking.image} alt={`Mould ${booking.code}`} />

        <div className={styles.cardInfo}>
          <h3 className={styles.cardName}>{booking.customer}</h3>
          <p className={styles.cardLine}>
            <strong>Mould:</strong> {booking.code}
          </p>
          <p className={styles.cardLine}>
            <strong>Amount:</strong> ₹{booking.amount.toLocaleString("en-IN")}
          </p>
          <span className={`${styles.badge} ${styles[STATUS_CLASS[booking.status]]}`}>
            {booking.status}
          </span>
        </div>
      </div>

      <hr className={styles.divider} />

      <p className={styles.cardBooking}>
        <span aria-hidden>🗓</span> Booking: {booking.dateRange}
      </p>
    </Link>
  );
}

function OwnerBookingsContent() {
  // Reads ?tab=active from the URL so "View all" on Home opens the Active tab
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = TABS.some((t) => t.key === tabParam)
    ? (tabParam as TabKey)
    : "all";

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (activeTab === "all") return BOOKINGS;
    return BOOKINGS.filter((b) => b.tab === activeTab);
  }, [activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setPage(1);
  };

  const goToPage = (next: number) => {
    setPage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Bookings</h1>

        {/* ---------- Tabs ---------- */}
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---------- Booking list ---------- */}
        <div className={styles.list}>
          {pageItems.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}

          {filtered.length === 0 && <p className={styles.emptyText}>No bookings in this tab yet.</p>}
        </div>

        {/* ---------- Pagination (only when there is more than one page) ---------- */}
        {totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Bookings pagination">
            <p className={styles.paginationInfo}>
              Showing {startIndex + 1}–{startIndex + pageItems.length} of {filtered.length}
            </p>

            <div className={styles.paginationControls}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>

              <span className={styles.pageIndicator}>
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                className={`${styles.pageBtn} ${styles.pageBtnPrimary}`}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

// Suspense is required in Next.js when using useSearchParams
export default function OwnerBookingsPage() {
  return (
    <Suspense fallback={null}>
      <OwnerBookingsContent />
    </Suspense>
  );
}