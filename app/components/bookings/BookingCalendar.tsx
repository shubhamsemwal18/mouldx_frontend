"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import type { Booking, BookingView } from "@/app/lib/booking-types";
import BookingAgenda from "./BookingAgenda";
import styles from "./Bookings.module.css";
import calStyles from "./BookingCalendar.module.css";

/**
 * Calendar button for the booking list.
 * Same contract as the old date filter: `value` is "YYYY-MM-DD" (or ""),
 * `onChange` receives "YYYY-MM-DD" or "" to clear.
 * Clicking the button opens a Google Calendar style schedule.
 */
export default function BookingCalendar({
  value,
  onChange,
  bookings,
  view,
}: {
  value: string;
  onChange: (value: string) => void;
  bookings: Booking[];
  view: BookingView;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Tapping the selected date again clears the filter
  const selectDate = (key: string) => {
    onChange(key === value ? "" : key);
    setOpen(false);
  };

  return (
    <div className={styles.dateWrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.dateButton} ${value ? styles.dateButtonActive : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open calendar"
      >
        <CalendarDays size={18} aria-hidden />
        <span className={styles.dateButtonText}>Date</span>
      </button>
      {open && (
        <>
          <div
            className={styles.calBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={calStyles.popover}
            role="dialog"
            aria-label="Bookings calendar"
          >
            <div className={calStyles.header}>
              <p className={calStyles.title}>Calendar</p>
              <button
                type="button"
                className={calStyles.close}
                onClick={() => setOpen(false)}
                aria-label="Close calendar"
              >
                <X size={18} />
              </button>
            </div>
            <div className={calStyles.body}>
              <BookingAgenda
                bookings={bookings}
                view={view}
                selectedDate={value}
                onSelectDate={selectDate}
                onNavigate={() => setOpen(false)}
              />
            </div>
            <div className={calStyles.footer}>
              <label className={calStyles.dateLabel}>
                Go to date
                <input
                  type="date"
                  className={calStyles.dateInput}
                  value={value}
                  onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(false);
                  }}
                />
              </label>
              {value && (
                <button
                  type="button"
                  className={calStyles.clear}
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}