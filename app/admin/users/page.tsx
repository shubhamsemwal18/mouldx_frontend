"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Eye, Search, Trash2 } from "lucide-react";
import { adminApi, type AdminKycPagination, type AdminUserRow } from "@/app/lib/admin-api";
import { getApiErrorMessage } from "@/app/lib/api";
import styles from "./UserManagement.module.css";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #22d3ee, #2563eb)",
  "linear-gradient(135deg, #34d399, #059669)",
  "linear-gradient(135deg, #818cf8, #7c3aed)",
  "linear-gradient(135deg, #f59e0b, #d97706)",
];

const DEFAULT_PAGINATION: AdminKycPagination = {
  page: 1, limit: PAGE_SIZE, total: 0, pages: 1, hasNextPage: false, hasPrevPage: false,
};

/** Today in India as YYYY-MM-DD, matching the API's reporting timezone. */
const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    .format(new Date(value));
}

function gradientFor(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}

function activityText(user: AdminUserRow) {
  const parts = [`${user.counts.bookings} booking${user.counts.bookings === 1 ? "" : "s"}`];
  if (user.isHost) parts.unshift(`${user.counts.listings} listing${user.counts.listings === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminKycPagination>(DEFAULT_PAGINATION);
  const [stats, setStats] = useState({ total: 0, hosts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserRow | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch((current) => {
        if (current === next) return current;
        setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    try {
      const data = await adminApi.listUsers({ search: debouncedSearch || undefined, page, limit: PAGE_SIZE });
      if (request !== requestId.current) return;
      setUsers(data.users);
      setPagination(data.pagination);
      setStats(data.stats);
      setError("");
    } catch (err) {
      if (request === requestId.current) setError(getApiErrorMessage(err, "Could not load users"));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleDownloadCsv = async () => {
    if (!range.from || !range.to) {
      setError("Select both a start and an end date to download users.");
      return;
    }
    if (range.to < range.from) {
      setError("End date must be on or after the start date.");
      return;
    }
    setExporting(true);
    setError("");
    try {
      await adminApi.downloadUsersCsv(range.from, range.to);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not download users"));
    } finally {
      setExporting(false);
    }
  };

  // Deletion is intentionally not wired yet; the dialog only explains that.
  const handleDelete = () => {
    setNotice(`User deletion is not available yet. ${confirmDelete?.fullName ?? "This user"} was not changed.`);
    setConfirmDelete(null);
  };

  const view = (id: string) => router.push(`/admin/users/${id}`);
  const initials = (name: string) => name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.subtitle}>Approved users, hosts and their activity.</p>
        </div>
        <div className={styles.statGroup}>
          <span className={styles.countPill}>
            <strong>{stats.total.toLocaleString("en-IN")}</strong> Approved
          </span>
          <span className={`${styles.countPill} ${styles.countPillHost}`}>
            <strong>{stats.hosts.toLocaleString("en-IN")}</strong> Hosts
          </span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            <Search size={17} />
          </span>
          <input
            type="text"
            placeholder="Search by name, phone, email, firm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Search users"
          />
        </div>

        <div className={styles.dateRangeGroup} title="Users who joined in this date range">
          <input
            type="date"
            aria-label="Joined from"
            className={styles.dateInput}
            value={range.from}
            max={range.to || todayInIndia()}
            onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
          />
          <span className={styles.dateSep}>→</span>
          <input
            type="date"
            aria-label="Joined to"
            className={styles.dateInput}
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>

        <button
          type="button"
          className={styles.downloadBtn}
          onClick={handleDownloadCsv}
          disabled={!range.from || !range.to || exporting}
          title="Approved users who joined in the selected dates, with complete KYC and activity history"
        >
          <Download size={16} aria-hidden /> {exporting ? "Preparing…" : "Download CSV"}
        </button>
      </div>

      {notice && <p className={styles.noticeText} role="status">{notice}</p>}
      {error && <p className={styles.errorText} role="alert">{error}</p>}

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Activity</th>
                <th>KYC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.avatar} style={{ background: gradientFor(u._id) }}>
                        {initials(u.fullName)}
                      </span>
                      <span className={styles.userInfo}>
                        <span className={styles.userName}>{u.fullName}</span>
                        <span className={styles.subMeta}>{u.firmName || u.phone}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.rolePill} ${u.isHost ? styles.roleHost : styles.roleUser}`}>
                      {u.isHost ? "Host" : "User"}
                    </span>
                  </td>
                  <td className={styles.mutedCell}>{formatDate(u.createdAt)}</td>
                  <td className={styles.mutedCell}>{activityText(u)}</td>
                  <td>
                    <span className={`${styles.kycPill} ${styles.kycVerified}`}>VERIFIED</span>
                  </td>
                  <td className={styles.actionCell}>
                    <div className={styles.actionGroup}>
                      <button type="button" onClick={() => view(u._id)} className={styles.eyeBtn} aria-label={`View ${u.fullName}`} title="View user">
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(u)}
                        className={`${styles.eyeBtn} ${styles.deleteBtn}`}
                        aria-label={`Delete ${u.fullName}`}
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && users.length === 0 && <p className={styles.emptyText}>Loading users…</p>}
          {!loading && users.length === 0 && (
            <p className={styles.emptyText}>{debouncedSearch ? "No users match your search." : "No approved users yet."}</p>
          )}
        </div>
      </div>

      <div className={styles.mobileList}>
        {users.map((u) => (
          <div key={u._id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <span className={styles.avatar} style={{ background: gradientFor(u._id) }}>
                {initials(u.fullName)}
              </span>
              <div className={styles.mobileInfo}>
                <span className={styles.userName}>{u.fullName}</span>
                <span className={styles.mobileMeta}>
                  {u.isHost ? "Host" : "User"} · {formatDate(u.createdAt)}
                </span>
              </div>
              <span className={`${styles.kycPill} ${styles.kycVerified}`}>VERIFIED</span>
            </div>
            <div className={styles.mobileCardBottom}>
              <span className={styles.mobileMeta}>{activityText(u)}</span>
              <div className={styles.actionGroup}>
                <button type="button" onClick={() => view(u._id)} className={styles.eyeBtn} aria-label={`View ${u.fullName}`}>
                  <Eye size={16} /> View
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(u)}
                  className={`${styles.eyeBtn} ${styles.deleteBtn}`}
                  aria-label={`Delete ${u.fullName}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {loading && users.length === 0 && <p className={styles.emptyText}>Loading users…</p>}
        {!loading && users.length === 0 && (
          <p className={styles.emptyText}>{debouncedSearch ? "No users match your search." : "No approved users yet."}</p>
        )}
      </div>

      {pagination.total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationMeta}>
            Page {pagination.page} of {pagination.pages} · {pagination.total} user{pagination.total === 1 ? "" : "s"}
          </span>
          <div className={styles.paginationActions}>
            <button type="button" className={styles.pageBtn} disabled={!pagination.hasPrevPage || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft size={15} /> Previous
            </button>
            <button type="button" className={styles.pageBtn} disabled={!pagination.hasNextPage || loading}
              onClick={() => setPage((current) => current + 1)}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.confirmIcon}><AlertTriangle size={26} /></div>
            <h3 className={styles.confirmTitle}>Delete this user?</h3>
            <p className={styles.confirmText}>
              Deleting <strong>{confirmDelete.fullName}</strong> is not available yet. This action is a placeholder and
              will not change any data.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmDelete(null)} className={styles.confirmCancelBtn}>
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