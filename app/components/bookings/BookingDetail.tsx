"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, CreditCard, RefreshCw, ShieldCheck, X, XCircle } from "lucide-react";
import { bookingApi, bookingError } from "@/app/lib/booking-api";
import { bookingMoney, formatBookingDate } from "@/app/lib/booking-dates";
import { bookingBasePath } from "@/app/lib/booking-routing";
import type { Booking, BookingView } from "@/app/lib/booking-types";
import BookingHelp from "../chat/BookingHelp";
import BookingReviews from "../reviews/BookingReviews";
import { useAuth } from "@/app/lib/auth-context";
import { useBookingQuery } from "./useBookingQuery";
import { useRentalDayRefresh } from "./useRentalDayRefresh";
import { BookingBadge, BookingProductImage, paymentMethodLabel } from "./BookingVisuals";
import styles from "./Bookings.module.css";

function Facts({ items }: { items: [string, string | number | undefined][] }) {
  return <dl className={styles.facts}>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "Not provided"}</dd></div>)}</dl>;
}

function BookingTimeline({ booking }: { booking: Booking }) {
  const reviewed = booking.status !== "pending";
  return <section className={styles.detailSection}>
    <h2>Booking status</h2>
    <ol className={styles.timeline}>
      <li className={styles.timelineDone}><span className={styles.timelineDot}><Check size={13} /></span><div><strong>Booking requested</strong><p>{formatBookingDate(booking.createdAt)}</p></div></li>
      <li className={booking.status === "rejected" ? styles.timelineRejected : reviewed ? styles.timelineDone : styles.timelinePending}><span className={styles.timelineDot}>{reviewed ? booking.status === "rejected" ? <X size={13} /> : <Check size={13} /> : <Clock3 size={13} />}</span><div><strong>{booking.status === "approved" ? "Approved by admin" : booking.status === "rejected" ? "Rejected by admin" : "Admin review"}</strong><p>{reviewed && booking.reviewedAt ? formatBookingDate(booking.reviewedAt) : "Awaiting approval"}</p></div></li>
    </ol>
  </section>;
}

function FareBreakdown({ booking }: { booking: Booking }) {
  return <section className={styles.detailSection}>
    <h2>Fare breakdown</h2>
    <dl className={styles.fareBreakdown}>
      <div><dt>Rent ({booking.pricing.days} x {bookingMoney(booking.pricing.perDayCharges)})</dt><dd>{bookingMoney(booking.pricing.rentalTotal)}</dd></div>
      {booking.pricing.securityDeposit > 0 && <div><dt>Security deposit</dt><dd>{bookingMoney(booking.pricing.securityDeposit)}</dd></div>}
      <div className={styles.fareTotal}><dt>Total payable</dt><dd>{bookingMoney(booking.pricing.total)}</dd></div>
    </dl>
  </section>;
}

function PaymentSummary({ booking }: { booking: Booking }) {
  return <section className={styles.detailSection}>
    <h2>Payment</h2>
    <div className={styles.paymentHeading}><span className={styles.paymentIcon}><CreditCard size={20} /></span><div><strong>{paymentMethodLabel[booking.payment.method]}</strong><p>{booking.payment.status === "reported" ? "Reported, not verified" : "Unpaid"}</p></div></div>
    {booking.payment.method === "upi" && <Facts items={[["Payee UPI ID", booking.payment.upiId], ["UPI reference", booking.payment.upiReference]]} />}
    <p className={styles.note}>{booking.payment.method === "upi" ? "Your UPI reference has been recorded. Booking approval does not confirm payment receipt. Contact MouldX support for payment or refund help." : booking.payment.method === "platform" ? "Booking approval does not confirm payment receipt." : "Payment is arranged directly with the host. Booking approval does not confirm payment receipt."}</p>
  </section>;
}

export default function BookingDetail({ id, view }: { id: string; view: BookingView }) {
  const { user } = useAuth();
  const fetchBooking = useCallback((signal: AbortSignal) => bookingApi.get(id, view, signal), [id, view]);
  const query = useBookingQuery(`${user?._id}:${id}:${view}`, fetchBooking, Boolean(user));
  useRentalDayRefresh(query.reload, query.data?.status === "approved");
  if (query.loading) return <div className={styles.state} role="status">Loading booking...</div>;
  if (!query.data) return <div className={styles.state}><p role="alert">{query.error?.message || "Booking not found"}</p><button className={styles.button} onClick={query.reload}>Try again</button><Link href={bookingBasePath(view)}>Back to bookings</Link></div>;
  return <BookingContent key={`${query.data._id}:${query.data.status}`} booking={query.data} view={view} reload={query.reload} />;
}

