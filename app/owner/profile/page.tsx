"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./OwnerProfile.module.css";
import { useLogout } from "@/app/lib/use-logout";

const OWNER = {
  name: "Rohit Sharma",
  phone: "+91 90XXXXXX45",
  city: "Pune",
  email: "rohit@sharmaind.com",
  firmName: "Sharma Industries",
  gstin: "27ABCDE1234F1Z5",
  bankAccount: "•••• •••• 4021",
  bankName: "HDFC Bank",
  stats: {
    totalMoulds: 8,
    activeRentals: 4,
    completed: 21,
    rating: 4.8,
  },
};

const MORE_LINKS = [
  { label: "Rent Agreement", href: "/owner/profile/rent-agreement", icon: "📄" },
  { label: "FAQs", href: "/owner/profile/faqs", icon: "❓" },
  { label: "Policy", href: "/owner/profile/policy", icon: "🛡️" },
  { label: "Settings", href: "/owner/profile/settings", icon: "▽️" },
];

export default function OwnerProfilePage() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { handleLogout, loggingOut, logoutError } = useLogout();

  return (
    <div className={styles.page}>
      <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Profile</h1>

      {/* ---------- Identity card ---------- */}
      <div className={styles.identityCard}>
        <div className={styles.avatar}>
          {OWNER.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-gray-900">{OWNER.name}</p>
          <p className="truncate text-xs text-gray-400">{OWNER.firmName}</p>
        </div>
        <Link href="/owner/profile/edit" className={styles.editBtn}>
          Edit
        </Link>
      </div>

      {/* ---------- Mould stats ---------- */}
      <div className={styles.statsCard}>
        <div className={styles.statsHeader}>
          <div>
            <p className={styles.statsLabel}>Total Moulds Listed</p>
            <p className={styles.statsValue}>{OWNER.stats.totalMoulds}</p>
          </div>
          <Link href="/owner/moulds" className={styles.statsCta}>
            View all moulds <span aria-hidden>→</span>
          </Link>
        </div>

        <div className={styles.statsGrid}>
          <Link href="/owner/bookings?tab=active" className={styles.statChip}>
            <span className={styles.statChipValue}>{OWNER.stats.activeRentals}</span>
            <span className={styles.statChipLabel}>Active Rentals</span>
          </Link>
          <Link href="/owner/bookings?tab=done" className={styles.statChip}>
            <span className={styles.statChipValue}>{OWNER.stats.completed}</span>
            <span className={styles.statChipLabel}>Completed</span>
          </Link>
          <div className={styles.statChip}>
            <span className={styles.statChipValue}>★ {OWNER.stats.rating}</span>
            <span className={styles.statChipLabel}>Rating</span>
          </div>
        </div>
      </div>

      {/* ---------- Personal Details ---------- */}
      <Section title="Personal Details">
        <FieldList
          items={[
            { label: "Name", value: OWNER.name },
            { label: "Phone No.", value: OWNER.phone },
            { label: "Email ID", value: OWNER.email },
            { label: "City", value: OWNER.city },
          ]}
        />
      </Section>

      {/* ---------- Firm Details ---------- */}
      <Section title="Firm Details">
        <FieldList
          items={[
            { label: "Firm Name", value: OWNER.firmName },
            { label: "GSTIN", value: OWNER.gstin, badge: "Verified" },
          ]}
        />
      </Section>

      {/* ---------- Payout Details ---------- */}
      <Section title="Payout Details">
        <FieldList
          items={[
            { label: "Bank A/C", value: OWNER.bankAccount },
            { label: "Bank Name", value: OWNER.bankName },
          ]}
        />
        <button type="button" className={styles.addPaymentBtn}>
          Update Payout Details
        </button>
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

      {/* ---------- Logout + Switch Profile ---------- */}
      <button type="button" className={styles.logoutRow} onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? "Logging out..." : "Logout"}
      </button>
      {logoutError && <p role="alert">{logoutError}</p>}

      <Link href="/switch-profile" className={styles.switchProfileBtn}>
        Switch Profile — Host ↔ User
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
    <div className="flex flex-wrap gap-x-1.5 gap-y-1 text-[13px] text-gray-500">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {item.value}
          {item.badge && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              {item.badge}
            </span>
          )}
          {i < items.length - 1 && <span className="text-gray-300">·</span>}
        </span>
      ))}
    </div>
  );
}
