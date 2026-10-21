"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./MyMoulds.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";
import { productApi } from "@/app/lib/product-api";
import type { Pagination } from "@/app/lib/product-api";
import type {
  Product,
  ProductStatus,
  ProductStatusStats,
} from "@/app/lib/types";

type StatusFilter = "ALL" | ProductStatus;

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "DRAFT",
  in_review: "UNDER REVIEW",
  approved: "LIVE",
  rejected: "CHANGES REQUESTED",
};

const STATUS_CLASS: Record<ProductStatus, string> = {
  draft: "badgeDraft",
  in_review: "badgeRented",
  approved: "badgeAvailable",
  rejected: "badgeMaintenance",
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "Under review" },
  { value: "approved", label: "Live" },
  { value: "rejected", label: "Rejected" },
];

const formatPrice = (value?: number) =>
  value === undefined ? "—" : `₹${value.toLocaleString("en-IN")}`;

/* ---------- Listing image with placeholder fallback ---------- */

function ListingImage({ src, alt }: { src?: string | null; alt: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={styles.imageWrap}>
      {src && !imgError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          className={styles.image}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={styles.placeholder} aria-hidden>
          <svg
            viewBox="0 0 24 24"
            width="40"
            height="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
        </div>
      )}
    </div>
  );
}

/* ---------- Listing card ---------- */

