"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import type { ProfileVerificationStatus, UserRole } from "@/app/lib/types";
import styles from "./Profile.module.css";

const STATUS_LABELS: Record<ProfileVerificationStatus, string> = {
  pending: "Profile pending",
  in_review: "Under review",
  approved: "Verified",
  rejected: "Rejected",
};

const MORE_LINKS = [
  { label: "Rent Agreement", href: "/profile/rent-agreement", icon: "📄" },
  { label: "FAQs", href: "/profile/faqs", icon: "❓" },
  { label: "Policy", href: "/profile/policy", icon: "🛡️" },
  { label: "Settings", href: "/profile/settings", icon: "▽️" },
];

const formatPhone = (phone?: string) => {
  if (!phone) return "Not added";
  return phone.startsWith("+") ? phone : `+91 ${phone}`;
};

const getInitials = (name?: string) =>
  (name || "MouldX User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatRoles = (roles: UserRole[] = []) => {
  const visibleRoles = roles.filter((role) => role !== "admin");
  if (!visibleRoles.length) return "Customer";
  return visibleRoles.map((role) => role[0].toUpperCase() + role.slice(1)).join(", ");
};

const formatDate = (date?: string) => {
  if (!date) return "Not submitted";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export default function CustomerProfilePage() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, ownerProfileVerification, logout } = useAuth();
  const router = useRouter();
  const status = ownerProfileVerification?.status || user?.profileVerificationStatus || "pending";
  const firmDetails = ownerProfileVerification?.firmDetails;
  const personalDetails = ownerProfileVerification?.personalDetails;
  const payoutDetails = ownerProfileVerification?.payoutDetails;
  const displayName = user?.fullName || "MouldX User";
  const roleLabel = formatRoles(user?.approvedRoles);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Profile</h1>

      {/* ---------- Identity card ---------- */}
      <div className={styles.identityCard}>
        <div className={styles.avatar}>
          {getInitials(displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-gray-900">{displayName}</p>
          <p className="truncate text-xs text-gray-400">
            {formatPhone(user?.phone)} · {roleLabel}
          </p>
        </div>
        <span className={`${styles.statusBadge} ${styles[`status-${status}`]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* ---------- Verification status ---------- */}
      <div className={styles.statsCard}>
        <div className={styles.statsHeader}>
          <div>
            <p className={styles.statsLabel}>Profile verification</p>
            <p className={styles.statsValue}>{STATUS_LABELS[status]}</p>
          </div>
          {status === "rejected" ? (
            <Link href="/owner/onboarding/rejected" className={styles.statsCta}>
              View remarks <span aria-hidden>→</span>
            </Link>
          ) : (
            <span className={styles.statsCta}>Submitted {formatDate(ownerProfileVerification?.submittedAt)}</span>
          )}
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statChip}>
            <span className={styles.statChipValue}>{ownerProfileVerification?.resubmissionCount || 0}</span>
            <span className={styles.statChipLabel}>Resubmits</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statChipValue}>{ownerProfileVerification?.reviewedAt ? "Yes" : "No"}</span>
            <span className={styles.statChipLabel}>Reviewed</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statChipValue}>{user?.emailVerifiedAt ? "Yes" : "No"}</span>
            <span className={styles.statChipLabel}>Email verified</span>
          </div>
        </div>
      </div>

      {/* ---------- Personal Details ---------- */}
      <Section title="Personal Details">
        <FieldList
          items={[
            { label: "Name", value: displayName },
            { label: "Phone No.", value: formatPhone(user?.phone) },
            { label: "Email ID", value: user?.email || "Not added" },
            { label: "PAN", value: personalDetails?.panNumber || "Not submitted" },
          ]}
        />
      </Section>

      {/* ---------- Firm Details ---------- */}
      <Section title="Firm Details">
        <FieldList
          items={[
            { label: "Firm", value: firmDetails?.name || "Not submitted" },
            { label: "GSTIN", value: firmDetails?.gstNumber || "Not submitted" },
            { label: "Email", value: firmDetails?.email || "Not submitted" },
            { label: "Address", value: firmDetails?.address || "Not submitted" },
          ]}
        />
      </Section>

      <Section title="Payout Details">
        <FieldList
          items={[
            { label: "Account Holder", value: payoutDetails?.accountHolderName || "Not submitted" },
            { label: "Bank", value: payoutDetails?.bankName || "Not submitted" },
            { label: "IFSC", value: payoutDetails?.ifscCode || "Not submitted" },
            { label: "UPI", value: payoutDetails?.upiId || "Not added" },
          ]}
        />
      </Section>

      {/* ---------- More (dropdown) ---------- */}
      <div className={styles.sectionCard}>
        <button
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          className={styles.moreToggle}
        >
          <span className={styles.sectionTitle} style={{ margin: 0 }}>
            More
          </span>
          <span className={`${styles.moreChevron} ${moreOpen ? styles.moreChevronOpen : ""}`}>
            ▾
          </span>
        </button>

        {moreOpen && (
          <div className={styles.moreGrid}>
            {MORE_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={styles.moreCard}>
                <span className={styles.moreCardIcon} aria-hidden>
                  {item.icon}
                </span>
                <span className={styles.moreCardLabel}>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Logout + Switch Profile — always visible ---------- */}
      <button type="button" className={styles.logoutRow} onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? "Logging out..." : "Logout"}
      </button>

      <Link href="/switch-profile" className={styles.switchProfileBtn}>
        Switch Profile — Customer ↔ Owner
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.sectionCard}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

function FieldList({
  items,
}: {
  items: { label: string; value: string; badge?: string }[];
}) {
  return (
    <div className={styles.fieldGrid}>
      {items.map((item) => (
        <div key={item.label} className={styles.fieldItem}>
          <span className={styles.fieldLabel}>{item.label}</span>
          <span className={styles.fieldValue}>
            {item.value}
          </span>
          {item.badge && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              {item.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
