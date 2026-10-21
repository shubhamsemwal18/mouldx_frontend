"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./BookingApprovals.module.css";

type PaymentStatus = "CAPTURED" | "PROCESSING" | "FAILED";
type BookingStatus = "PENDING" | "APPROVED" | "REJECTED";
type StatusFilter = BookingStatus | "ALL";

interface BookingRequest {
  id: string;
  bookingId: string;
  customer: string;
  owner: string;
  amount: number;
  payment: PaymentStatus;
  bookingDateISO: string; // yyyy-mm-dd — used for date-range filtering + CSV
  status: BookingStatus;
}

// TEMP dummy data — real admin API se aayega
const BOOKINGS: BookingRequest[] = [
  {
    id: "1",
    bookingId: "BK-24581",
    customer: "Rohit Sharma",
    owner: "Sharma Industries",
    amount: 27850,
    payment: "CAPTURED",
    bookingDateISO: "2026-09-14",
    status: "PENDING",
  },
  {
    id: "2",
    bookingId: "BK-24602",
    customer: "Neha Kapoor",
    owner: "Nova Plastics",
    amount: 19400,
    payment: "CAPTURED",
    bookingDateISO: "2026-09-13",
    status: "PENDING",
  },
  {
    id: "3",
    bookingId: "BK-24611",
    customer: "Vikram Rao",
    owner: "Vector Molds",
    amount: 31200,
    payment: "PROCESSING",
    bookingDateISO: "2026-09-12",
    status: "PENDING",
  },
];

const PAYMENT_CLASS: Record<PaymentStatus, string> = {
  CAPTURED: "paymentCaptured",
  PROCESSING: "paymentProcessing",
  FAILED: "paymentFailed",
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
};

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All Statuses" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

function csvEscape(v: string | number) {
  const str = String(v);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // BOM so Excel reads UTF-8 correctly
  const csv = "\uFEFF" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BookingApprovalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });


  const FilterIcon = ({ size = 24 }) => (
   <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#374151"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  
    <circle cx="15" cy="6" r="2.5" fill="white" />
    <circle cx="8" cy="12" r="2.5" fill="white" />
    <circle cx="13" cy="18" r="2.5" fill="white" />
  </svg>
  );

  const filtered = useMemo(() => {
    return BOOKINGS.filter((b) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        b.bookingId.toLowerCase().includes(q) ||
        b.customer.toLowerCase().includes(q) ||
        b.owner.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

      const matchesDate =
        (!dateRange.start || b.bookingDateISO >= dateRange.start) &&
        (!dateRange.end || b.bookingDateISO <= dateRange.end);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [search, statusFilter, dateRange]);

  const pendingCount = BOOKINGS.filter((b) => b.status === "PENDING").length;

  const isFilterActive = statusFilter !== "ALL";

  const handleStatusSelect = (key: StatusFilter) => {
    setStatusFilter(key);
    setIsFilterOpen(false);
  };

  const handleDateChange = (field: "start" | "end", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownloadCsv = () => {
    if (filtered.length === 0) return;

    const rows: (string | number)[][] = [
      ["Booking ID", "Customer", "Owner", "Amount (INR)", "Payment", "Booking Date", "Status"],
      ...filtered.map((b) => [
        b.bookingId,
        b.customer,
        b.owner,
        b.amount,
        b.payment,
        b.bookingDateISO,
        b.status,
      ]),
    ];

    const parts = ["booking-requests"];
    if (statusFilter !== "ALL") parts.push(statusFilter.toLowerCase());
    if (dateRange.start || dateRange.end) {
      parts.push(`${dateRange.start || "start"}_to_${dateRange.end || "today"}`);
    } else {
      parts.push(new Date().toISOString().slice(0, 10));
    }

    downloadCsv(`${parts.join("_")}.csv`, rows);
  };

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Booking Approvals</h1>
        <span className={styles.pendingPill}>{pendingCount} PENDING</span>
      </div>

      {/* ---------- Search + Filter ---------- */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by booking ID, customer, owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.dateRangeGroup}>
          <input
            type="date"
            className={styles.dateInput}
            value={dateRange.start}
            onChange={(e) => handleDateChange("start", e.target.value)}
          />
          <span className={styles.dateSep}>→</span>
          <input
            type="date"
            className={styles.dateInput}
            value={dateRange.end}
            onChange={(e) => handleDateChange("end", e.target.value)}
          />
        </div>

        <div className={styles.filterWrap}>
          <button
            type="button"
            className={`${styles.filterBtn} ${isFilterActive ? styles.filterBtnActive : ""}`}
            onClick={() => setIsFilterOpen((v) => !v)}
          >
            <button className="filter-btn" aria-label="Filter">
  <FilterIcon size={24} />
</button>
            {isFilterActive && <span className={styles.filterDot} aria-hidden />}
          </button>

          {isFilterOpen && (
            <div className={styles.filterDropdown}>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`${styles.filterOption} ${
                    statusFilter === opt.key ? styles.filterOptionActive : ""
                  }`}
                  onClick={() => handleStatusSelect(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.downloadBtn}
          onClick={handleDownloadCsv}
          disabled={filtered.length === 0}
          title="Download filtered records as CSV"
        >
          <span aria-hidden>⬇</span> Download CSV
          <span className={styles.downloadCount}>{filtered.length}</span>
        </button>
      </div>

      {/* ---------- Table (desktop) ---------- */}
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Owner</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className={styles.idCell}>{row.bookingId}</td>
                  <td className={styles.mutedCell}>{row.customer}</td>
                  <td className={styles.mutedCell}>{row.owner}</td>
                  <td className={styles.amountCell}>₹{row.amount.toLocaleString("en-IN")}</td>
                  <td>
                    <span className={`${styles.pill} ${styles[PAYMENT_CLASS[row.payment]]}`}>
                      {row.payment}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.pill} ${styles[STATUS_CLASS[row.status]]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className={styles.actionCell}>
                    <Link href={`/admin/bookings/${row.id}`} className={styles.reviewBtn}>
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p className={styles.emptyText}>No bookings match your search.</p>
          )}
        </div>
      </div>

      {/* ---------- Cards (mobile) ---------- */}
      <div className={styles.mobileList}>
        {filtered.map((row) => (
          <Link key={row.id} href={`/admin/bookings/${row.id}`} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div className="min-w-0 flex-1">
                <p className={styles.idCell}>{row.bookingId}</p>
                <p className={styles.mobileMeta}>
                  {row.customer} → {row.owner}
                </p>
              </div>
              <span className={`${styles.pill} ${styles[STATUS_CLASS[row.status]]}`}>
                {row.status}
              </span>
            </div>
            <div className={styles.mobileCardBottom}>
              <span className={styles.amountCell}>₹{row.amount.toLocaleString("en-IN")}</span>
              <span className={`${styles.pill} ${styles[PAYMENT_CLASS[row.payment]]}`}>
                {row.payment}
              </span>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className={styles.emptyText}>No bookings match your search.</p>
        )}
      </div>
    </div>
  );
}