function BookingContent({ booking, view, reload }: { booking: Booking; view: BookingView; reload: () => void }) {
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<ReturnType<typeof bookingError> | null>(null);
  const product = booking.snapshot.product;
  const isAdmin = view === "admin";
  const StatusIcon = booking.status === "approved" ? CheckCircle2 : booking.status === "rejected" ? XCircle : Clock3;
  const submitDecision = async () => {
    if (!decision || inFlight.current || (decision === "rejected" && !reason.trim())) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { await bookingApi.review(booking._id, decision, decision === "rejected" ? reason.trim() : undefined); reload(); }
    catch (err) { setError(bookingError(err)); }
    finally { inFlight.current = false; setBusy(false); }
  };

  return <article className={`${styles.page} ${styles.detail} ${isAdmin ? styles.adminPage : ""}`}>
    <div className={styles.heading}><div>
      <h1>{booking.code}</h1></div><div className={styles.headerActions}><BookingBadge status={booking.status} phase={!isAdmin ? booking.rentalPhase : undefined} /><button type="button" className={styles.iconButton} onClick={reload} disabled={busy} aria-label="Refresh status" title="Refresh status"><RefreshCw size={17} /></button></div></div>
    <div className={`${styles.statusNotice} ${styles[`notice_${booking.status}`]}`}><StatusIcon size={24} /><div>
      {booking.status === "pending" && <><strong>Approval pending</strong><p>Request submitted. Dates are not reserved until admin approval.</p></>}
      {booking.status === "approved" && <><strong>{booking.rentalPhase === "completed" ? "Booking completed" : booking.rentalPhase === "active" ? "Booking active" : "Booking approved"}</strong><p>{booking.rentalPhase === "completed" ? "Rental completed for" : "Booking confirmed for"} {formatBookingDate(booking.startDate)} to {formatBookingDate(booking.endDate)}.</p></>}
      {booking.status === "rejected" && <><strong>Booking rejected</strong><p>{booking.rejectionReason}</p>{view === "customer" && product.slug && <Link href={`/explore/${encodeURIComponent(product.slug)}/dates`}>Start a new booking request<ArrowRight size={15} /></Link>}</>}
    </div></div>
    <div className={styles.detailLayout}>
      <div className={styles.detailMain}>
        <BookingProductImage src={product.images?.[0]?.url} name={product.name} large />
        <div className={styles.productIntro}><p className={styles.eyebrow}>{product.code}</p><h2>{product.slug ? <Link className={styles.productTitleLink} href={`/explore/${encodeURIComponent(product.slug)}`}>{product.name}<ArrowRight size={18} /></Link> : product.name}</h2><p className={styles.note}>{[typeof product.category === "object" ? product.category?.title : product.category, typeof product.subCategory === "object" ? product.subCategory?.title : product.subCategory].filter(Boolean).join(" / ")}</p></div>
        <div className={styles.rentalDates} aria-label="Rental dates"><div><CalendarDays size={18} /><span>Pickup<strong>{formatBookingDate(booking.startDate)}</strong></span></div><ArrowRight size={18} className={styles.dateArrow} /><div><CalendarDays size={18} /><span>Return<strong>{formatBookingDate(booking.endDate)}</strong></span></div><span className={styles.rentalDuration}>{booking.pricing.days} {booking.pricing.days === 1 ? "day" : "days"}</span></div>
        {isAdmin && <section className={styles.detailSection}><h2>Customer and host</h2><Facts items={[
          ["Customer", booking.snapshot.customer?.fullName], ["Host", booking.snapshot.host?.fullName],
          ["Customer phone", booking.snapshot.customer?.phone], ["Host phone", booking.snapshot.host?.phone],
          ["Customer email", booking.snapshot.customer?.email || booking.snapshot.customer?.firmEmail], ["Host email", booking.snapshot.host?.email || booking.snapshot.host?.firmEmail],
          ["Customer firm", booking.snapshot.customer?.firmName], ["Host firm", booking.snapshot.host?.firmName],
        ]} /></section>}
      </div>
      <aside className={styles.detailSidebar}>
        {isAdmin && <section className={styles.decisionPanel}><h2><ShieldCheck size={20} />Decision</h2>
          {booking.status === "pending" ? <>
            <p className={styles.note}>Review the rental dates and payment information before approving.</p>
            {error && <div className={styles.error} role="alert"><p>{error.message}</p>{error.bookingId && <Link href={`/admin/bookings/${encodeURIComponent(error.bookingId)}`}>Open conflicting booking {error.bookingCode}</Link>}</div>}
            <label className={styles.field}>Rejection reason<textarea value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} maxLength={1000} placeholder="Required when rejecting" /></label>
            {!decision ? <div className={styles.decisionActions}><button className={`${styles.button} ${styles.primary}`} onClick={() => setDecision("approved")}><Check size={17} />Approve</button><button className={`${styles.button} ${styles.danger}`} disabled={!reason.trim()} onClick={() => setDecision("rejected")}><X size={17} />Reject</button></div> : <div className={styles.confirmDecision}>
              <p>{decision === "approved" ? "Confirm this reservation? Availability and cooldown will be checked again." : "Reject this request and notify the customer and admin team? The host will not be notified."}</p>
              <div className={styles.decisionActions}><button className={`${styles.button} ${decision === "rejected" ? styles.danger : styles.primary}`} disabled={busy || (decision === "rejected" && !reason.trim())} onClick={submitDecision}>{busy ? "Saving decision..." : "Confirm decision"}</button><button className={styles.button} disabled={busy} onClick={() => setDecision(null)}>Cancel</button></div>
            </div>}
          </> : <><BookingBadge status={booking.status} /><p className={styles.note}>{booking.reviewedAt ? `Reviewed on ${formatBookingDate(booking.reviewedAt)}.` : "This request has been reviewed."}</p>{booking.status === "rejected" && <p className={styles.decisionReason}>{booking.rejectionReason}</p>}</>}
        </section>}
        <BookingTimeline booking={booking} />
        <FareBreakdown booking={booking} />
        <PaymentSummary booking={booking} />
        {!isAdmin && booking.rentalPhase === "completed" && <BookingReviews id={booking._id} host={view === "host"} />}
        <BookingHelp bookingId={booking._id} status={booking.status} view={view} />
      </aside>
    </div>
  </article>;
}
