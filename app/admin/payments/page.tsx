"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Payments.module.css";

type TxnStatus = "CAPTURED" | "PROCESSED" | "PROCESSING" | "DISPUTED" | "FAILED";
type TxnType = "Booking Payment" | "Deposit Refund" | "Deposit Deduction" | "Payout";

interface Transaction {
  id: string;
  txnId: string;
  bookingId: string;
  type: TxnType;
  amount: number;
  status: TxnStatus;
  date: string;
  dateISO: string; // yyyy-mm-dd — used for date-range filtering + CSV
}

// TEMP dummy data — real Razorpay/ledger API se aayega
const TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    txnId: "rzp_29xk1",
    bookingId: "BK-24581",
    type: "Booking Payment",
    amount: 27850,
    status: "CAPTURED",
    date: "14 Sep",
    dateISO: "2026-09-14",
  },
  {
    id: "2",
    txnId: "rzp_29xl9",
    bookingId: "BK-24102",
    type: "Deposit Refund",
    amount: 13500,
    status: "PROCESSED",
    date: "13 Sep",
    dateISO: "2026-09-13",
  },
  {
    id: "3",
    txnId: "rzp_29xm2",
    bookingId: "BK-24611",
    type: "Booking Payment",
    amount: 31200,
    status: "PROCESSING",
    date: "12 Sep",
    dateISO: "2026-09-12",
  },
  {
    id: "4",
    txnId: "rzp_29xn7",
    bookingId: "BK-23990",
    type: "Deposit Deduction",
    amount: 4200,
    status: "DISPUTED",
    date: "11 Sep",
    dateISO: "2026-09-11",
  },
];

const STATUS_CLASS: Record<TxnStatus, string> = {
  CAPTURED: "statusCaptured",
  PROCESSED: "statusProcessed",
  PROCESSING: "statusProcessing",
  DISPUTED: "statusDisputed",
  FAILED: "statusFailed",
};

const DATE_FILTERS = ["All time", "Today", "Last 7 days", "Last 30 days"] as const;
const STATUS_FILTERS = ["All statuses", "Captured", "Processed", "Processing", "Disputed", "Failed"] as const;

function csvEscape(v: string | number) {
  const str = String(v);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // BOM so Excel reads UTF-8 correctly (₹ etc.)
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

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function PaymentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>(DATE_FILTERS[0]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>(STATUS_FILTERS[0]);
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = TRANSACTIONS;

    if (statusFilter !== "All statuses") {
      list = list.filter((t) => t.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (dateFilter !== "All time") {
      const cutoff =
        dateFilter === "Today" ? isoDaysAgo(0) : dateFilter === "Last 7 days" ? isoDaysAgo(7) : isoDaysAgo(30);
      list = list.filter((t) => t.dateISO >= cutoff);
    }

    if (search.trim() !== "") {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.txnId.toLowerCase().includes(q) ||
          t.bookingId.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
      );
    }

    return list;
  }, [search, statusFilter, dateFilter]);

  const isFilterActive = dateFilter !== "All time" || statusFilter !== "All statuses";

  const handleExportCsv = () => {
    if (filtered.length === 0) return;

    const rows: (string | number)[][] = [
      ["Txn ID", "Booking", "Type", "Amount (INR)", "Status", "Date"],
      ...filtered.map((t) => [t.txnId, t.bookingId, t.type, t.amount, t.status, t.dateISO]),
    ];

    const parts = ["mouldx-payments"];
    if (statusFilter !== "All statuses") parts.push(statusFilter.toLowerCase());
    if (dateFilter !== "All time") parts.push(dateFilter.toLowerCase().replace(/\s+/g, "-"));
    if (parts.length === 1) parts.push(new Date().toISOString().slice(0, 10));

    downloadCsv(`${parts.join("_")}.csv`, rows);
  };

  const handleView = (id: string) => {
    router.push(`/admin/payments/${id}`);
  };

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Payments &amp; Refunds</h1>
        <button
          type="button"
          onClick={handleExportCsv}
          className={styles.exportBtn}
          disabled={filtered.length === 0}
          title="Export filtered transactions as CSV"
        >
          <span aria-hidden>⬇</span> Export CSV
          <span className={styles.exportCount}>{filtered.length}</span>
        </button>
      </div>

      {/* ---------- Search + Filter ---------- */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by transaction ID, booking, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterWrap}>
          <button
            type="button"
            onClick={() => setFilterOpen((p) => !p)}
            className={`${styles.filterBtn} ${isFilterActive ? styles.filterBtnActive : ""}`}
          >
            {dateFilter === "All time" && statusFilter === "All statuses"
              ? "Date · Status"
              : `${dateFilter !== "All time" ? dateFilter : "Date"} · ${
                  statusFilter !== "All statuses" ? statusFilter : "Status"
                }`}{" "}
            <span aria-hidden>▾</span>
          </button>

          {filterOpen && (
            <>
              <div className={styles.filterBackdrop} onClick={() => setFilterOpen(false)} />
              <div className={styles.filterDropdown}>
                <p className={styles.filterGroupLabel}>Date range</p>
                {DATE_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setDateFilter(f)}
                    className={`${styles.filterOption} ${dateFilter === f ? styles.filterOptionActive : ""}`}
                  >
                    {f}
                  </button>
                ))}
                <p className={styles.filterGroupLabel}>Status</p>
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`${styles.filterOption} ${statusFilter === f ? styles.filterOptionActive : ""}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------- Table (desktop) ---------- */}
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Booking</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className={styles.txnIdCell}>{t.txnId}</td>
                  <td className={styles.mutedCell}>{t.bookingId}</td>
                  <td className={styles.mutedCell}>{t.type}</td>
                  <td className={styles.amountCell}>₹{t.amount.toLocaleString("en-IN")}</td>
                  <td>
                    <span className={`${styles.statusPill} ${styles[STATUS_CLASS[t.status]]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className={styles.mutedCell}>{t.date}</td>
                  <td className={styles.actionCell}>
                    <button
                      type="button"
                      onClick={() => handleView(t.id)}
                      className={styles.eyeBtn}
                      aria-label={`View ${t.txnId}`}
                    >
                      👁
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && <p className={styles.emptyText}>No transactions match your search.</p>}
        </div>
      </div>

      {/* ---------- Cards (mobile) ---------- */}
      <div className={styles.mobileList}>
        {filtered.map((t) => (
          <div key={t.id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div className="min-w-0 flex-1">
                <p className={styles.txnIdCell}>{t.txnId}</p>
                <p className={styles.mobileMeta}>
                  {t.bookingId} · {t.type}
                </p>
              </div>
              <span className={`${styles.statusPill} ${styles[STATUS_CLASS[t.status]]}`}>
                {t.status}
              </span>
            </div>
            <div className={styles.mobileCardBottom}>
              <span className={styles.amountCell}>₹{t.amount.toLocaleString("en-IN")}</span>
              <div className="flex items-center gap-2">
                <span className={styles.mobileMeta}>{t.date}</span>
                <button
                  type="button"
                  onClick={() => handleView(t.id)}
                  className={styles.eyeBtn}
                  aria-label={`View ${t.txnId}`}
                >
                  👁 View
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <p className={styles.emptyText}>No transactions match your search.</p>}
      </div>
    </div>
  );
}