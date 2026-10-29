"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  HelpCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useLogout } from "@/app/lib/use-logout";
import { useAuth } from "@/app/lib/auth-context";
import { authApi } from "@/app/lib/auth-api";
import { bookingApi } from "@/app/lib/booking-api";
import { hostApi } from "@/app/lib/host-api";
import { useActiveRole } from "@/app/lib/active-role";
import { getApiErrorMessage } from "@/app/lib/api";
import { getPrivateFilePreviewUrl } from "@/app/lib/upload-api";
import { useBookingQuery } from "@/app/components/bookings/useBookingQuery";
import { useRentalDayRefresh } from "@/app/components/bookings/useRentalDayRefresh";
import ReviewList from "@/app/components/reviews/ReviewList";
import { emptyRating, type RatingSummary } from "@/app/lib/review-api";
import type { MediaRef } from "@/app/lib/types";
import styles from "./Profile.module.css";

const statusLabels = {
  pending: "Profile pending",
  in_review: "Under review",
  approved: "Verified",
  rejected: "Rejected",
};

// Update the href values below if your page routes are different.
const MORE_ITEMS = [
  { label: "Rent Agreement", href: "/rent-agreement", icon: FileText },
  { label: "FAQs", href: "/faqs", icon: HelpCircle },
  { label: "Policy", href: "/policy", icon: ShieldCheck },
  { label: "Contact MouldX", href: "/contact", icon: Mail },
];

