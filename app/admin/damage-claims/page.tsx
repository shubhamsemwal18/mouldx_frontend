"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./DamageClaims.module.css";

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";
type StatusFilter = ClaimStatus | "ALL";

interface DamageClaim {
  id: string;
  bookingId: string;
  mouldCode: string;
  reportedBy: string;
  depositHeld: number;
  filedAgo: string;
  filedDateISO: string; // yyyy-mm-dd — used for date-range filtering + CSV
  status: ClaimStatus;
}

const CLAIMS: DamageClaim[] = [
  {
    id: "1",
    bookingId: "BK-24102",
    mouldCode: "MX-000077",
    reportedBy: "Host — Apex Poly",
    depositHeld: 20000,
    filedAgo: "1 day ago",
    filedDateISO: "2026-09-27",
    status: "PENDING",
  },
  {
    id: "2",
    bookingId: "BK-23990",
    mouldCode: "MX-000212",
    reportedBy: "Host — Vector Molds",
    depositHeld: 18500,
    filedAgo: "2 days ago",
    filedDateISO: "2026-09-26",
    status: "PENDING",
  },
];

const STATUS_CLASS: Record<ClaimStatus, string> = {
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

export default function DamageClaimsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const filtered = useMemo(() => {
    return CLAIMS.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        c.bookingId.toLowerCase().includes(q) ||
        c.mouldCode.toLowerCase().includes(q) ||
        c.reportedBy.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

      const matchesDate =
        (!dateRange.start || c.filedDateISO >= dateRange.start) &&
        (!dateRange.end || c.filedDateISO <= dateRange.end);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [search, statusFilter, dateRange]);

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
      ["Booking ID", "Mould Code", "Reported By", "Deposit Held (INR)", "Filed Date", "Status"],
      ...filtered.map((c) => [
        c.bookingId,
        c.mouldCode,
        c.reportedBy,
        c.depositHeld,
        c.filedDateISO,
        c.status,
      ]),
    ];

    const parts = ["damage-claims"];
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
        <h1 className={styles.title}>Damage Claims</h1>
        <span className={styles.urgentPill}>{CLAIMS.length} URGENT</span>
      </div>

      {/* ---------- Search + Filter ---------- */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by booking ID, mould, host..."
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
            <span aria-hidden>▽</span>
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
                <th>Mould</th>
                <th>Reported By</th>
                <th>Deposit Held</th>
                <th>Filed</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className={styles.idCell}>{row.bookingId}</td>
                  <td className={styles.mutedCell}>{row.mouldCode}</td>
                  <td className={styles.mutedCell}>{row.reportedBy}</td>
                  <td className={styles.depositCell}>₹{row.depositHeld.toLocaleString("en-IN")}</td>
                  <td className={styles.mutedCell}>{row.filedAgo}</td>
                  <td>
                    <span className={`${styles.statusPill} ${styles[STATUS_CLASS[row.status]]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className={styles.actionCell}>
                    <Link href={`/admin/damage-claims/${row.id}`} className={styles.reviewBtn}>
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p className={styles.emptyText}>No damage claims match your search.</p>
          )}
        </div>
      </div>

      {/* ---------- Cards (mobile) ---------- */}
      <div className={styles.mobileList}>
        {filtered.map((row) => (
          <Link key={row.id} href={`/admin/damage-claims/${row.id}`} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div className="min-w-0 flex-1">
                <p className={styles.idCell}>{row.bookingId}</p>
                <p className={styles.mobileMeta}>{row.mouldCode} · {row.reportedBy}</p>
              </div>
              <span className={styles.reviewPillMobile}>REVIEW →</span>
            </div>
            <div className={styles.mobileCardBottom}>
              <span className={styles.depositCell}>₹{row.depositHeld.toLocaleString("en-IN")} held</span>
              <span className={styles.mobileMeta}>{row.filedAgo}</span>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className={styles.emptyText}>No damage claims match your search.</p>
        )}
      </div>
    </div>
  );
}