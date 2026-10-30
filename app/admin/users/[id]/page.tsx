"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminUserDetail } from "@/app/lib/admin-api";
import { getApiErrorMessage } from "@/app/lib/api";
import type { ProductStatus } from "@/app/lib/types";
import styles from "./UserDetail.module.css";

const KYC_EVENT_LABEL: Record<string, string> = {
  submitted: "Applied for verification",
  resubmitted: "Re-applied for verification",
  approved: "Verification approved",
  rejected: "Verification rejected",
};

const BOOKING_STATUS_LABEL = { pending: "Awaiting approval", approved: "Confirmed", rejected: "Rejected" } as const;

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function maskAccount(value?: string) {
  if (!value) return "—";
  return `•••• ${value.slice(-4)}`;
}

function listingStatus(listing: AdminUserDetail["listings"][number]): { label: string; live: boolean } {
  const labels: Record<ProductStatus, string> = { draft: "DRAFT", in_review: "IN REVIEW", approved: "LIVE", rejected: "REJECTED" };
  if (listing.status === "approved" && listing.availability === "maintenance") return { label: "MAINTENANCE", live: false };
  return { label: labels[listing.status] ?? listing.status.toUpperCase(), live: listing.status === "approved" };
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      adminApi.getUser(id)
        .then((data) => { if (!cancelled) { setDetail(data); setError(""); } })
        .catch((err) => { if (!cancelled) setError(getApiErrorMessage(err, "Could not load this user")); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [id]);

  if (loading) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Loading user…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>{error || "User not found."}</p>
        <Link href="/admin/users" className={styles.notFoundLink}>
          ← Back to User Management
        </Link>
      </div>
    );
  }

  const { user, profileVerification: kyc, listings, bookings, ratings, reviewsReceived } = detail;
  const role = user.isHost ? "Host" : "User";
  const initials = user.fullName.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
  const history = [...(kyc?.history ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const reviewer = (entry: (typeof history)[number]) =>
    entry.by && typeof entry.by === "object" ? ` by ${entry.by.fullName || entry.by.email}` : "";

  return (
    <div className={styles.page}>
      <Link href="/admin/users" className={styles.notFoundLink}>
        ← Back to User Management
      </Link>

      <div className={styles.headerRow} style={{ marginTop: 10 }}>
        <div className={styles.headerLeft}>
          <span className={styles.avatar} style={{ background: "linear-gradient(135deg, #22d3ee, #2563eb)" }}>
            {initials}
          </span>
          <div>
            <h1 className={styles.title}>{user.fullName}</h1>
            <p className={styles.subtitle}>
              {role}
              {user.firmName ? ` · ${user.firmName}` : ""}
              {user.isBlocked ? " · Blocked" : ""}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.kycPill} ${styles.kycVerified}`}>VERIFIED</span>
          <button type="button" onClick={() => setConfirmDelete(true)} className={styles.deleteUserBtn}>
            🗑 Delete User
          </button>
        </div>
      </div>

      {notice && <p className={styles.noticeText} role="status">{notice}</p>}

      <div className={styles.layout}>
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Contact Info</h2>
            <Row label="Phone" value={`${user.phone}${user.phoneVerifiedAt ? " ✓" : ""}`} />
            <Row label="Email" value={user.email ? `${user.email}${user.emailVerifiedAt ? " ✓" : " (unverified)"}` : "—"} />
            <Row label="Joined" value={formatDate(user.createdAt)} />
            <Row label="KYC approved" value={formatDate(user.kycApprovedAt)} />
            <Row label="Last login" value={formatDate(user.lastLoginAt, true)} isLast />
          </div>

          {kyc && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Firm &amp; Payout</h2>
              <Row label="Firm Name" value={kyc.firmDetails?.name || "—"} />
              <Row label="Firm Email" value={kyc.firmDetails?.email || "—"} />
              <Row label="Address" value={kyc.firmDetails?.address || "—"} />
              <Row label="PAN" value={kyc.personalDetails?.panNumber || "—"} />
              <Row label="GST No." value={kyc.firmDetails?.gstNumber || "—"} />
              <Row label="Bank Name" value={kyc.payoutDetails?.bankName || "—"} />
              <Row label="Account Holder" value={kyc.payoutDetails?.accountHolderName || "—"} />
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Bank A/C</span>
                <span className={styles.detailValue}>
                  {showAccount ? kyc.payoutDetails?.bankAccountNumber || "—" : maskAccount(kyc.payoutDetails?.bankAccountNumber)}
                  {kyc.payoutDetails?.bankAccountNumber && (
                    <button type="button" className={styles.revealBtn} onClick={() => setShowAccount((v) => !v)}>
                      {showAccount ? "Hide" : "Show"}
                    </button>
                  )}
                </span>
              </div>
              <Row label="IFSC" value={kyc.payoutDetails?.ifscCode || "—"} />
              <Row label="UPI ID" value={kyc.payoutDetails?.upiId || "—"} isLast />
              <Link href={`/admin/kyc/${kyc._id}`} className={styles.cardLink}>View KYC documents →</Link>
            </div>
          )}

          {user.isHost && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Listings ({user.counts.listings})</h2>
              {listings.length === 0 && <p className={styles.reviewEmpty}>No listings yet.</p>}
              {listings.map((l, i) => {
                const status = listingStatus(l);
                return (
                  <Link
                    key={l._id}
                    href={`/admin/listings/${l._id}`}
                    className={`${styles.listingRow} ${styles.rowLink} ${i < listings.length - 1 ? styles.listingRowBorder : ""}`}
                  >
                    <div className="min-w-0">
                      <p className={styles.listingCode}>{l.code}</p>
                      <p className={styles.listingName}>{l.name}</p>
                    </div>
                    <span className={`${styles.listingStatus} ${status.live ? styles.listingLive : styles.listingPending}`}>
                      {status.label}
                    </span>
                  </Link>
                );
              })}
              {user.counts.listings > listings.length && (
                <p className={styles.reviewEmpty}>Showing the latest {listings.length} listings.</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.rightCol}>
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{user.counts.bookings}</span>
              <span className={styles.statLabel}>bookings made ({user.counts.confirmedBookings} confirmed)</span>
            </div>
            {user.isHost && (
              <div className={styles.statCard}>
                <span className={styles.statValue}>{user.counts.hostBookings}</span>
                <span className={styles.statLabel}>bookings received ({user.counts.confirmedHostBookings} confirmed)</span>
              </div>
            )}
            {user.isHost && (
              <div className={styles.statCard}>
                <span className={styles.statValue}>{ratings.asHost.count ? `${ratings.asHost.average.toFixed(1)} ★` : "—"}</span>
                <span className={styles.statLabel}>host rating ({ratings.asHost.count})</span>
              </div>
            )}
            <div className={styles.statCard}>
              <span className={styles.statValue}>{ratings.asCustomer.count ? `${ratings.asCustomer.average.toFixed(1)} ★` : "—"}</span>
              <span className={styles.statLabel}>customer rating ({ratings.asCustomer.count})</span>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Recent Bookings</h2>
            {bookings.length === 0 && <p className={styles.reviewEmpty}>No bookings yet.</p>}
            {bookings.map((b, i) => (
              <Link
                key={b._id}
                href={`/admin/bookings/${b._id}`}
                className={`${styles.activityRow} ${styles.rowLink} ${i < bookings.length - 1 ? styles.activityRowBorder : ""}`}
              >
                <span className={styles.activityDot} />
                <div>
                  <p className={styles.activityText}>
                    {b.code} · {b.product.name || "Listing"} — {b.role === "host" ? "as host" : "as customer"}
                  </p>
                  <p className={styles.activityDate}>
                    {formatBookingDate(b.startDate)} – {formatBookingDate(b.endDate)} · {BOOKING_STATUS_LABEL[b.status]}
                    {typeof b.total === "number" ? ` · ₹${b.total.toLocaleString("en-IN")}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Verification History</h2>
            {history.length === 0 && <p className={styles.reviewEmpty}>No verification history.</p>}
            {history.map((entry, i) => (
              <div key={`${entry.action}-${entry.at}`} className={`${styles.activityRow} ${i < history.length - 1 ? styles.activityRowBorder : ""}`}>
                <span className={styles.activityDot} />
                <div>
                  <p className={styles.activityText}>
                    {KYC_EVENT_LABEL[entry.action] || entry.action}
                    {reviewer(entry)}
                  </p>
                  <p className={styles.activityDate}>
                    {formatDate(entry.at, true)}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Reviews from Hosts ({ratings.asCustomer.count})</h2>
            {reviewsReceived.length === 0 ? (
              <p className={styles.reviewEmpty}>No reviews yet.</p>
            ) : (
              reviewsReceived.map((r, i) => (
                <div key={r._id} className={`${styles.reviewRow} ${i < reviewsReceived.length - 1 ? styles.reviewRowBorder : ""}`}>
                  <StarRating value={r.rating} />
                  <p className={styles.reviewText}>{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(false)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Delete this user?</h3>
            <p className={styles.confirmText}>
              Deleting <strong>{user.fullName}</strong> is not available yet. This action is a placeholder and will not
              change any data.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmDelete(false)} className={styles.confirmCancelBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); setNotice("User deletion is not available yet. No changes were made."); }}
                className={styles.confirmDeleteBtn}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className={`${styles.detailRow} ${isLast ? styles.detailRowLast : ""}`}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <span className={styles.stars} aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden className={i < value ? styles.starFilled : styles.starEmpty}>
          ★
        </span>
      ))}
      <span className={styles.starValue}>{value.toFixed(1)}</span>
    </span>
  );
}
