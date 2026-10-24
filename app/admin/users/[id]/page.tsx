"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./UserDetail.module.css";

type Role = "Host" | "User";
type KycStatus = "VERIFIED" | "PENDING" | "N/A";

interface OwnerExtra {
  firmName: string;
  pan: string;
  gstNo: string;
  bankAccount: string;
  bankName: string;
  listings: { code: string; name: string; status: string }[];
}

interface UserReview {
  id: string;
  rating: number; // 1-5
  text: string;
}

interface UserDetail {
  id: string;
  name: string;
  role: Role;
  phone: string;
  email: string;
  joined: string;
  city: string;
  kyc: KycStatus;
  initial: string;
  gradient: string;
  activityCount: number;
  activityLabel: string;
  recentActivity: { text: string; date: string }[];
  reviews: UserReview[];
  ownerExtra?: OwnerExtra;
}

// TEMP dummy data — real users API se aayega
const USER_DETAILS: Record<string, UserDetail> = {
  "1": {
    id: "1",
    name: "Rohit Sharma",
    role: "Host",
    phone: "+91 98XXXXXX10",
    email: "rohit@sharmaind.com",
    joined: "2 Mar 2026",
    city: "Pune",
    kyc: "VERIFIED",
    initial: "R",
    gradient: "linear-gradient(135deg, #22d3ee, #2563eb)",
    activityCount: 12,
    activityLabel: "listings",
    recentActivity: [
      { text: "Listed new mould MX-000231", date: "2 days ago" },
      { text: "Dispatched booking BK-24581", date: "5 days ago" },
      { text: "Payout of ₹12,600 released", date: "6 days ago" },
    ],
    reviews: [
      {
        id: "r1",
        rating: 5,
        text: "Mould was exactly as described — clean, well-maintained and the host helped with setup over a call. Cycle time matched what was listed.",
      },
      {
        id: "r2",
        rating: 4,
        text: "Dispatch was on time and packaging was solid. Minor cleaning needed on the cooling channels.",
      },
    ],
    ownerExtra: {
      firmName: "Sharma Industries",
      pan: "ABCDE1234F",
      gstNo: "27ABCDE1234F1Z5",
      bankAccount: "•••• •••• 4021",
      bankName: "HDFC Bank",
      listings: [
        { code: "MX-000123", name: "Bottle Cap Mould", status: "LIVE" },
        { code: "MX-000198", name: "5L Can Mould", status: "LIVE" },
        { code: "MX-000231", name: "Chair Mould", status: "PENDING" },
      ],
    },
  },
  "2": {
    id: "2",
    name: "Neha Kapoor",
    role: "User",
    phone: "+91 97XXXXXX45",
    email: "neha.kapoor@gmail.com",
    joined: "18 Apr 2026",
    city: "Nashik",
    kyc: "N/A",
    initial: "N",
    gradient: "linear-gradient(135deg, #34d399, #059669)",
    activityCount: 9,
    activityLabel: "bookings",
    recentActivity: [
      { text: "Completed booking BK-24102", date: "3 days ago" },
      { text: "Rated host Apex Poly — 5 stars", date: "3 days ago" },
      { text: "New booking request for MX-000198", date: "1 week ago" },
    ],
    reviews: [
      {
        id: "r1",
        rating: 5,
        text: "Smooth rental, mould came back on time and in the same condition it was sent. Clear communication throughout.",
      },
    ],
  },
  "3": {
    id: "3",
    name: "Vikram Rao",
    role: "Host",
    phone: "+91 96XXXXXX88",
    email: "vikram@vectormolds.com",
    joined: "30 Jan 2026",
    city: "Nashik",
    kyc: "VERIFIED",
    initial: "V",
    gradient: "linear-gradient(135deg, #818cf8, #7c3aed)",
    activityCount: 6,
    activityLabel: "listings",
    recentActivity: [
      { text: "Listed new mould MX-000212", date: "4 days ago" },
      { text: "Booking BK-24611 marked active", date: "1 week ago" },
    ],
    reviews: [],
    ownerExtra: {
      firmName: "Vector Molds",
      pan: "PQRSX5678K",
      gstNo: "27PQRSX5678K1Z2",
      bankAccount: "•••• •••• 7788",
      bankName: "ICICI Bank",
      listings: [
        { code: "MX-000198", name: "5L Can Mould", status: "LIVE" },
        { code: "MX-000212", name: "4-Cavity Injection Mould", status: "LIVE" },
      ],
    },
  },
};

