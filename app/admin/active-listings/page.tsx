"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminKycPagination, type AdminListingRow } from "@/app/lib/admin-api";
import { getApiErrorMessage } from "@/app/lib/api";
import type { ProductAvailability, User } from "@/app/lib/types";
import styles from "./ApprovedListings.module.css";

type StatusFilter = "ALL" | "ACTIVE" | "MAINTENANCE";

const STATUS_FILTERS: { key: StatusFilter; label: string; availability?: ProductAvailability }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active", availability: "active" },
  { key: "MAINTENANCE", label: "Maintenance", availability: "maintenance" },
];

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const DEFAULT_PAGINATION: AdminKycPagination = {
  page: 1, limit: PAGE_SIZE, total: 0, pages: 1, hasNextPage: false, hasPrevPage: false,
};

function ownerOf(listing: AdminListingRow) {
  return typeof listing.owner === "object" ? (listing.owner as User) : null;
}

function availabilityOf(listing: AdminListingRow): ProductAvailability {
  return listing.availability === "maintenance" ? "maintenance" : "active";
}

function formatPrice(value?: number) {
  return typeof value === "number" ? `₹${value.toLocaleString("en-IN")}` : "—";
}

function StatusPill({ listing }: { listing: AdminListingRow }) {
  const maintenance = availabilityOf(listing) === "maintenance";
  return (
    <span
      className={`${styles.statusPill} ${maintenance ? styles.statusMaintenance : styles.statusActive}`}
      title={maintenance && listing.maintenanceByRole ? `Maintenance set by ${listing.maintenanceByRole}` : undefined}
    >
      {maintenance ? "MAINTENANCE" : "ACTIVE"}
    </span>
  );
}

function StarRating({ rating }: { rating?: { average: number; count: number } }) {
  if (!rating?.count) return <span className={styles.mutedCell}>No ratings</span>;
  return (
    <span className={styles.rating} title={`${rating.count} review${rating.count === 1 ? "" : "s"}`}>
      <span aria-hidden>★</span>
      <span className={styles.ratingValue}>{rating.average.toFixed(1)}</span>
      <span className={styles.subMetaInline}>({rating.count})</span>
    </span>
  );
}

