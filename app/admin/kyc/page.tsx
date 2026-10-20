"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminKycPagination, type AdminKycStats } from "@/app/lib/admin-api";
import { getApiErrorMessage } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";
import type { OwnerProfileVerification, ProfileVerificationStatus, User } from "@/app/lib/types";
import styles from "./KycApprovals.module.css";

type StatusFilter = "ALL" | Uppercase<ProfileVerificationStatus>;

const STATUS_CLASS: Record<Uppercase<ProfileVerificationStatus>, string> = {
  PENDING: "statusPending",
  IN_REVIEW: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
};

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All Statuses" },
  { key: "IN_REVIEW", label: "Pending Review" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

function getUser(verification: OwnerProfileVerification) {
  return typeof verification.user === "string" ? null : verification.user;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: ProfileVerificationStatus) {
  return status === "in_review" ? "PENDING" : status.toUpperCase();
}

const DEFAULT_PAGINATION: AdminKycPagination = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const DEFAULT_STATS: AdminKycStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

const SEARCH_DEBOUNCE_MS = 400;

const statusFilterToApi = (status: StatusFilter): ProfileVerificationStatus | undefined =>
  status === "ALL" ? undefined : (status.toLowerCase() as ProfileVerificationStatus);

export default function KycApprovalsPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<OwnerProfileVerification[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [pagination, setPagination] = useState<AdminKycPagination>(DEFAULT_PAGINATION);
  const [stats, setStats] = useState<AdminKycStats>(DEFAULT_STATS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = Boolean(user?.approvedRoles.includes("admin"));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = search.trim();
      setDebouncedSearch((current) => {
        if (current === nextSearch) return current;
        setPage(1);
        return nextSearch;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return;

    let cancelled = false;
    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      setError("");

      adminApi
        .listProfileVerifications({
          page,
          limit: pagination.limit,
          search: debouncedSearch || undefined,
          status: statusFilterToApi(statusFilter),
        })
        .then((data) => {
          if (!cancelled) {
            setRequests(data.profileVerifications);
            setPagination(data.pagination);
            setStats(data.stats);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(getApiErrorMessage(err, "Could not load KYC approvals"));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [authLoading, debouncedSearch, isAdmin, page, pagination.limit, statusFilter]);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>KYC Approvals</h1>
        <span className={styles.pendingPill}>
          {stats.pending} PENDING / {stats.total} TOTAL
        </span>
      </div>

      <div className={styles.statsGrid}>
        <button
          type="button"
          className={`${styles.statCard} ${statusFilter === "ALL" ? styles.statCardActive : ""}`}
          onClick={() => {
            setStatusFilter("ALL");
            setPage(1);
          }}
        >
          <span className={styles.statLabel}>Total</span>
          <span className={styles.statValue}>{stats.total}</span>
        </button>
        <button
          type="button"
          className={`${styles.statCard} ${statusFilter === "IN_REVIEW" ? styles.statCardActive : ""}`}
          onClick={() => {
            setStatusFilter("IN_REVIEW");
            setPage(1);
          }}
        >
          <span className={styles.statLabel}>Pending</span>
          <span className={styles.statValue}>{stats.pending}</span>
        </button>
        <button
          type="button"
          className={`${styles.statCard} ${statusFilter === "APPROVED" ? styles.statCardActive : ""}`}
          onClick={() => {
            setStatusFilter("APPROVED");
            setPage(1);
          }}
        >
          <span className={styles.statLabel}>Approved</span>
          <span className={styles.statValue}>{stats.approved}</span>
        </button>
        <button
          type="button"
          className={`${styles.statCard} ${statusFilter === "REJECTED" ? styles.statCardActive : ""}`}
          onClick={() => {
            setStatusFilter("REJECTED");
            setPage(1);
          }}
        >
          <span className={styles.statLabel}>Rejected</span>
          <span className={styles.statValue}>{stats.rejected}</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name, phone, PAN, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterWrap}>
          <button
            type="button"
            className={`${styles.filterBtn} ${statusFilter !== "ALL" ? styles.filterBtnActive : ""}`}
            onClick={() => setIsFilterOpen((v) => !v)}
          >
            <span aria-hidden>⚙</span>
            {statusFilter !== "ALL" && <span className={styles.filterDot} aria-hidden />}
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
                  onClick={() => {
                    setStatusFilter(opt.key);
                    setPage(1);
                    setIsFilterOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!authLoading && !isAdmin && (
        <p className={styles.emptyText}>Admin login is required to view KYC approvals.</p>
      )}
      {error && <p className={styles.emptyText}>{error}</p>}
      {loading && isAdmin && <p className={styles.emptyText}>Loading KYC approvals...</p>}

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Firm</th>
                <th>Submitted</th>
                <th>Docs</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => {
                const user = getUser(row) as User | null;
                const status = row.status.toUpperCase() as Uppercase<ProfileVerificationStatus>;
                const initials = (user?.fullName || "?")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2);

                return (
                  <tr key={row._id}>
                    <td>
                      <div className={styles.ownerCell}>
                        <span
                          className={styles.avatar}
                          style={{ background: "linear-gradient(135deg, #22d3ee, #2563eb)" }}
                        >
                          {initials}
                        </span>
                        <span className={styles.ownerName}>{user?.fullName || "-"}</span>
                      </div>
                    </td>
                    <td className={styles.mutedCell}>{row.firmDetails?.name || "-"}</td>
                    <td className={styles.mutedCell}>{formatDate(row.submittedAt)}</td>
                    <td className={styles.mutedCell}>PAN, GST, MSME, EB</td>
                    <td>
                      <span className={`${styles.statusPill} ${styles[STATUS_CLASS[status]]}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className={styles.actionCell}>
                      <Link href={`/admin/kyc/${row._id}`} className={styles.reviewBtn}>
                        Review →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && requests.length === 0 && (
            <p className={styles.emptyText}>No completed KYC submissions found.</p>
          )}
        </div>
      </div>

      <div className={styles.mobileList}>
        {requests.map((row) => {
          const user = getUser(row) as User | null;
          const status = row.status.toUpperCase() as Uppercase<ProfileVerificationStatus>;
          const initials = (user?.fullName || "?")
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2);

          return (
            <Link key={row._id} href={`/admin/kyc/${row._id}`} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <span className={styles.avatar}>{initials}</span>
                <div className="min-w-0">
                  <p className={styles.ownerName}>{user?.fullName || "-"}</p>
                  <p className={styles.mobileMeta}>{row.firmDetails?.name || "-"}</p>
                </div>
              </div>
              <div className={styles.mobileCardBottom}>
                <span className={styles.mobileMeta}>{formatDate(row.submittedAt)}</span>
                <span className={`${styles.statusPill} ${styles[STATUS_CLASS[status]]}`}>
                  {statusLabel(row.status)}
                </span>
              </div>
            </Link>
          );
        })}
        {!loading && requests.length === 0 && (
          <p className={styles.emptyText}>No completed KYC submissions found.</p>
        )}
      </div>

      {isAdmin && !loading && pagination.total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationMeta}>
            Page {pagination.page} of {pagination.pages} · {pagination.total} result
            {pagination.total === 1 ? "" : "s"}
          </span>
          <div className={styles.paginationActions}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
