"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/app/lib/auth-context";
import { getUserLandingPath } from "@/app/lib/auth-routing";
import { bookingApi, bookingError } from "@/app/lib/booking-api";
import { publicApi } from "@/app/lib/public-api";
import { bookingMoney, formatBookingDate, isUpiReference, rangeError, rentalDays, upiPaymentUri } from "@/app/lib/booking-dates";
import { useBookingQuery } from "./useBookingQuery";
import type { PaymentMethod } from "@/app/lib/booking-types";
import styles from "@/app/explore/[id]/confirm/ConfirmPay.module.css";
import shared from "./Bookings.module.css";

export default function ConfirmBooking({ slug, start, end }: { slug: string; start: string; end: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("owner");
  const [reference, setReference] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<ReturnType<typeof bookingError> | null>(null);
  const datesHref = `/explore/${encodeURIComponent(slug)}/dates`;
  const next = `/explore/${encodeURIComponent(slug)}/confirm?${new URLSearchParams({ startDate: start, endDate: end })}`;
  const verified = Boolean(user && !user.isBlocked && user.profileVerificationStatus === "approved");
  const days = rentalDays(start, end);
  const fetchCheckout = useCallback(async (signal: AbortSignal) => {
    const { product } = await publicApi.getProduct(slug);
    if (signal.aborted) throw new Error("Cancelled");
    // Deep links/back navigation must not bypass the date-step duplicate check.
    const pendingRequest = await bookingApi.pendingRequest(product._id, start, end, signal);
    if (pendingRequest) return { pendingRequest, availability: null, paymentOptions: null };
    const [availability, paymentOptions] = await Promise.all([
      bookingApi.availability(product._id, start, end, signal),
      bookingApi.paymentOptions(product._id, signal),
    ]);
    return { pendingRequest: null, availability, paymentOptions };
  }, [slug, start, end]);
  const query = useBookingQuery(`${user?._id}:${slug}:${start}:${end}`, fetchCheckout, verified && days > 0);

  if (loading) return <div className={shared.state} role="status">Checking your account...</div>;
  if (!user) return <div className={shared.state}><h1>Sign in to request a booking</h1><Link className="btn-primary" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link><Link href={datesHref}>Back to dates</Link></div>;
  if (!verified) return <div className={shared.state}><h1>Verification required</h1><p>Your profile must be approved before you can request a booking.</p><Link className="btn-primary" href={getUserLandingPath(user)}>View verification status</Link></div>;
  if (!days) return <div className={shared.state}><p role="alert">Select valid pickup and return dates.</p><Link href={datesHref}>Choose dates</Link></div>;
  if (query.loading) return <div className={shared.state} role="status">Checking dates and payment options...</div>;
  if (!query.data) return <div className={shared.state}><p role="alert">{query.error?.message}</p><button onClick={query.reload}>Try again</button><Link href={datesHref}>Back to dates</Link></div>;
  if (query.data.pendingRequest) return <div className={shared.state}><p role="alert">A request is already pending for this product and these dates.</p><Link href={`/bookings/${encodeURIComponent(query.data.pendingRequest.bookingId)}`}>View existing booking {query.data.pendingRequest.bookingCode}</Link><Link href={datesHref}>Change dates</Link></div>;
  if (!query.data.availability || !query.data.paymentOptions) return null;

  const { availability, paymentOptions } = query.data;
  const { product } = availability;
  const ownerId = typeof product.owner === "string" ? product.owner : product.owner?._id;
  const ownProduct = ownerId === user._id;
  const invalidDates = rangeError(start, end, availability.today, availability.blockedRanges);
  const rent = Math.round(product.pricing.perDayCharges * 100) * days / 100;
  const securityDeposit = method === "platform" ? product.pricing.securityDeposit : 0;
  const total = rent + securityDeposit;
  const validMethod = method === "owner" ? paymentOptions.owner : method === "upi" && Boolean(paymentOptions.upi && isUpiReference(reference.trim()));
  const canSubmit = !busy && !ownProduct && !invalidDates && acknowledged && validMethod && !error?.bookingId;

  const submit = async () => {
    if (!canSubmit || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const current = await bookingApi.availability(product._id, start, end);
      const invalid = rangeError(start, end, current.today, current.blockedRanges);
      if (invalid) { setError({ message: invalid }); query.reload(); return; }
      if (current.product.pricing.perDayCharges !== product.pricing.perDayCharges || (method === "platform" && current.product.pricing.securityDeposit !== product.pricing.securityDeposit)) {
        setAcknowledged(false);
        setError({ message: "The price has changed. Review the updated total before submitting." });
        query.reload();
        return;
      }
      const booking = await bookingApi.create({ productId: product._id, startDate: start, endDate: end, paymentMethod: method, ...(method === "upi" && { upiReference: reference.trim() }) });
      router.replace(`/bookings/${encodeURIComponent(booking._id)}`);
    } catch (err) {
      const failure = bookingError(err);
      setError(failure);
      if (failure.status === 409 && !failure.bookingId) query.reload();
    } finally { setBusy(false); inFlight.current = false; }
  };

  return <div className={styles.page}>
    <div className={styles.content}>
      {/* <Link href={datesHref} className={shared.back}><ArrowLeft size={16} /> Change dates</Link> */}
      <h1 className={styles.title}>Confirm booking</h1>
      <p className={styles.subtitle}>{product.name} · {product.code}</p>
      <p className={shared.note}>{formatBookingDate(start)} to {formatBookingDate(end)} · {days} {days === 1 ? "day" : "days"}</p>
      {ownProduct && <p className={shared.error} role="alert">You cannot book your own product.</p>}
      {invalidDates && <p className={shared.error} role="alert">{invalidDates} <Link href={datesHref}>Change dates</Link></p>}
      <section className={shared.section}>
        <h2 className={styles.cardTitle}>Fare breakdown</h2>
        <div className={styles.fareRow}><span className={styles.fareLabel}>Rent ({days} x {bookingMoney(product.pricing.perDayCharges)})</span><strong className={styles.fareValue}>{bookingMoney(rent)}</strong></div>
        {method === "platform" && <div className={styles.fareRow}><span className={styles.fareLabel}>Security deposit</span><strong className={styles.fareValue}>{bookingMoney(securityDeposit)}</strong></div>}
        <div className={styles.divider} />
        <div className={styles.fareRow}><strong className={styles.totalLabel}>Total payable</strong><strong className={styles.totalValue}>{bookingMoney(total)}</strong></div>
      </section>
      <fieldset className={shared.section} disabled={busy || ownProduct || Boolean(invalidDates)}>
        <legend className={styles.cardTitle}>Payment method</legend>
        {[
          { value: "owner" as const, title: "Pay owner directly", desc: "Arrange payment with the host.", enabled: paymentOptions.owner },
          ...(paymentOptions.upi ? [{ value: "upi" as const, title: "Pay host by UPI", desc: "Transfer to the host and provide your payment reference.", enabled: true }] : []),
          { value: "platform" as const, title: "Pay through MouldX", desc: "Coming soon. Includes a security deposit.", enabled: false },
        ].map((option) => <label key={option.value} className={`${styles.methodOption} ${method === option.value ? styles.methodOptionActive : ""}`}>
          <input type="radio" className={styles.radio} name="paymentMethod" value={option.value} disabled={!option.enabled} checked={method === option.value} onChange={() => { setMethod(option.value); setAcknowledged(false); }} />
          <span className={styles.methodInfo}><span className={styles.methodTitle}>{option.title}</span><span className={shared.note}>{option.desc}</span></span>
        </label>)}
        {method === "upi" && paymentOptions.upi && <div className={shared.upi}>
          <QRCodeSVG value={upiPaymentUri(paymentOptions.upi, total, product.code)} size={208} marginSize={4} title={`Pay ${paymentOptions.upi.name} by UPI`} />
          <strong>{paymentOptions.upi.name}</strong><span>{paymentOptions.upi.id}</span><strong>{bookingMoney(total)}</strong>
          {/* <a className={shared.back} href={upiPaymentUri(paymentOptions.upi, total, product.code)}>Open UPI app <ArrowRight size={16} /></a> */}
          <label className={shared.field}>UPI transaction reference<input name="upiReference" value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} minLength={6} maxLength={64} pattern="[A-Z0-9]{6,64}" required autoComplete="off" aria-describedby="upi-reference-help" /></label>
          <p className={shared.note} id="upi-reference-help">6-64 letters and numbers. Each payment reference can be used only once for this payee, including rejected bookings. For a previous payment, contact support about a refund.</p>
          <p className={shared.note}>A reference reports your payment; it does not confirm receipt. Your booking still requires admin approval.</p>
        </div>}
        <label className={styles.ackRow}><input className={styles.checkbox} type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I understand that payment is arranged with the host and this request requires admin approval.</label>
      </fieldset>
      {error && <div role="alert" className={shared.error}><p>{error.message}</p>{error.bookingId && <Link href={`/bookings/${encodeURIComponent(error.bookingId)}`}>View existing booking {error.bookingCode || ""}</Link>}</div>}
    </div>
    <div className={styles.ctaBar}><button type="button" disabled={!canSubmit} onClick={submit} className={`${styles.ctaBtn} ${canSubmit ? "btn-primary" : styles.ctaBtnDisabled}`}>{busy ? "Submitting request..." : "Send for approval"}<ArrowRight size={18} /></button></div>
  </div>;
}