const KYC_CLASS: Record<KycStatus, string> = {
  VERIFIED: "kycVerified",
  PENDING: "kycPending",
  "N/A": "kycNa",
};

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const user = USER_DETAILS[id];
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>User not found.</p>
        <Link href="/admin/users" className={styles.notFoundLink}>
          ← Back to User Management
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    // TODO: call delete-user API with { userId: id }
    setConfirmDelete(false);
    router.push("/admin/users");
  };

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <span className={styles.avatar} style={{ background: user.gradient }}>
            {user.initial}
          </span>
          <div>
            <h1 className={styles.title}>{user.name}</h1>
            <p className={styles.subtitle}>
              {user.role} · {user.city}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.kycPill} ${styles[KYC_CLASS[user.kyc]]}`}>{user.kyc}</span>
          <button type="button" onClick={() => setConfirmDelete(true)} className={styles.deleteUserBtn}>
            🗑 Delete User
          </button>
        </div>
      </div>

      {/* ---------- Grid layout ---------- */}
      <div className={styles.layout}>
        <div className={styles.leftCol}>
          {/* Contact info */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Contact Info</h2>
            <Row label="Phone" value={user.phone} />
            <Row label="Email" value={user.email} />
            <Row label="Joined" value={user.joined} isLast />
          </div>

          {/* Owner-only: Firm & Payout */}
          {user.ownerExtra && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Firm &amp; Payout</h2>
              <Row label="Firm Name" value={user.ownerExtra.firmName} />
              <Row label="PAN" value={user.ownerExtra.pan} />
              <Row label="GST No." value={user.ownerExtra.gstNo} />
              <Row label="Bank A/C" value={user.ownerExtra.bankAccount} />
              <Row label="Bank Name" value={user.ownerExtra.bankName} isLast />
            </div>
          )}

          {/* Owner-only: Listings */}
          {user.ownerExtra && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Listings ({user.ownerExtra.listings.length})</h2>
              {user.ownerExtra.listings.map((l, i) => (
                <div
                  key={l.code}
                  className={`${styles.listingRow} ${
                    i < user.ownerExtra!.listings.length - 1 ? styles.listingRowBorder : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className={styles.listingCode}>{l.code}</p>
                    <p className={styles.listingName}>{l.name}</p>
                  </div>
                  <span
                    className={`${styles.listingStatus} ${
                      l.status === "LIVE" ? styles.listingLive : styles.listingPending
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: activity + stats + reviews */}
        <div className={styles.rightCol}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{user.activityCount}</span>
            <span className={styles.statLabel}>{user.activityLabel}</span>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Recent Activity</h2>
            {user.recentActivity.map((a, i) => (
              <div
                key={i}
                className={`${styles.activityRow} ${
                  i < user.recentActivity.length - 1 ? styles.activityRowBorder : ""
                }`}
              >
                <span className={styles.activityDot} />
                <div>
                  <p className={styles.activityText}>{a.text}</p>
                  <p className={styles.activityDate}>{a.date}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reviews: rating + text only */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Reviews ({user.reviews.length})</h2>
            {user.reviews.length === 0 ? (
              <p className={styles.reviewEmpty}>No reviews yet.</p>
            ) : (
              user.reviews.map((r, i) => (
                <div
                  key={r.id}
                  className={`${styles.reviewRow} ${
                    i < user.reviews.length - 1 ? styles.reviewRowBorder : ""
                  }`}
                >
                  <StarRating value={r.rating} />
                  <p className={styles.reviewText}>{r.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ---------- Delete confirmation modal ---------- */}
      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(false)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Delete this user?</h3>
            <p className={styles.confirmText}>
              This will permanently remove <strong>{user.name}</strong> ({user.role}) and all
              their {user.activityLabel} from the platform. This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={styles.confirmCancelBtn}
              >
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className={styles.confirmDeleteBtn}>
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