export default function ProfilePage() {
  const { user: sessionUser } = useAuth();
  const router = useRouter();
  const { activeRole, switchRole } = useActiveRole(
    sessionUser?.approvedRoles.includes("owner"),
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reviewsOpen)
      reviewsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, [reviewsOpen]);
  const { handleLogout, loggingOut, logoutError } = useLogout();
  const fetcher = useCallback((signal: AbortSignal) => authApi.me(signal), []);
  const query = useBookingQuery(
    sessionUser?._id || "profile",
    fetcher,
    Boolean(sessionUser),
  );
  if (query.loading)
    return (
      <div className={styles.page}>
        <p role="status">Loading profile…</p>
      </div>
    );
  if (!query.data)
    return (
      <div className={styles.page}>
        <h1>Profile</h1>
        <p role="alert">
          {query.error?.message || "Could not load your profile"}
        </p>
        <button className={styles.switchProfileBtn} onClick={query.reload}>
          Try again
        </button>
        <button
          className={styles.logoutRow}
          onClick={handleLogout}
          disabled={loggingOut}
        >
          Logout
        </button>
        {logoutError && <p role="alert">{logoutError}</p>}
      </div>
    );
  const { user } = query.data;
  const verification =
    query.data.profileVerification || query.data.ownerProfileVerification;
  const status = verification?.status || user.profileVerificationStatus;
  const firm = verification?.firmDetails;
  const personal = verification?.personalDetails;
  const payout = verification?.payoutDetails;
  const phone = user.phone.startsWith("+") ? user.phone : `+91 ${user.phone}`;
  const canSwitch =
    user.approvedRoles.includes("owner") &&
    user.approvedRoles.includes("customer") &&
    status === "approved";
  const isHost = activeRole === "owner" && user.approvedRoles.includes("owner");
  const rating = query.data.customerRating || emptyRating;
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h1>Profile</h1>
        <button
          className={styles.refresh}
          aria-label="Refresh profile"
          onClick={query.reload}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className={styles.identityCard}>
        <div className={styles.avatar}>
          {user.fullName
            .split(/\s+/)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className={styles.identity}>
          <strong title={user.fullName}>{user.fullName}</strong>
          <p title={firm?.name || phone}>{firm?.name || phone}</p>
        </div>
        <span className={`${styles.statusBadge} ${styles[`status-${status}`]}`}>
          {statusLabels[status]}
        </span>
      </div>
      <ProfileStats
        userId={user._id}
        host={isHost}
        rating={rating}
        reviewsOpen={reviewsOpen}
        onToggleReviews={() => setReviewsOpen((open) => !open)}
      />
      <Section title="Personal Details">
        <Fields
          items={[
            ["Name", user.fullName],
            ["Phone No.", phone],
            ["Email ID", user.email],
            ["PAN", personal?.panNumber],
          ]}
        />
      </Section>
      <Section title="Firm Details">
        <Fields
          items={[
            ["Firm", firm?.name],
            ["GSTIN", firm?.gstNumber],
            ["Email", firm?.email],
            ["Address", firm?.address],
          ]}
          verifiedField={status === "approved" ? "GSTIN" : undefined}
        />
      </Section>
      <Section title="Payout Details">
        <Fields
          items={[
            [
              "Bank Account",
              payout?.bankAccountNumber
                ? `•••• ${payout.bankAccountNumber.slice(-4)}`
                : undefined,
            ],
            ["Bank", payout?.bankName],
            ["Account Holder", payout?.accountHolderName],
            ["IFSC", payout?.ifscCode],
            ["UPI", payout?.upiId],
          ]}
        />
        <button
          type="button"
          className={styles.addPaymentBtn}
          onClick={() => setDocumentsOpen((open) => !open)}
          aria-expanded={documentsOpen}
          aria-controls="profile-documents"
        >
          {documentsOpen
            ? "Hide verification documents"
            : "View verification documents"}
        </button>
        {documentsOpen && (
          <div id="profile-documents" className={styles.documents}>
            <Document label="PAN Card" file={personal?.panCard} />
            <Document label="GST Certificate" file={firm?.gstCertificate} />
            <Document label="MSME Certificate" file={firm?.msmeCertificate} />
            <Document label="Electricity Bill" file={firm?.electricityBill} />
          </div>
        )}
      </Section>
      {reviewsOpen && (
        <div ref={reviewsRef} className={styles.reviewsPanel}>
          <Section title="Your Rating as a Customer">
            <p className={styles.description}>
              {rating.count ? (
                <>
                  <span>{rating.average.toFixed(1)} out of 5</span>
                  {" · "}
                  <span>
                    Based on {rating.count}{" "}
                    {rating.count === 1 ? "review" : "reviews"}
                  </span>
                </>
              ) : (
                "No reviews yet"
              )}
            </p>
            <p className={styles.description}>
              Reviews received from hosts after your completed rentals.
            </p>
            <ReviewList scope="customer" showSummary={false} />
          </Section>
        </div>
      )}
      <div className={styles.sectionCard}>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={styles.moreToggle}
          aria-expanded={moreOpen}
        >
          <span className={styles.sectionTitle} style={{ margin: 0 }}>
            More
          </span>
          <span
            className={`${styles.moreChevron} ${moreOpen ? styles.moreChevronOpen : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {moreOpen && (
          <div className={styles.moreGrid}>
            {MORE_ITEMS.map(({ label, href, icon: Icon }) => (
              <Link key={href} className={styles.moreCard} href={href}>
                <span className={styles.moreCardIcon} aria-hidden>
                  <Icon size={18} />
                </span>
                <span className={styles.moreCardLabel}>{label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <button
        className={styles.logoutRow}
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? "Logging out…" : "Logout"}
      </button>
      {logoutError && <p role="alert">{logoutError}</p>}
      {canSwitch && (
        <button
          className={styles.switchProfileBtn}
          onClick={() => {
            switchRole(activeRole === "owner" ? "customer" : "owner");
            router.push("/");
          }}
        >
          Switch Profile —{" "}
          {activeRole === "owner" ? "Host ↔ User" : "User ↔ Host"}
        </button>
      )}
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.sectionCard}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
function Fields({
  items,
  verifiedField,
}: {
  items: [string, string | undefined][];
  verifiedField?: string;
}) {
  return (
    <dl className={styles.fieldGrid}>
      {items.map(([label, value], index) => (
        <div key={label} className={styles.fieldItem}>
          <dt className={styles.fieldLabel}>{label}</dt>
          <dd className={styles.fieldValue}>{value || "Not added"}</dd>
          {label === verifiedField && value && (
            <span className={styles.verified}>Verified</span>
          )}
          {index < items.length - 1 && (
            <span className={styles.separator} aria-hidden>
              ·
            </span>
          )}
        </div>
      ))}
    </dl>
  );
}
function ProfileStats({
  userId,
  host,
  rating,
  reviewsOpen,
  onToggleReviews,
}: {
  userId: string;
  host: boolean;
  rating: RatingSummary;
  reviewsOpen: boolean;
  onToggleReviews: () => void;
}) {
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const [bookings, dashboard] = await Promise.all([
        bookingApi.list(
          host ? "host" : "customer",
          { page: 1, limit: 1 },
          signal,
        ),
        host ? hostApi.dashboard(signal) : Promise.resolve(null),
      ]);
      return {
        total: dashboard?.utilization.total ?? bookings.stats.total,
        active: bookings.stats.active,
        completed: bookings.stats.completed,
      };
    },
    [host],
  );
  const query = useBookingQuery(
    `${userId}:${host ? "host" : "customer"}:profile-stats`,
    fetcher,
  );
  useRentalDayRefresh(query.reload);
  const base = host ? "/owner/bookings" : "/bookings";
  const active = (
    <>
      <span className={styles.statChipValue}>{query.data?.active ?? "—"}</span>
      <span className={styles.statChipLabel}>Active Rentals</span>
    </>
  );
  return (
    <section
      className={styles.statsCard}
      aria-label="Profile statistics"
      aria-busy={query.loading}
    >
      <div className={styles.statsHeader}>
        <div>
          <p className={styles.statsLabel}>
            {host ? "Total Moulds Listed" : "Total Bookings"}
          </p>
          <p className={styles.statsValue}>{query.data?.total ?? "—"}</p>
        </div>
        <Link
          href={host ? "/owner/moulds?status=approved" : "/bookings"}
          className={styles.statsCta}
        >
          {host ? "View all moulds" : "View all bookings"}{" "}
          <span aria-hidden>→</span>
        </Link>
      </div>
      <div className={styles.statsGrid}>
        {host ? (
          <Link href={`${base}?tab=active`} className={styles.statChip}>
            {active}
          </Link>
        ) : (
          <div className={styles.statChip}>{active}</div>
        )}
        <Link href={`${base}?tab=completed`} className={styles.statChip}>
          <span className={styles.statChipValue}>
            {query.data?.completed ?? "—"}
          </span>
          <span className={styles.statChipLabel}>Completed</span>
        </Link>
        <button
          type="button"
          className={styles.statChip}
          onClick={onToggleReviews}
          aria-label="View customer reviews"
          aria-expanded={reviewsOpen}
        >
          <span className={styles.statChipValue}>
            {rating.count ? `★ ${rating.average.toFixed(1)}` : "—"}
          </span>
          <span className={styles.statChipLabel}>Customer Rating</span>
        </button>
      </div>
      {query.error && (
        <p className={styles.statsError} role="alert">
          {query.error.message}{" "}
          <button type="button" onClick={query.reload}>
            Try again
          </button>
        </p>
      )}
    </section>
  );
}
function Document({ label, file }: { label: string; file?: MediaRef }) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const open = async () => {
    if (!file?.key || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      const url = await getPrivateFilePreviewUrl(file.key);
      if (popup) popup.location.replace(url);
      else window.location.assign(url);
    } catch (err) {
      popup?.close();
      setError(getApiErrorMessage(err, "Could not open the document"));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <div>
      <button
        className={styles.document}
        onClick={() => void open()}
        disabled={busy || !file?.key}
      >
        {busy ? "Opening…" : label}
        {file?.key ? " ↗" : " · Not added"}
      </button>
      {error && (
        <p className={styles.description} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