export default function ActiveListingsPage() {
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminKycPagination>(DEFAULT_PAGINATION);
  const [counts, setCounts] = useState({ total: 0, active: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminListingRow | null>(null);
  const [deleteError, setDeleteError] = useState("");
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
      const data = await adminApi.listProducts({
        status: "approved",
        availability: STATUS_FILTERS.find((f) => f.key === statusFilter)?.availability,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      });
      if (request !== requestId.current) return;
      // A deletion can leave the current page empty; step back instead of showing nothing.
      if (data.products.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }
      setListings(data.products as AdminListingRow[]);
      setPagination(data.pagination);
      setCounts({ total: data.stats.approved || 0, active: data.stats.active || 0, maintenance: data.stats.maintenance || 0 });
      setError("");
    } catch (err) {
      if (request === requestId.current) setError(getApiErrorMessage(err, "Could not load active listings"));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const toggleMaintenance = async (listing: AdminListingRow) => {
    if (busyId) return;
    const next: ProductAvailability = availabilityOf(listing) === "maintenance" ? "active" : "maintenance";
    setBusyId(listing._id);
    setError("");
    setNotice("");
    try {
      await adminApi.updateProductAvailability(listing._id, next);
      setNotice(`${listing.code} ${next === "maintenance" ? "is now under maintenance. New bookings are paused." : "is active again and open for booking."}`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update availability"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || busyId) return;
    setBusyId(confirmDelete._id);
    setDeleteError("");
    try {
      await adminApi.deleteProduct(confirmDelete._id);
      setNotice(`${confirmDelete.code} was deleted permanently.`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Could not delete the listing"));
    } finally {
      setBusyId(null);
    }
  };

  const actions = (row: AdminListingRow) => {
    const maintenance = availabilityOf(row) === "maintenance";
    const busy = busyId === row._id;
    return (
      <>
        <Link href={`/admin/listings/${row._id}`} className={styles.viewBtn}>
          View
        </Link>
        <button
          type="button"
          onClick={() => toggleMaintenance(row)}
          disabled={Boolean(busyId)}
          className={maintenance ? styles.activateBtn : styles.archiveBtn}
          title={maintenance ? "Re-open this listing for bookings" : "Pause new bookings; the listing stays visible"}
        >
          {busy ? "Saving…" : maintenance ? "Set Active" : "Maintenance"}
        </button>
        <button
          type="button"
          onClick={() => { setDeleteError(""); setConfirmDelete(row); }}
          disabled={Boolean(busyId)}
          className={styles.deleteBtn}
        >
          Delete
        </button>
      </>
    );
  };

  const emptyMessage = debouncedSearch || statusFilter !== "ALL" ? "No listings match your filters." : "No approved listings yet.";

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Active Listings</h1>
        <span className={styles.countPill}>
          {counts.active} ACTIVE · {counts.maintenance} MAINTENANCE
        </span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by mould ID, name, host..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Search listings"
          />
        </div>

        <div className={styles.tabs} role="group" aria-label="Listing status">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={statusFilter === s.key}
              onClick={() => { setStatusFilter(s.key); setPage(1); }}
              className={`${styles.tabBtn} ${statusFilter === s.key ? styles.tabBtnActive : ""}`}
            >
              {s.label} ({s.key === "ALL" ? counts.total : s.key === "ACTIVE" ? counts.active : counts.maintenance})
            </button>
          ))}
        </div>
      </div>

      {notice && <p className={styles.noticeText} role="status">{notice}</p>}
      {error && <p className={styles.errorText} role="alert">{error}</p>}

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Listing</th>
                <th>Host</th>
                <th>Price/Day</th>
                <th>Bookings</th>
                <th>Rating</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listings.map((row) => {
                const owner = ownerOf(row);
                return (
                  <tr key={row._id}>
                    <td className={styles.listingCell}>
                      <span className={styles.idCell}>{row.code}</span>
                      <span className={styles.subMeta}>{row.name}{row.category?.title ? ` · ${row.category.title}` : ""}</span>
                    </td>
                    <td className={styles.mutedCell}>
                      {owner?.fullName || "—"}
                      <span className={styles.subMeta}>{owner?.phone || owner?.email || ""}</span>
                    </td>
                    <td className={styles.priceCell}>{formatPrice(row.pricing?.perDayCharges)}</td>
                    <td className={styles.mutedCell}>{row.bookingCount ?? 0}</td>
                    <td><StarRating rating={row.rating} /></td>
                    <td><StatusPill listing={row} /></td>
                    <td className={styles.actionCell}>
                      <div className={styles.actionGroup}>{actions(row)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && listings.length === 0 && <p className={styles.emptyText}>Loading listings…</p>}
          {!loading && listings.length === 0 && <p className={styles.emptyText}>{emptyMessage}</p>}
        </div>
      </div>

      <div className={styles.mobileList}>
        {listings.map((row) => {
          const owner = ownerOf(row);
          return (
            <div key={row._id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardInfo}>
                  <p className={styles.idCell}>{row.code}</p>
                  <p className={styles.mobileMeta}>{row.name}</p>
                </div>
                <StatusPill listing={row} />
              </div>

              <div className={styles.mobileCardRow}>
                <span className={styles.mobileMeta}>{owner?.fullName || "—"}</span>
                <StarRating rating={row.rating} />
              </div>

              <div className={styles.mobileCardRow}>
                <span className={styles.priceCell}>{formatPrice(row.pricing?.perDayCharges)}/day</span>
                <span className={styles.mobileMeta}>{row.bookingCount ?? 0} bookings</span>
              </div>

              <div className={styles.mobileCardBottom}>{actions(row)}</div>
            </div>
          );
        })}

        {loading && listings.length === 0 && <p className={styles.emptyText}>Loading listings…</p>}
        {!loading && listings.length === 0 && <p className={styles.emptyText}>{emptyMessage}</p>}
      </div>

      {pagination.total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationMeta}>
            Page {pagination.page} of {pagination.pages} · {pagination.total} listing{pagination.total === 1 ? "" : "s"}
          </span>
          <div className={styles.paginationActions}>
            <button type="button" className={styles.pageBtn} disabled={!pagination.hasPrevPage || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <button type="button" className={styles.pageBtn} disabled={!pagination.hasNextPage || loading}
              onClick={() => setPage((current) => current + 1)}>
              Next
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className={styles.overlay} onClick={() => !busyId && setConfirmDelete(null)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
            aria-labelledby="delete-listing-title">
            <div className={styles.confirmIcon}>⚠</div>
            <h3 id="delete-listing-title" className={styles.confirmTitle}>Delete this listing?</h3>
            <p className={styles.confirmText}>
              This will permanently remove <strong>{confirmDelete.code}</strong> ({confirmDelete.name}) and its moulds from the
              platform. Past bookings and reviews keep their own records. Listings with pending, active or upcoming bookings
              cannot be deleted — set them to maintenance instead. This cannot be undone.
            </p>
            {deleteError && <p className={styles.errorText} role="alert">{deleteError}</p>}
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmDelete(null)} disabled={Boolean(busyId)} className={styles.confirmCancelBtn}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={Boolean(busyId)} className={styles.confirmDeleteBtn}>
                {busyId ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
