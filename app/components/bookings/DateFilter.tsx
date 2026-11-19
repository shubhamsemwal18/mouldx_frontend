"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Bookings.module.css";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`;

function todayKey() {
  const n = new Date();
  return toKey(n.getFullYear(), n.getMonth(), n.getDate());
}

function parseKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { y, m: m - 1 };
}

// 6 weeks x 7 days, week Monday se start
function buildGrid(y: number, m: number) {
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(y, m, 1 - offset + i);
    return {
      key: toKey(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: d.getMonth() === m,
    };
  });
}

export default function DateFilter({
  value,
  onChange,
}: {
  value: string; // "YYYY-MM-DD" ya ""
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parseKey(value || todayKey()));
  const wrap = useRef<HTMLDivElement>(null);
  const today = todayKey();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) setView(parseKey(value || todayKey()));
    setOpen((o) => !o);
  };

  const shift = (delta: number) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const pick = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  const cells = buildGrid(view.y, view.m);

  return (
    <div className={styles.dateWrap} ref={wrap}>
      <button
        type="button"
        className={`${styles.dateButton} ${value ? styles.dateButtonActive : ""}`}
        onClick={toggle}
        aria-label="Open calendar"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={20} aria-hidden />
        <span className={styles.dateButtonText}>Calendar</span>
      </button>

      {open && (
        <>
          <div
            className={styles.calBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={styles.calPopover}
            role="dialog"
            aria-label="Choose a date"
          >
            <div className={styles.calHeader}>
              <strong className={styles.calTitle}>
                {MONTHS[view.m]} {view.y}
              </strong>
              <div className={styles.calNav}>
                <button
                  type="button"
                  className={styles.calNavButton}
                  onClick={() => shift(-1)}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className={styles.calNavButton}
                  onClick={() => shift(1)}
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className={styles.calWeekdays} aria-hidden>
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className={styles.calGrid} role="grid">
              {cells.map(({ key, day, inMonth }) => (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-label={key}
                  aria-pressed={key === value}
                  className={[
                    styles.calDay,
                    !inMonth ? styles.calDayOut : "",
                    key === today ? styles.calDayToday : "",
                    key === value ? styles.calDaySelected : "",
                  ].join(" ")}
                  onClick={() => pick(key)}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className={styles.calFooter}>
              <button
                type="button"
                className={styles.calLink}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className={styles.calLink}
                onClick={() => pick(today)}
              >
                Today
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}