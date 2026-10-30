"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Layers, Package, RefreshCw, Search, XCircle } from "lucide-react";
import { bookingMoney, formatBookingDate } from "@/app/lib/booking-dates";
import { bookingBasePath } from "@/app/lib/booking-routing";
import type { Booking, BookingFilter, BookingView } from "@/app/lib/booking-types";
import { useAuth } from "@/app/lib/auth-context";
import { useInfiniteBookings } from "./useInfiniteBookings";
import { useRentalDayRefresh } from "./useRentalDayRefresh";
import { BookingBadge, BookingProductImage, paymentMethodLabel } from "./BookingVisuals";
import styles from "./Bookings.module.css";

const FILTERS = [
  { key: "total", label: "All bookings", icon: Layers },
  { key: "pending", label: "Pending", icon: Clock3 },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: XCircle },
] as const;
const COMPLETED_FILTER = { key: "completed", label: "Completed", icon: CheckCircle2 } as const;
const HOST_FILTERS = [
  { key: "upcoming", label: "Upcoming", icon: CalendarDays },
  { key: "active", label: "Active", icon: Clock3 },
  COMPLETED_FILTER,
] as const;

function BookingCard({ booking, view }: { booking: Booking; view: BookingView }) {
  return <Link href={`${bookingBasePath(view)}/${encodeURIComponent(booking._id)}`} className={styles.bookingCard}>
    <div className={styles.bookingCardTop}>
      <BookingProductImage src={booking.snapshot.product.images?.[0]?.url} name={booking.snapshot.product.name} />
      <div className={styles.bookingCardInfo}>
        <p className={styles.eyebrow}>{booking.code}</p>
        <h2>{booking.snapshot.product.name}</h2>
        <p className={styles.productCode}>{booking.snapshot.product.code}</p>
        <BookingBadge status={booking.status} phase={view !== "admin" ? booking.rentalPhase : undefined} />
      </div>
    </div>
    <div className={styles.cardDates}><CalendarDays size={16} /><span>{formatBookingDate(booking.startDate)} to {formatBookingDate(booking.endDate)}</span><span className={styles.duration}>{booking.pricing.days} {booking.pricing.days === 1 ? "day" : "days"}</span></div>
    {view === "admin" && <p className={styles.adminParties}>{booking.snapshot.customer?.fullName || "Customer"} <ArrowRight size={14} /> {booking.snapshot.host?.fullName || "Host"}</p>}
    <div className={styles.bookingCardBottom}><div><strong>{bookingMoney(booking.pricing.total)}</strong></div><span className={styles.cardAction}>{view === "admin" ? "Review" : "View booking"}<ArrowRight size={16} /></span></div>
  </Link>;
}

