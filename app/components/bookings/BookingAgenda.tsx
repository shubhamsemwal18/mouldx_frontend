"use client";

import { useMemo } from "react";
import Link from "next/link";
import { bookingMoney, formatBookingDate } from "@/app/lib/booking-dates";
import { bookingBasePath } from "@/app/lib/booking-routing";
import type { Booking, BookingView } from "@/app/lib/booking-types";
import styles from "./BookingAgenda.module.css";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-11-19T00:00:00.000Z" or Date -> "2026-11-19"
function toDayKey(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return toKey(new Date(value));
}

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Weeks start on Sunday, same as Google Calendar
function weekStartKey(key: string) {
  const d = parseKey(key);
  d.setDate(d.getDate() - d.getDay());
  return toKey(d);
}

function weekLabel(startKey: string, currentYear: number) {
  const start = parseKey(startKey);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const left = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  const right =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}`
      : `${MONTHS[end.getMonth()]} ${end.getDate()}`;
  const year = end.getFullYear() !== currentYear ? `, ${end.getFullYear()}` : "";
  return `${left} – ${right}${year}`;
}

function toneOf(booking: Booking, view: BookingView) {
  const phase =
    view !== "admin" && booking.status === "approved"
      ? booking.rentalPhase
      : undefined;
  return String(phase || booking.status);
}

type Week = { start: string; days: { key: string; items: Booking[] }[] };

export default function BookingAgenda({
  bookings,
  view,
  selectedDate = "",
  onSelectDate,
  onNavigate,
}: {
  bookings: Booking[];
  view: BookingView;
  /** Currently selected date filter ("YYYY-MM-DD"), highlighted in the list */
  selectedDate?: string;
  /** When given, the date column becomes a button that picks that date */
  onSelectDate?: (key: string) => void;
  /** Called when a booking card is opened */
  onNavigate?: () => void;
}) {
  const todayKey = toDayKey(new Date());
  const currentYear = new Date().getFullYear();

  const weeks = useMemo(() => {
    const byDay = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const key = toDayKey(booking.startDate);
      const list = byDay.get(key);
      if (list) list.push(booking);
      else byDay.set(key, [booking]);
    }
    if (!byDay.has(todayKey)) byDay.set(todayKey, []);
    if (selectedDate && !byDay.has(selectedDate)) byDay.set(selectedDate, []);
    const result: Week[] = [];
    [...byDay.keys()].sort().forEach((key) => {
      const start = weekStartKey(key);
      let week = result[result.length - 1];
      if (!week || week.start !== start) {
        week = { start, days: [] };
        result.push(week);
      }
      week.days.push({ key, items: byDay.get(key) ?? [] });
    });
    return result;
  }, [bookings, selectedDate, todayKey]);

  const base = bookingBasePath(view);

  return (
    <div className={styles.agenda} role="list" aria-label="Bookings calendar">
      {weeks.map((week) => (
        <section key={week.start} className={styles.week}>
          <p className={styles.weekLabel}>{weekLabel(week.start, currentYear)}</p>
          {week.days.map(({ key, items }) => {
            const d = parseKey(key);
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const head = (
              <>
                <span className={styles.weekday}>{WEEKDAYS[d.getDay()]}</span>
                <span className={styles.dayNum}>{d.getDate()}</span>
              </>
            );
            return (
              <div
                key={key}
                role="listitem"
                className={`${styles.dayRow} ${isToday ? styles.today : ""} ${isSelected ? styles.selected : ""}`}
              >
                {onSelectDate ? (
                  <button
                    type="button"
                    className={`${styles.dayHead} ${styles.dayHeadButton}`}
                    onClick={() => onSelectDate(key)}
                    aria-pressed={isSelected}
                    aria-label={`Show bookings on ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`}
                  >
                    {head}
                  </button>
                ) : (
                  <div className={styles.dayHead}>{head}</div>
                )}
                <div className={styles.dayBody}>
                  {items.length === 0 && (
                    <p className={styles.noBookings}>No bookings</p>
                  )}
                  {items.map((booking) => {
                    const tone = toneOf(booking, view);
                    const label = tone.charAt(0).toUpperCase() + tone.slice(1);
                    const days = booking.pricing.days;
                    return (
                      <Link
                        key={booking._id}
                        href={`${base}/${encodeURIComponent(booking._id)}`}
                        onClick={onNavigate}
                        className={`${styles.card} ${styles[`tone_${tone}`] || ""}`}
                      >
                        <span className={styles.cardMain}>
                          <strong className={styles.cardTitle}>
                            {booking.snapshot.product.name}
                          </strong>
                          <span className={styles.cardMeta}>
                            {formatBookingDate(booking.startDate)} to{" "}
                            {formatBookingDate(booking.endDate)} · {days}{" "}
                            {days === 1 ? "day" : "days"}
                          </span>
                          {view === "admin" && (
                            <span className={styles.cardMeta}>
                              {booking.snapshot.customer?.fullName ||
                                "Customer"}{" "}
                              → {booking.snapshot.host?.fullName || "Host"}
                            </span>
                          )}
                        </span>
                        <span className={styles.cardSide}>
                          <span className={styles.cardAmount}>
                            {bookingMoney(booking.pricing.total)}
                          </span>
                          <span className={styles.cardStatus}>{label}</span>
                        </span>
                      </Link>
                    );
                  })}
                  {isToday && <div className={styles.nowLine} aria-hidden />}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}