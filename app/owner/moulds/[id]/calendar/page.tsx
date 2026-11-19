"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./AvailabilityCalendar.module.css";
import { productApi } from "@/app/lib/product-api";
import type { Product } from "@/app/lib/types";
import { getListingDisplayStatus } from "../../listing-status";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DayCell {
  date: Date;
  day: number;
  inCurrentMonth: boolean;
}

// TEMP dummy data — will come from the real bookings API (customer-confirmed bookings, read-only)
// Days already booked by customers — owner cannot toggle these
const BOOKED_DAYS = new Set([7, 8, 9, 10, 11, 12]);

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function AvailabilityCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // Listing is loaded first so the page can be blocked for non-live listings.
  const [listing, setListing] = useState<Product | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // NOTE: adjust this call to match your productApi (get / getById / details).
        const response = await productApi.get(id);
        const product: Product = response.product;
        if (cancelled) return;

        if (getListingDisplayStatus(product) !== "live") {
          router.replace(`/owner/moulds/${id}`);
          return;
        }

        setListing(product);
        setChecking(false);
      } catch {
        if (!cancelled) router.replace("/owner/moulds");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const mouldCode = listing?.code ?? "—";

  const initialMonth = 8; // September (0-indexed)
  const initialYear = 2026;

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Owner-selected/blocked days (blue) — toggled by tapping, pre-seeded to match reference
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set([14, 15, 16, 17, 18, 19, 20, 21].map((d) => `${initialYear}-${initialMonth}-${d}`))
  );

  const [submitting, setSubmitting] = useState(false);

  const cells = useMemo<DayCell[]>(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leading = firstOfMonth.getDay();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const list: DayCell[] = [];

    for (let i = leading - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      list.push({ date: new Date(viewYear, viewMonth - 1, day), day, inCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      list.push({ date: new Date(viewYear, viewMonth, day), day, inCurrentMonth: true });
    }

    const trailing = (7 - (list.length % 7)) % 7;
    for (let day = 1; day <= trailing; day++) {
      list.push({ date: new Date(viewYear, viewMonth + 1, day), day, inCurrentMonth: false });
    }

    return list;
  }, [viewYear, viewMonth]);

  const toggleDay = (cell: DayCell) => {
    if (!cell.inCurrentMonth) return;
    if (BOOKED_DAYS.has(cell.day)) return; // can't toggle customer-booked days

    setSelectedDays((prev) => {
      const next = new Set(prev);
      const key = dateKey(cell.date);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSave = () => {
    if (submitting) return;
    setSubmitting(true);
    // TODO: call save-availability API with { mouldId: id, blockedDates: Array.from(selectedDays) }
    router.push(`/owner/moulds/${id}/edit`);
  };

  // Render nothing until we know the listing is live (avoids a flash of the calendar).
  if (checking || !listing) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* ---------- Header row with back button ---------- */}
        <div className={styles.titleRow}>
          <Link href="/owner/moulds" className={styles.backBtn} aria-label="Go back">
            ‹
          </Link>
          <h1 className={styles.title}>Availability</h1>
        </div>
        <p className={styles.subtitle}>Manage availability for {mouldCode}.</p>

        {/* ---------- Calendar card ---------- */}
        <div className={styles.card}>
          <div className={styles.calendarHeader}>
            <div className={styles.monthNav}>
              <button
                type="button"
                onClick={goToPrevMonth}
                className={styles.monthNavBtn}
                aria-label="Previous month"
              >
                ‹
              </button>
              <p className={styles.monthLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </p>
              <button
                type="button"
                onClick={goToNextMonth}
                className={styles.monthNavBtn}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <span className={styles.codePill}>{mouldCode}</span>
          </div>

          <div className={styles.weekdaysRow}>
            {WEEKDAYS.map((w, i) => (
              <span key={`${w}-${i}`} className={styles.weekdayLabel}>
                {w}
              </span>
            ))}
          </div>

          <div className={styles.daysGrid}>
            {cells.map((cell, index) => {
              const isBooked = cell.inCurrentMonth && BOOKED_DAYS.has(cell.day);
              const isSelected = cell.inCurrentMonth && selectedDays.has(dateKey(cell.date));

              const statusClass = !cell.inCurrentMonth
                ? styles.dayMuted
                : isSelected
                ? styles.daySelected
                : isBooked
                ? styles.dayBooked
                : styles.dayFree;

              return (
                <button
                  key={`${cell.date.toISOString()}-${index}`}
                  type="button"
                  onClick={() => toggleDay(cell)}
                  disabled={!cell.inCurrentMonth || isBooked}
                  className={`${styles.dayCell} ${statusClass}`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- Legend ---------- */}
        <div className={styles.legendCard}>
          <span className={`${styles.legendPill} ${styles.legendFree}`}>FREE</span>
          <span className={`${styles.legendPill} ${styles.legendBooked}`}>BOOKED</span>
          <span className={`${styles.legendPill} ${styles.legendSelected}`}>SELECTED</span>
        </div>
      </div>

      {/* ---------- Sticky save ---------- */}
      <div className={styles.ctaBar}>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className={`${styles.ctaBtn} btn-primary`}
        >
          {submitting ? "Saving…" : "Save Availability"}
        </button>
      </div>
    </div>
  );
}