export default function BookingList({ view }: { view: BookingView }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BookingFilter>(() => {
    const tab = searchParams.get("tab");
    const allowed = view === "host" ? ["upcoming", "active", "completed"] : ["pending", "approved", "rejected", "completed"];
    return tab && allowed.includes(tab) ? tab as BookingFilter : view === "host" ? "upcoming" : "";
  });
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const query = useInfiniteBookings(view, search, status, user?._id);
  useRentalDayRefresh(query.reload);
  const { hasMore, loading, error, loadMore } = query;
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore || loading || error) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { rootMargin: "0px 0px 240px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, error, loadMore]);
  const data = query.data;
  const stats = query.stats;
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setSearch(searchInput.trim()); };
  const base = bookingBasePath(view);
  const isAdmin = view === "admin";
  const filters = view === "host" ? HOST_FILTERS : isAdmin ? FILTERS : [...FILTERS, COMPLETED_FILTER];
  const resetFilters = () => { setStatus(view === "host" ? "upcoming" : ""); setSearchInput(""); setSearch(""); };

  return <div className={`${styles.page} ${isAdmin ? styles.adminPage : styles.participantPage}`}>
    <div className={styles.heading}>
      <div>
      <h1>{isAdmin ? "Booking approvals" : view === "host" ? "Host bookings" : "My bookings"}</h1>
      </div>
      <div className={styles.headerActions}>{isAdmin && stats && <span className={`${styles.badge} ${styles.pending}`}>{stats.pending} pending</span>}<button onClick={query.reload} disabled={query.loading} className={styles.iconButton} aria-label="Refresh bookings" title="Refresh bookings"><RefreshCw size={18} /></button></div>
    </div>
    <div className={`${styles.statFilters} ${view === "host" ? styles.hostStatFilters : !isAdmin ? styles.customerStatFilters : ""}`} role="group" aria-label="Filter bookings by status">
      {filters.map(({ key, label, icon: Icon }) => {
        const active = key === "total" ? status === "" : status === key;
        return <button key={key} type="button" className={`${styles.statFilter} ${styles[`stat_${key}`] || ""} ${active ? styles.statFilterActive : ""}`} aria-label={key === "total" ? "All bookings" : `${label} bookings`} aria-pressed={active} onClick={() => setStatus(key === "total" ? "" : key)}>
          <span className={styles.statIcon}><Icon size={18} /></span><strong>{stats?.[key] ?? "-"}</strong><span>{label}</span>
        </button>;
      })}
    </div>
    <form className={styles.searchBar} onSubmit={submitSearch} role="search"><Search size={18} aria-hidden="true" /><input aria-label="Search bookings" placeholder={isAdmin ? "Search booking, product, customer or host" : "Search booking or product"} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={100} /><button className={styles.iconButton} type="submit" aria-label="Search" title="Search"><ArrowRight size={18} /></button></form>
    <div className={styles.resultsHeading}><h2>{status ? `${status[0].toUpperCase()}${status.slice(1)} bookings` : "All bookings"}</h2><span className={styles.note} aria-live="polite">{data ? `${data.pagination.total} ${data.pagination.total === 1 ? "booking" : "bookings"}` : "Updating..."}</span></div>
    {query.loading && !data && <div className={styles.state} role="status"><RefreshCw size={22} /><p>Loading bookings...</p></div>}
    {query.error && !data && <div className={styles.error} role="alert">{query.error.message} <button onClick={query.retry}>Try again</button></div>}
    {data && data.bookings.length === 0 && <div className={styles.emptyState}><Package size={36} strokeWidth={1.5} /><h2>No bookings found</h2><p>{view === "host" && !search ? "Confirmed bookings will appear here after admin approval." : search || status ? "Try another status or search." : "Your booking requests will appear here."}</p>{(search || status) && <button className={styles.button} onClick={resetFilters}>Clear filters</button>}{view === "customer" && <Link className={`${styles.button} ${styles.primary}`} href="/explore">Explore products<ArrowRight size={16} /></Link>}</div>}
    {data && data.bookings.length > 0 && <>
      {isAdmin && <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Booking / product</th><th>Customer / host</th><th>Rental dates</th><th>Amount / payment</th><th>Status</th><th></th></tr></thead><tbody>{data.bookings.map((booking) => <tr key={booking._id}>
        <td><Link href={`${base}/${booking._id}`}>{booking.code}</Link><span className={styles.tableProduct}>{booking.snapshot.product.name}</span><span className={styles.note}>{booking.snapshot.product.code}</span></td>
        <td><strong>{booking.snapshot.customer?.fullName || "Not provided"}</strong><span>{booking.snapshot.host?.fullName || "Not provided"}</span></td>
        <td>{formatBookingDate(booking.startDate)}<span>to {formatBookingDate(booking.endDate)}</span><span className={styles.note}>{booking.pricing.days} days</span></td>
        <td><strong>{bookingMoney(booking.pricing.total)}</strong><span>{paymentMethodLabel[booking.payment.method]}</span><span className={styles.note}>{booking.payment.status === "reported" ? "Payment reported" : "Unpaid"}</span></td>
        <td><BookingBadge status={booking.status} /></td><td><Link className={styles.reviewLink} href={`${base}/${booking._id}`}>Review<ArrowRight size={14} /></Link></td>
      </tr>)}</tbody></table></div>}
      <div className={isAdmin ? styles.adminMobileList : styles.bookingGrid}>{data.bookings.map((booking) => <BookingCard key={booking._id} booking={booking} view={view} />)}</div>
    </>}
    {data && data.bookings.length > 0 && <div ref={sentinel} className={styles.loadMore}>
      {query.error ? <div className={styles.error} role="alert"><p>{query.error.message}</p><button className={styles.button} onClick={query.retry}>Try again</button></div>
        : <p role="status" aria-live="polite">{query.loadingMore ? <><RefreshCw size={16} className={styles.spinner} />Loading more bookings...</> : `${data.bookings.length} of ${data.pagination.total} bookings`}</p>}
    </div>}
  </div>;
}