function ListingCard({
  listing,
  onDelete,
  deleting,
}: {
  listing: Product;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const canEdit = listing.status === "draft" || listing.status === "rejected";

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <ListingImage src={listing.image?.url} alt={listing.name} />

        <div className={styles.cardInfo}>
          <h3 className={styles.mouldName}>{listing.name}</h3>
          <p className={styles.mouldMeta}>
            {listing.code}
            {listing.category?.title ? ` · ${listing.category.title}` : ""}
          </p>
          <p className={styles.mouldLine}>
            <strong>Rent:</strong> {formatPrice(listing.pricing?.perDayCharges)}
            /day
          </p>
          <p className={styles.mouldMeta}>
            {listing.mouldCount ?? 0} mould
            {(listing.mouldCount ?? 0) === 1 ? "" : "s"}
            {(listing.resubmissionCount ?? 0) > 0
              ? ` · resubmitted ${listing.resubmissionCount}×`
              : ""}
          </p>
          <span
            className={`${styles.badge} ${styles[STATUS_CLASS[listing.status]]}`}
          >
            {STATUS_LABEL[listing.status]}
          </span>
        </div>
      </div>

      {listing.status === "rejected" && listing.rejectionReason && (
        <div className={styles.maintenanceInfo}>
          <p className={styles.maintenanceNote}>{listing.rejectionReason}</p>
        </div>
      )}

      <hr className={styles.divider} />

      <div className={styles.actionsRow}>
        {canEdit ? (
          <Link
            href={`/owner/moulds/new/product?id=${listing._id}`}
            className={styles.actionBtn}
          >
            <span aria-hidden>✎</span>{" "}
            {listing.status === "rejected" ? "Fix & resubmit" : "Edit"}
          </Link>
        ) : (
          <Link
            href={`/owner/moulds/new/product?id=${listing._id}`}
            className={styles.actionBtn}
          >
            <span aria-hidden>👁</span> View
          </Link>
        )}

        {listing.status === "approved" && (
          <Link
            href={`/owner/moulds/${listing._id}/calendar`}
            className={styles.actionBtn}
          >
            <span aria-hidden>📅</span> Calendar
          </Link>
        )}

        {listing.status === "draft" && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onDelete(listing._id)}
            disabled={deleting}
          >
            <span aria-hidden>🗑</span> {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function MyMouldsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [listings, setListings] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<ProductStatusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const isApprovedOwner =
    Boolean(user?.approvedRoles.includes("owner")) &&
    user?.profileVerificationStatus === "approved";

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/owner/moulds")}`);
      return;
    }
    if (!isApprovedOwner) router.replace("/owner/onboarding");
  }, [authLoading, isApprovedOwner, router, user]);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const load = useCallback(async () => {
    if (!isApprovedOwner) return;

    setLoading(true);
    setError("");

    try {
      const data = await productApi.list({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });

      setListings(data.products);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load your listings"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isApprovedOwner, page, statusFilter]);

  // Deferred to a macrotask so the fetch's setState calls do not run
  // synchronously inside the effect.
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      await productApi.remove(id);
      setToast("Draft deleted");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete the draft"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const clearAll = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
  };

  const goToPage = (next: number) => {
    setPage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const counts: Record<StatusFilter, number> = {
    ALL: stats?.total ?? 0,
    draft: stats?.draft ?? 0,
    in_review: stats?.in_review ?? 0,
    approved: stats?.approved ?? 0,
    rejected: stats?.rejected ?? 0,
  };

  const activeFilterCount = statusFilter !== "ALL" ? 1 : 0;
  const isFiltering = debouncedSearch !== "" || activeFilterCount > 0;
  const totalPages = pagination?.pages ?? 1;
  const startIndex = ((pagination?.page ?? 1) - 1) * PAGE_SIZE;

  if (authLoading || !isApprovedOwner) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>My Products</h1>

        <div className={styles.searchRow}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon} aria-hidden>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
              aria-label="Search listings"
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            className={`${styles.filterBtn} ${
              isFilterOpen || activeFilterCount > 0
                ? styles.filterBtnActive
                : ""
            }`}
            onClick={() => setIsFilterOpen((v) => !v)}
            aria-expanded={isFilterOpen}
            aria-label="Filter listings"
          >
            <button className="filter-btn" aria-label="Filter">
              <FilterIcon size={24} />
            </button>
            {activeFilterCount > 0 && (
              <span className={styles.filterCount}>{activeFilterCount}</span>
            )}
          </button>
        </div>

        {isFilterOpen && (
          <div className={styles.filterPanel}>
            <p className={styles.filterLabel}>Status</p>
            <div className={styles.chipsRow}>
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(opt.value)}
                  className={`${styles.chip} ${statusFilter === opt.value ? styles.chipActive : ""}`}
                >
                  {opt.label}
                  <span className={styles.chipCount}>{counts[opt.value]}</span>
                </button>
              ))}
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                className={styles.clearFilters}
                onClick={() => handleStatusFilterChange("ALL")}
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        <Link
          href="/owner/moulds/new/product"
          className={`${styles.addBtn} btn-primary`}
        >
          + Add New Listing
        </Link>

        {error && <p className={styles.errorText}>{error}</p>}

        {isFiltering && pagination && (
          <p className={styles.resultsText}>
            {pagination.total} listing{pagination.total === 1 ? "" : "s"} found
          </p>
        )}

        <div className={styles.list}>
          {loading && listings.length === 0 && (
            <div className={styles.emptyBox}>
              <p className={styles.emptyText}>Loading your listings...</p>
            </div>
          )}

          {listings.map((listing) => (
            <ListingCard
              key={listing._id}
              listing={listing}
              onDelete={handleDelete}
              deleting={deletingId === listing._id}
            />
          ))}

          {!loading && listings.length === 0 && (
            <div className={styles.emptyBox}>
              <p className={styles.emptyText}>
                {isFiltering
                  ? "No listings match your search or filter."
                  : "You have not created any listings yet."}
              </p>
              {isFiltering && (
                <button
                  type="button"
                  className={styles.clearFilters}
                  onClick={clearAll}
                >
                  Clear search &amp; filter
                </button>
              )}
            </div>
          )}
        </div>

        {totalPages > 1 && pagination && (
          <nav className={styles.pagination} aria-label="Listings pagination">
            <p className={styles.paginationInfo}>
              Showing {startIndex + 1}–{startIndex + listings.length} of{" "}
              {pagination.total}
            </p>

            <div className={styles.paginationControls}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => goToPage(pagination.page - 1)}
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
                onClick={() => goToPage(pagination.page + 1)}
                disabled={!pagination.hasNextPage || loading}
              >
                Next →
              </button>
            </div>
          </nav>
        )}
      </div>

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
