"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, RefreshCw } from "lucide-react";
import { bookingApi, bookingError } from "@/app/lib/booking-api";
import { publicApi } from "@/app/lib/public-api";
import { addDays, bookingMoney, dateOnly, formatBookingDate, rangeError, rentalDays } from "@/app/lib/booking-dates";
import { useBookingQuery } from "./useBookingQuery";
import styles from "@/app/explore/[id]/dates/SelectDates.module.css";
import shared from "./Bookings.module.css";

export default function SelectBookingDates({ slug }: { slug: string }) {
  const fetchProduct = useCallback(async (signal: AbortSignal) => {
    const detail = await publicApi.getProduct(slug);
    await bookingApi.paymentOptions(detail.product._id, signal);
    return detail;
  }, [slug]);
  const query = useBookingQuery(slug, fetchProduct);
  if (query.loading) return <div className={shared.state} role="status">Loading product...</div>;
  if (!query.data) return <div className={shared.state}><p role="alert">{query.error?.message}</p><button onClick={query.reload}>Try again</button><Link href="/explore">Back to Explore</Link></div>;
  return <Calendar key={query.data.product._id} productId={query.data.product._id} slug={slug} />;
}

function Calendar({ productId, slug }: { productId: string; slug: string }) {
  const router = useRouter();
  const [month, setMonth] = useState(() => `${new Date(Date.now() + 19800000).toISOString().slice(0, 7)}-01`);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<ReturnType<typeof bookingError> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);
  const monthDate = new Date(`${month}T00:00:00Z`);
  const monthEnd = dateOnly(new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)));
  // Cover the entire selection, including off-screen months, in every availability request.
  const from = start && start < month ? start : month;
  const to = String(end && end > monthEnd ? end : start && start > monthEnd ? start : monthEnd);
  const fetchAvailability = useCallback((signal: AbortSignal) => bookingApi.availabilityRange(productId, from, to, signal), [productId, from, to]);
  const query = useBookingQuery(`${productId}:${from}:${to}`, fetchAvailability);
  const data = query.data;
  const days = rentalDays(start, end);
  const selectionError = data && start && end ? rangeError(start, end, data.today, data.blockedRanges) : null;
  const canContinue = Boolean(data && days && !selectionError && !submitting && !query.loading && !query.error && !error?.bookingId);
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthDate);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(month, index - monthDate.getUTCDay()));

  const changeMonth = (offset: number) => {
    setMonth(dateOnly(new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + offset, 1))));
    setError((current) => current?.bookingId ? current : null);
  };
  const clearDates = () => {
    setStart(""); setEnd(""); setError(null);
    calendarRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const selectDate = (date: string) => {
    if (!data || submitting) return;
    setError(null);
    if (!start || end) { setStart(date); setEnd(""); return; }
    const [nextStart, nextEnd] = [start, date].sort();
    const invalid = rangeError(nextStart, nextEnd, data.today, data.blockedRanges);
    if (invalid) { setError({ message: invalid }); return; }
    setStart(nextStart);
    setEnd(nextEnd);
  };
  const continueBooking = async () => {
    if (!canContinue || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const check = await bookingApi.checkRequest(productId, start, end);
      if (!check.canProceed) {
        setError({ message: check.message, ...check.pendingRequest });
        if (!check.pendingRequest) query.reload();
        return;
      }
      router.push(`/explore/${encodeURIComponent(slug)}/confirm?${new URLSearchParams({ startDate: start, endDate: end })}`);
    } catch (err) { setError(bookingError(err)); }
    finally { setSubmitting(false); inFlight.current = false; }
  };

  return <div className={styles.page}>
    <div className={styles.content}>
      {/* <Link className={shared.back} href={`/explore/${encodeURIComponent(slug)}`}><ArrowLeft size={16} /> Product</Link> */}
      <h1 className={styles.pageTitle}>Select rental dates</h1>
      {data && <p className={styles.pageSubtitle}>{data.product.code} · {data.product.name}</p>}
      {error?.bookingId && <div ref={errorRef} className={styles.pendingNotice} role="alert">
        <div className={styles.pendingHeading}><span className={styles.pendingIcon}><Clock3 size={21} aria-hidden="true" /></span><div><h2>You already have a pending request</h2><p>{formatBookingDate(start)} to {formatBookingDate(end)}</p></div></div>
        <p>A request is already pending for this product and these dates.</p>
        <p className={styles.pendingReference}>Booking {error.bookingCode}</p>
        <div className={styles.pendingActions}>
          <Link href={`/bookings/${encodeURIComponent(error.bookingId)}`}>View existing booking {error.bookingCode}<ArrowRight size={16} aria-hidden="true" /></Link>
          <button type="button" onClick={clearDates}><CalendarDays size={16} aria-hidden="true" />Choose different dates</button>
        </div>
      </div>}
      <div ref={calendarRef} className={styles.calendarCard} aria-busy={query.loading}>
        <div className={styles.calendarHeader}>
          <div className={styles.monthNav}>
            <button type="button" disabled={submitting || !data || month <= `${data.today.slice(0, 7)}-01`} onClick={() => changeMonth(-1)} className={styles.monthNavBtn} aria-label="Previous month" title="Previous month"><ChevronLeft size={18} /></button>
            <h2 className={styles.monthLabel}>{monthLabel}</h2>
            <button type="button" disabled={submitting || !data || monthEnd >= addDays(data.today, 730)} onClick={() => changeMonth(1)} className={styles.monthNavBtn} aria-label="Next month" title="Next month"><ChevronRight size={18} /></button>
          </div>
          <span className={styles.pickDatesPill}>{query.loading ? "Loading availability" : !start || end ? "Pickup date" : "Return date"}</span>
        </div>
        <div className={styles.weekdaysRow}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className={styles.weekdayLabel}>{day}</span>)}</div>
        <div className={styles.daysGrid}>
          {cells.map((date) => {
            const muted = date.slice(0, 7) !== month.slice(0, 7);
            const past = Boolean(data && (date < data.today || date > addDays(data.today, 730)));
            const blocked = Boolean(data?.blockedRanges.some((range) => date >= range.startDate.slice(0, 10) && date <= range.endDate.slice(0, 10)));
            const selected = date === start || date === end || Boolean(start && end && date > start && date < end);
            const className = muted ? styles.dayMuted : past ? styles.dayPast : blocked ? styles.dayBooked : date === start && (!end || end === start) ? styles.daySingle : date === start ? styles.dayStart : date === end ? styles.dayEnd : selected ? styles.dayInRange : styles.dayFree;
            return <button key={date} type="button" disabled={!data || muted || past || blocked || submitting} className={`${styles.dayCell} ${className}`} aria-label={`${formatBookingDate(date)}${blocked ? ", unavailable" : past ? ", past" : ""}`} aria-pressed={selected} onClick={() => selectDate(date)}><span className={styles.dayNumber}>{Number(date.slice(-2))}</span></button>;
          })}
        </div>
        {start && <button className={styles.clearBtn} disabled={submitting} onClick={clearDates}>Clear dates</button>}
      </div>
      {query.error && <div className={styles.errorBanner} role="alert">{query.error.message} <button onClick={query.reload}>Try again</button></div>}
      {!error?.bookingId && (error || selectionError) && <div ref={errorRef} className={styles.errorBanner} role="alert"><p>{error?.message || selectionError}</p>{error && !selectionError && <button type="button" className={styles.retryCheck} disabled={!canContinue} onClick={continueBooking}><RefreshCw size={16} aria-hidden="true" />Try again</button>}</div>}
      <div className={styles.legendCard}>
        <span className={`${styles.legendPill} ${styles.legendFree}`}>Available</span>
        <span className={`${styles.legendPill} ${styles.legendBooked}`}>Booked</span>
        <span className={`${styles.legendPill} ${styles.legendSelected}`}>Selected</span>
      </div>
      {/* <p className={shared.note}>Rental days include pickup and return. Approved bookings reserve an additional 3 days before and after. Pending requests do not reserve dates.</p> */}
      {start && <div className={styles.summaryCard} aria-live="polite"><span>{formatBookingDate(start)}{end && ` To ${formatBookingDate(end)}`}</span>{days > 0 && <strong>{days} {days === 1 ? "day" : "days"}</strong>}</div>}
    </div>
    <div className={styles.ctaBar}>
      {data && days > 0 && <div className={styles.ctaPriceRow}><span className={styles.ctaPriceLabel}>{bookingMoney(data.product.pricing.perDayCharges)} x {days} days</span><strong className={styles.ctaPriceValue}>{bookingMoney(data.product.pricing.perDayCharges * days)}</strong></div>}
      <button type="button" disabled={!canContinue} onClick={continueBooking} className={`${styles.ctaBtn} ${canContinue ? "btn-primary" : styles.ctaBtnDisabled}`}>{submitting ? "Checking your dates..." : "Continue"}<ArrowRight size={18} /></button>
    </div>
  </div>;
}
