"use client";
import { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { hostApi, type DashboardBooking } from "@/app/lib/host-api";
import { useAuth } from "@/app/lib/auth-context";
import { bookingMoney, formatBookingDate } from "@/app/lib/booking-dates";
import { useBookingQuery } from "../bookings/useBookingQuery";
import { useRentalDayRefresh } from "../bookings/useRentalDayRefresh";
import { RatingSummary } from "../reviews/ReviewElements";
import styles from "./OwnerHome.module.css";

function BookingCard({ booking, ending }: { booking: DashboardBooking; ending?: boolean }) {
  return <Link href={`/owner/bookings/${booking._id}`} className={styles.itemCard}>
    <div className={styles.itemTop}><div className={styles.itemImageWrap}>
      {booking.product.imageUrl ? <Image src={booking.product.imageUrl} alt={booking.product.name} fill sizes="100px" className={styles.itemImage} /> : <span className={styles.itemPlaceholder} aria-hidden>▦</span>}
    </div><div className={styles.itemInfo}><h3 className={styles.itemName}>{booking.product.name}</h3><p className={styles.itemLine}>{booking.product.code} · {booking.code}</p>
      <span className={`${styles.itemTag} ${ending ? styles.itemTagReturn : styles.itemTagPickup}`}>{ending ? "Return" : "Pickup"}</span></div></div>
    <hr className={styles.divider} /><p className={styles.itemBooking}>{ending ? "Ending" : "Starts"} {formatBookingDate(ending ? booking.endDate : booking.startDate)}</p>
  </Link>;
}
export default function OwnerHome() {
  const { user } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => hostApi.dashboard(signal), []);
  const query = useBookingQuery(user?._id || "host", fetcher, Boolean(user));
  useRentalDayRefresh(query.reload);
  const data = query.data;
  return <div className={styles.page}><div className={styles.content}>
    <div className={styles.sectionHeader}><p className={styles.subtitle}>Your MouldX business at a glance.</p><button className={styles.refresh} aria-label="Refresh dashboard" onClick={query.reload} disabled={query.loading}><RefreshCw size={18} /></button></div>
    {query.loading && <p className={styles.empty} role="status">Loading dashboard…</p>}
    {query.error && <div className={styles.error} role="alert"><p>{query.error.message}</p><button className={styles.refresh} onClick={query.reload}>Try again</button></div>}
    {data && <>
      <div className={styles.earningsCard}><span className={styles.earningsPill}>TOTAL EARNINGS</span><p className={styles.earningsValue}>{bookingMoney(data.earnings.total)}</p></div>
      <div className={styles.quickActions}><Link href="/owner/moulds/new/product" className={styles.quickAction}><span className={styles.quickActionIcon} aria-hidden>＋</span><span className={styles.quickActionLabel}>List a Mould</span></Link></div>
      <section className={styles.card}><div className={styles.utilizationHeader}><h2 className={styles.cardTitle}>Mould Utilization</h2><span className={styles.utilizationPercent}>{data.utilization.percentage}%</span></div>
        <div className={styles.progressTrack} role="progressbar" aria-label="Mould utilization" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.utilization.percentage}><div className={styles.progressFill} style={{ width: `${data.utilization.percentage}%` }} /></div>
        <div className={styles.statsGrid}>{([
          ["Total Moulds", "total", "approved", ""], ["Available", "available", "available", "statValueGreen"],
          ["Rented", "rented", "rented", "statValueAmber"], ["Maintenance", "maintenance", "maintenance", "statValueRed"],
        ] as const).map(([label, key, status, color]) => <Link key={key} href={`/owner/moulds?status=${status}`} className={styles.statChip}><strong className={`${styles.statValue} ${color ? styles[color] : ""}`}>{String(data.utilization[key]).padStart(2, "0")}</strong><span className={styles.statLabel}>{label}</span></Link>)}</div>
      </section>
      <Link href="/owner/reviews" className={styles.ratingLink}><RatingSummary summary={data.rating} label="Your product rating →" /></Link>
      <div className={styles.sectionHeader}><h2 className={styles.actionTitle}>Ending Soon</h2><Link href="/owner/bookings?tab=active" className={styles.sectionLink}>View all →</Link></div>
      <div className={styles.itemList}>{data.endingSoon.map((booking) => <BookingCard key={booking._id} booking={booking} ending />)}{!data.endingSoon.length && <p className={styles.empty}>No active rentals ending in the next 3 days.</p>}</div>
      <div className={styles.sectionHeader}><h2 className={styles.actionTitle}>Upcoming</h2><Link href="/owner/bookings?tab=upcoming" className={styles.sectionLink}>View all →</Link></div>
      <div className={styles.itemList}>{data.upcoming.map((booking) => <BookingCard key={booking._id} booking={booking} />)}{!data.upcoming.length && <p className={styles.empty}>No upcoming confirmed bookings.</p>}</div>
    </>}
  </div></div>;
}
