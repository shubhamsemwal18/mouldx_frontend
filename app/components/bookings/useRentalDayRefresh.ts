"use client";

import { useEffect, useRef } from "react";

const DAY_MS = 86_400_000;
const INDIA_OFFSET_MS = 19_800_000;
const rentalDay = () => Math.floor((Date.now() + INDIA_OFFSET_MS) / DAY_MS);

/** Refresh date-derived states at India midnight, including after a sleeping tab resumes. */
export function useRentalDayRefresh(reload: () => void, enabled = true) {
  const reloadRef = useRef(reload);
  useEffect(() => { reloadRef.current = reload; }, [reload]);
  useEffect(() => {
    if (!enabled) return;
    let day = rentalDay();
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const current = rentalDay();
      if (day !== current) { day = current; reloadRef.current(); }
    };
    const schedule = () => {
      timer = setTimeout(() => {
        check(); schedule();
      }, DAY_MS - ((Date.now() + INDIA_OFFSET_MS) % DAY_MS) + 100);
    };
    schedule();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [enabled]);
}
