"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { getUserLandingPath } from "@/app/lib/auth-routing";
import { bookingApi, bookingError, getPaymentReceiptError, uploadPaymentReceipt } from "@/app/lib/booking-api";
import { publicApi } from "@/app/lib/public-api";
import { bookingMoney, formatBookingDate, rangeError, rentalDays } from "@/app/lib/booking-dates";
import { useBookingQuery } from "./useBookingQuery";
import { useRentalDayRefresh } from "./useRentalDayRefresh";
import type { PaymentMethod } from "@/app/lib/booking-types";
import styles from "@/app/explore/[id]/confirm/ConfirmPay.module.css";
import shared from "./Bookings.module.css";

export default function ConfirmBooking({ slug, start, end }: { slug: string; start: string; end: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("owner");
  const [reference, setReference] = useState("");
  const [bankDetailsChanged, setBankDetailsChanged] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const uploadedReceipt = useRef<{ file: File; mediaId: string } | null>(null);
  const receiptInput = useRef<HTMLInputElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<ReturnType<typeof bookingError> | null>(null);
  const datesHref = `/explore/${encodeURIComponent(slug)}/dates`;
  const next = `/explore/${encodeURIComponent(slug)}/confirm?${new URLSearchParams({ startDate: start, endDate: end })}`;
  const verified = Boolean(user && !user.isBlocked && user.profileVerificationStatus === "approved");
  const days = rentalDays(start, end);
  const fetchCheckout = useCallback(async (signal: AbortSignal) => {
    const { product } = await publicApi.getProduct(slug, signal);
    const check = await bookingApi.checkRequest(product._id, start, end, signal);
    if (!check.canProceed) return { check, paymentOptions: null };
    const paymentOptions = await bookingApi.paymentOptions(product._id, signal);
    return { check, paymentOptions };
  }, [slug, start, end]);
  const query = useBookingQuery(`${user?._id}:${slug}:${start}:${end}`, fetchCheckout, verified && days > 0);
  useRentalDayRefresh(query.reload);

  if (loading) return <div className={shared.state} role="status">Checking your account...</div>;
  if (!user) return <div className={shared.state}><h1>Sign in to request a booking</h1><Link className="btn-primary" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link><Link href={datesHref}>Back to dates</Link></div>;
  if (!verified) return <div className={shared.state}><h1>Verification required</h1><p>Your profile must be approved before you can request a booking.</p><Link className="btn-primary" href={getUserLandingPath(user)}>View verification status</Link></div>;
  if (!days) return <div className={shared.state}><p role="alert">Select valid pickup and return dates.</p><Link href={datesHref}>Choose dates</Link></div>;
  if (query.loading) return <div className={shared.state} role="status">Checking dates and payment options...</div>;
  if (!query.data) return <div className={shared.state}><p role="alert">{query.error?.message}</p><button onClick={query.reload}>Try again</button><Link href={datesHref}>Back to dates</Link></div>;
  if (!query.data.check.canProceed) {
    const { message, pendingRequest } = query.data.check;
    return <div className={shared.state}><p role="alert">{message}</p>{pendingRequest && <Link href={`/bookings/${encodeURIComponent(pendingRequest.bookingId)}`}>View existing booking {pendingRequest.bookingCode}</Link>}<Link href={datesHref}>Change dates</Link></div>;
  }
  if (!query.data.paymentOptions) return null;

  const { availability } = query.data.check;
  const { paymentOptions } = query.data;
  const { product } = availability;
  const rent = Math.round(product.pricing.perDayCharges * 100) * days / 100;
  const securityDeposit = method === "platform" ? product.pricing.securityDeposit : 0;
  const total = rent + securityDeposit;
  const validMethod = method === "owner" ? paymentOptions.owner : method === "bank_transfer" && Boolean(paymentOptions.bankAccount && /^[A-Z0-9]{6,64}$/.test(reference.trim()) && !receiptError);
  const canSubmit = !busy && acknowledged && validMethod && !error?.bookingId && !(method === "bank_transfer" && bankDetailsChanged);

  const submit = async () => {
    if (!canSubmit || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const current = await bookingApi.availability(product._id, start, end);
      if (current.product.availability === "maintenance") {
        setError({ message: "This product is under maintenance and is not accepting new bookings." }); query.reload(); return;
      }
      const invalid = rangeError(start, end, current.today, current.blockedRanges);
      if (invalid) { setError({ message: invalid }); query.reload(); return; }
      if (current.product.pricing.perDayCharges !== product.pricing.perDayCharges || (method === "platform" && current.product.pricing.securityDeposit !== product.pricing.securityDeposit)) {
        setAcknowledged(false);
        setError({ message: "The price has changed. Review the updated total before submitting." });
        query.reload();
        return;
      }
      if (method === "bank_transfer") {
        const options = await bookingApi.paymentOptions(product._id);
        if (!options.bankAccount || (["bankAccountNumber", "ifscCode", "bankName", "accountHolderName"] as const).some((key) => options.bankAccount?.[key] !== paymentOptions.bankAccount?.[key])) {
          setBankDetailsChanged(true); setAcknowledged(false);
          setError({ message: "The host's bank details have changed. Do not pay again. Contact support if you have already transferred funds.", paymentOptionsChanged: true });
          return;
        }
      }
      let receiptMediaId: string | undefined;
      if (method === "bank_transfer" && receiptFile) {
        if (uploadedReceipt.current?.file !== receiptFile) {
          uploadedReceipt.current = { file: receiptFile, mediaId: await uploadPaymentReceipt(receiptFile) };
        }
        receiptMediaId = uploadedReceipt.current.mediaId;
      }
      const booking = await bookingApi.create({ productId: product._id, startDate: start, endDate: end, paymentMethod: method,
        ...(method === "bank_transfer" && { reference: reference.trim(), expectedBankAccount: paymentOptions.bankAccount!, receiptMediaId }) });
      router.replace(`/bookings/${encodeURIComponent(booking._id)}`);
    } catch (err) {
      const failure = bookingError(err);
      setError(failure);
      if (failure.paymentOptionsChanged) { setBankDetailsChanged(true); setAcknowledged(false); }
      else if (failure.status === 409 && !failure.bookingId) query.reload();
    } finally { setBusy(false); inFlight.current = false; }
  };

  return <div className={styles.page}>
    <div className={styles.content}>
      <h1 className={styles.title}>Confirm booking</h1>

      <section className={styles.summaryCard} aria-label="Booking summary">
        <p className={styles.summaryName}>{product.name}</p>
        <p className={styles.summaryCode}>{product.code}</p>
        <div className={styles.dateRow}>
          <CalendarDays size={18} className={styles.dateIcon} aria-hidden="true" />
          <div className={styles.dateBlock}><span>Pickup</span><strong>{formatBookingDate(start)}</strong></div>
          <ArrowRight size={14} className={styles.dateArrow} aria-hidden="true" />
          <div className={styles.dateBlock}><span>Return</span><strong>{formatBookingDate(end)}</strong></div>
          <span className={styles.durationChip}>{days} {days === 1 ? "day" : "days"}</span>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Fare breakdown</h2>
        <div className={styles.fareRow}><span className={styles.fareLabel}>Rent ({days} x {bookingMoney(product.pricing.perDayCharges)})</span><strong className={styles.fareValue}>{bookingMoney(rent)}</strong></div>
        {method === "platform" && <div className={styles.fareRow}><span className={styles.fareLabel}>Security deposit</span><strong className={styles.fareValue}>{bookingMoney(securityDeposit)}</strong></div>}
        <div className={styles.divider} />
        <div className={styles.fareRow}><strong className={styles.totalLabel}>Total payable</strong><strong className={styles.totalValue}>{bookingMoney(total)}</strong></div>
      </section>

      <fieldset className={styles.card} disabled={busy}>
        <legend className={`${styles.cardTitle} ${styles.legend}`}>Payment method</legend>
        {[
          { value: "owner" as const, title: "Pay owner directly", desc: "Arrange payment with the host.", enabled: paymentOptions.owner },
          ...(paymentOptions.bankAccount ? [{ value: "bank_transfer" as const, title: "Pay host by bank transfer", desc: "Transfer to the host and provide your payment reference.", enabled: true }] : []),
          { value: "platform" as const, title: "Pay through MouldX", desc: "Coming soon. Includes a security deposit.", enabled: false },
        ].map((option) => <label key={option.value} className={`${styles.methodOption} ${method === option.value ? styles.methodOptionActive : ""}`}>
          <input type="radio" className={styles.radio} name="paymentMethod" value={option.value} disabled={!option.enabled} checked={method === option.value} onChange={() => { setMethod(option.value); setAcknowledged(false); }} />
          <span className={styles.methodInfo}><span className={styles.methodTitle}>{option.title}</span><span className={shared.note}>{option.desc}</span></span>
        </label>)}

        {method === "bank_transfer" && paymentOptions.bankAccount && !bankDetailsChanged && <div className={styles.transferBox}>
          <div className={styles.transferInfo}>
            <h3 className={styles.transferHeading}>Host bank details</h3>
            <dl className={styles.transferList}>
              <div className={styles.transferRow}><dt>Account holder</dt><dd>{paymentOptions.bankAccount.accountHolderName}</dd></div>
              <div className={styles.transferRow}><dt>Bank name</dt><dd>{paymentOptions.bankAccount.bankName}</dd></div>
              <div className={styles.transferRow}><dt>Account number</dt><dd>{paymentOptions.bankAccount.bankAccountNumber}</dd></div>
              <div className={styles.transferRow}><dt>IFSC code</dt><dd>{paymentOptions.bankAccount.ifscCode}</dd></div>
            </dl>
            <div className={styles.transferAmount}>
              <span>Amount to pay</span>
              <strong>{bookingMoney(total)}</strong>
            </div>
          </div>

          <label className={styles.refField}>
            <span>Bank transfer reference ID</span>
            <input name="reference" value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} minLength={6} maxLength={64} pattern="[A-Z0-9]{6,64}" required autoComplete="off" aria-describedby="transfer-reference-help" />
          </label>
          <p className={styles.transferNote} id="transfer-reference-help">6-64 letters and numbers. Each payment reference can be used only once for this bank account, including rejected bookings. For a previous payment, contact support about a refund.</p>
          <label className={styles.refField}>
            <span>Payment receipt (PDF, optional)</span>
            <input ref={receiptInput} type="file" accept="application/pdf,.pdf" aria-describedby="receipt-help" onChange={(event) => {
              const file = event.target.files?.[0] || null;
              const rejection = file ? getPaymentReceiptError(file) : null;
              setReceiptError(rejection);
              setReceiptFile(rejection ? null : file);
              uploadedReceipt.current = null;
            }} />
          </label>
          <p className={styles.transferNote} id="receipt-help">PDF only, up to 15MB.</p>
          {(receiptFile || receiptError) && <button type="button" className={shared.button} onClick={() => {
            setReceiptFile(null); setReceiptError(null); uploadedReceipt.current = null;
            if (receiptInput.current) receiptInput.current.value = "";
          }}>Remove receipt</button>}
          {receiptError && <p role="alert" className={shared.error}>{receiptError}</p>}
          <p className={styles.transferNote}>A reference or receipt reports your payment; it does not confirm receipt. Your booking still requires admin approval.</p>
        </div>}

        <label className={styles.ackRow}><input className={styles.checkbox} type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>I understand that payment is arranged with the host and this request requires admin approval.</span></label>
      </fieldset>
      {error && <div role="alert" className={shared.error}><p>{error.message}</p>{error.bookingId && <Link href={`/bookings/${encodeURIComponent(error.bookingId)}`}>View existing booking {error.bookingCode || ""}</Link>}{error.paymentOptionsChanged && <Link href="/contact">Contact support</Link>}</div>}
    </div>
    <div className={styles.ctaBar}>
      <div className={styles.ctaInner}>
        <div className={styles.ctaPriceRow}><span className={styles.ctaPriceLabel}>Total payable</span><strong className={styles.ctaPriceValue}>{bookingMoney(total)}</strong></div>
        <button type="button" disabled={!canSubmit} onClick={submit} className={`${styles.ctaBtn} ${canSubmit ? "btn-primary" : styles.ctaBtnDisabled}`}>{busy ? "Submitting request..." : "Send for approval"}<ArrowRight size={18} /></button>
      </div>
    </div>
  </div>;
}
