"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./ListingApprovals.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { adminApi, type AdminProductListParams } from "@/app/lib/admin-api";
import type { Pagination } from "@/app/lib/product-api";
import type { Product, ProductStatus, ProductStatusStats, User } from "@/app/lib/types";

type StatusFilter = ProductStatus | "ALL";

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "DRAFT",
  in_review: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
};

const STATUS_CLASS: Record<ProductStatus, string> = {
  draft: "statusResubmitted",
  in_review: "statusPending",
  approved: "statusApproved",
  rejected: "statusRejected",
};

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All Statuses" },
  { key: "in_review", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "draft", label: "Draft" },
];

/** A resubmitted listing is still `in_review`; the count tells them apart. */
const statusLabelFor = (listing: Product) =>
  listing.status === "in_review" && (listing.resubmissionCount ?? 0) > 0
    ? "RESUBMITTED"
    : STATUS_LABEL[listing.status];

const statusClassFor = (listing: Product) =>
  listing.status === "in_review" && (listing.resubmissionCount ?? 0) > 0
    ? "statusResubmitted"
    : STATUS_CLASS[listing.status];

const ownerName = (listing: Product) =>
  typeof listing.owner === "object" ? (listing.owner as User).fullName : "—";

const formatPrice = (value?: number) =>
  value === undefined ? "—" : `₹${value.toLocaleString("en-IN")}`;

const toDateOnly = (value?: string | null) => (value ? value.slice(0, 10) : "");

function csvEscape(v: string | number) {
  const str = String(v);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // BOM so Excel reads UTF-8 correctly (· etc.)
  const csv = "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
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

export default function ListingApprovalsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [page, setPage] = useState(1);

  const [listings, setListings] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<ProductStatusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const buildParams = useCallback(
    (overrides: Partial<AdminProductListParams> = {}): AdminProductListParams => ({
      page,
      limit: PAGE_SIZE,
      ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(dateRange.start ? { submittedFrom: dateRange.start } : {}),
      ...(dateRange.end ? { submittedTo: dateRange.end } : {}),
      ...overrides,
    }),
    [dateRange.end, dateRange.start, debouncedSearch, page, statusFilter]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminApi.listProducts(buildParams());
      setListings(data.products);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load listings"));
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Deferred to a macrotask so the fetch's setState calls do not run
  // synchronously inside the effect.
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pendingCount = stats?.in_review ?? 0;
  const isFilterActive = statusFilter !== "ALL";
  const totalPages = pagination?.pages ?? 1;
  const startIndex = ((pagination?.page ?? 1) - 1) * PAGE_SIZE;

  const handleStatusSelect = (key: StatusFilter) => {
    setStatusFilter(key);
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleDateChange = (field: "start" | "end", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  /** Exports every row matching the current filters, not just this page. */
  const handleDownloadCsv = async () => {
    if (exporting || (pagination?.total ?? 0) === 0) return;

    setExporting(true);

    try {
      const data = await adminApi.listProducts(buildParams({ page: 1, limit: 100 }));
      const rows: (string | number)[][] = [
        ["Code", "Product", "Category", "Host", "Price Per Day (INR)", "Moulds", "Submitted", "Status"],
        ...data.products.map((listing) => [
          listing.code,
          listing.name,
          listing.category?.title || "",
          ownerName(listing),
          listing.pricing?.perDayCharges ?? "",
          listing.mouldCount ?? 0,
          toDateOnly(listing.submittedAt),
          statusLabelFor(listing),
        ]),
      ];

      const parts = ["listing-requests"];
      if (statusFilter !== "ALL") parts.push(statusFilter);
      if (dateRange.start || dateRange.end) {
        parts.push(`${dateRange.start || "start"}_to_${dateRange.end || "today"}`);
      } else {
        parts.push(new Date().toISOString().slice(0, 10));
      }

      downloadCsv(`${parts.join("_")}.csv`, rows);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not export listings"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Listing Approvals</h1>
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
            placeholder="Search by code, product, host..."
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
          disabled={exporting || (pagination?.total ?? 0) === 0}
          title="Download filtered records as CSV"
        >
          <span aria-hidden>⬇</span> {exporting ? "Exporting..." : "Download CSV"}
          <span className={styles.downloadCount}>{pagination?.total ?? 0}</span>
        </button>
      </div>

      {error && <p className={styles.emptyText}>{error}</p>}

      {/* ---------- Table (desktop) ---------- */}
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Product</th>
                <th>Host</th>
                <th>Price/Day</th>
                <th>Moulds</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listings.map((row) => (
                <tr key={row._id}>
                  <td className={styles.idCell}>{row.code}</td>
                  <td className={styles.mutedCell}>
                    {row.name}
                    {row.category?.title ? ` · ${row.category.title}` : ""}
                  </td>
                  <td className={styles.mutedCell}>{ownerName(row)}</td>
                  <td className={styles.priceCell}>{formatPrice(row.pricing?.perDayCharges)}</td>
                  <td className={styles.mutedCell}>
                    {row.mouldCount ?? 0} mould{(row.mouldCount ?? 0) === 1 ? "" : "s"}
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${styles[statusClassFor(row)]}`}>
                      {statusLabelFor(row)}
                    </span>
                  </td>
                  <td className={styles.actionCell}>
                    <Link href={`/admin/listings/${row._id}`} className={styles.reviewBtn}>
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && listings.length === 0 && <p className={styles.emptyText}>Loading listings...</p>}
          {!loading && listings.length === 0 && (
            <p className={styles.emptyText}>No listings match your search.</p>
          )}
        </div>
      </div>

      {/* ---------- Cards (mobile) ---------- */}
      <div className={styles.mobileList}>
        {listings.map((row) => (
          <Link key={row._id} href={`/admin/listings/${row._id}`} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div className="min-w-0 flex-1">
                <p className={styles.idCell}>{row.code}</p>
                <p className={styles.mobileMeta}>
                  {row.name}
                  {row.category?.title ? ` · ${row.category.title}` : ""}
                </p>
              </div>
              <span className={`${styles.statusPill} ${styles[statusClassFor(row)]}`}>
                {statusLabelFor(row)}
              </span>
            </div>
            <div className={styles.mobileCardBottom}>
              <span className={styles.mobileMeta}>{ownerName(row)}</span>
              <span className={styles.mobileMeta}>
                {formatPrice(row.pricing?.perDayCharges)}/day · {row.mouldCount ?? 0} mould
                {(row.mouldCount ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          </Link>
        ))}

        {loading && listings.length === 0 && <p className={styles.emptyText}>Loading listings...</p>}
        {!loading && listings.length === 0 && (
          <p className={styles.emptyText}>No listings match your search.</p>
        )}
      </div>

      {/* ---------- Pagination ---------- */}
      {totalPages > 1 && pagination && (
        <nav className={styles.pagination} aria-label="Listings pagination">
          <p className={styles.paginationInfo}>
            Showing {startIndex + 1}–{startIndex + listings.length} of {pagination.total}
          </p>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage(pagination.page - 1)}
              disabled={!pagination.hasPrevPage || loading}
            >
              ← Previous
            </button>
            <span className={styles.pageIndicator}>
              {pagination.page} / {totalPages}
            </span>
            <button
              type="button"
              className={`${styles.pageBtn} ${styles.pageBtnPrimary}`}
              onClick={() => setPage(pagination.page + 1)}
              disabled={!pagination.hasNextPage || loading}
            >
              Next →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
