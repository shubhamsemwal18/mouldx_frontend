"use client";

import { useCallback, useEffect, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./MyMoulds.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";
import { productApi } from "@/app/lib/product-api";
import type { Pagination, ProductListParams } from "@/app/lib/product-api";
import type {
  Product,
  ProductAvailability,
  ProductStatusStats,
} from "@/app/lib/types";
import {
  LISTING_STATUS_LABEL,
  formatMouldSet,
  getListingDisplayStatus,
  getMouldSetCount,
  isUnderMaintenance,
  type ListingDisplayStatus,
} from "./listing-status";

type StatusFilter = "ALL" | ListingDisplayStatus;

const PAGE_SIZE = 10;

const STATUS_CLASS: Record<ListingDisplayStatus, string> = {
  draft: "badgeDraft",
  pending: "badgeRented",
  live: "badgeAvailable",
  maintenance: "badgeMaintenance",
  rejected: "badgeRejected",
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "live", label: "Live" },
  { value: "maintenance", label: "Maintenance" },
  { value: "pending", label: "Pending approval" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
];

/** Each filter maps to the approval status plus, for approved ones, availability. */
const FILTER_PARAMS: Record<StatusFilter, Pick<ProductListParams, "status" | "availability">> = {
  ALL: {},
  live: { status: "approved", availability: "active" },
  maintenance: { status: "approved", availability: "maintenance" },
  pending: { status: "in_review" },
  draft: { status: "draft" },
  rejected: { status: "rejected" },
};

// The owner can only switch between these two. Approval stays with admin.
const AVAILABILITY_OPTIONS: {
  value: ProductAvailability;
  label: string;
  description: string;
  dot: string;
}[] = [
  {
    value: "active",
    label: "Active / Live",
    description: "Visible to users in Explore and open for booking",
    dot: "dotAvailable",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    description: "Hidden from users until you mark it live again",
    dot: "dotMaintenance",
  },
];

const formatPrice = (value?: number) =>
  value === undefined ? "—" : `₹${value.toLocaleString("en-IN")}`;

/* ---------- Status bottom sheet ---------- */

interface StatusSheetProps {
  listing: Product;
  onClose: () => void;
  onSave: (availability: ProductAvailability) => Promise<void>;
}

function StatusSheet({ listing, onClose, onSave }: StatusSheetProps) {
  const current: ProductAvailability = isUnderMaintenance(listing) ? "maintenance" : "active";
  const [availability, setAvailability] = useState<ProductAvailability>(current);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  // Availability is operational only; it never replaces admin approval.
  const canSwitch = listing.status === "approved";

  // Lock the page scroll while the sheet is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Escape closes the confirmation popup first, then the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      if (confirming) {
        setConfirming(false);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, confirming, saving]);

  const unchanged = availability === current;

  const handleSaveClick = () => {
    if (unchanged || saving || !canSwitch) return;
    setError("");
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(availability);
      onClose();
    } catch (err) {
      setConfirming(false);
      setSaving(false);
      setError(getApiErrorMessage(err, "Could not update the status. Please try again."));
    }
  };

  const toMaintenance = availability === "maintenance";

  const confirmTitle = toMaintenance ? "Switch to maintenance?" : "Make this listing live?";

  const confirmText = toMaintenance
    ? `${listing.name} will be hidden from users in Explore and search until you make it live again.`
    : `${listing.name} will be visible to users and open for booking.`;

  const lockedNotice =
    listing.status === "in_review"
      ? "This listing is waiting for admin approval. You can switch it between Live and Maintenance once it is approved."
      : listing.status === "rejected"
        ? "Admin requested changes on this listing. Fix and resubmit it; you can switch it between Live and Maintenance once it is approved."
        : "This listing is still a draft. Submit it for approval; you can switch it between Live and Maintenance once it is approved.";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Update listing status"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetHandle} aria-hidden />

        <h2 className={styles.sheetTitle}>Update status</h2>
        <p className={styles.sheetSub}>
          {listing.name} · {listing.code}
        </p>

        {!canSwitch && <p className={styles.notice}>{lockedNotice}</p>}

        <div className={styles.options} role="radiogroup" aria-label="Status">
          {AVAILABILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={availability === opt.value}
              disabled={!canSwitch || saving}
              className={`${styles.option} ${
                availability === opt.value && canSwitch ? styles.optionActive : ""
              }`}
              onClick={() => setAvailability(opt.value)}
            >
              <span className={`${styles.dot} ${styles[opt.dot]}`} aria-hidden />
              <span className={styles.optionText}>
                <span className={styles.optionLabel}>{opt.label}</span>
                <span className={styles.optionDesc}>{opt.description}</span>
              </span>
              <span
                className={`${styles.radio} ${
                  availability === opt.value && canSwitch ? styles.radioOn : ""
                }`}
                aria-hidden
              />
            </button>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.sheetActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSaveClick}
            disabled={unchanged || saving || !canSwitch}
          >
            Save status
          </button>
        </div>
      </div>

      {/* ---------- Confirmation popup ---------- */}
      {confirming && (
        <div
          className={styles.confirmOverlay}
          onClick={(e) => {
            e.stopPropagation();
            if (!saving) setConfirming(false);
          }}
        >
          <div
            className={styles.confirmBox}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-text"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={`${styles.confirmIcon} ${
                toMaintenance ? styles.confirmIconRed : styles.confirmIconGreen
              }`}
              aria-hidden
            >
              {toMaintenance ? "🔧" : "✓"}
            </span>

            <h3 id="confirm-title" className={styles.confirmTitle}>
              {confirmTitle}
            </h3>
            <p id="confirm-text" className={styles.confirmText}>
              {confirmText}
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setConfirming(false)}
                disabled={saving}
              >
                Go back
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleConfirm}
                disabled={saving}
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  onOpen,
  onEditStatus,
  onDelete,
  deleting,
}: {
  listing: Product;
  onOpen: (id: string) => void;
  onEditStatus: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const displayStatus = getListingDisplayStatus(listing);
  const detailsHref = `/owner/moulds/${listing._id}`;
  const mouldSetCount = getMouldSetCount(listing);
  const categoryLine = [listing.category?.title, listing.subCategory?.title]
    .filter(Boolean)
    .join(" · ");

  // The whole card opens the owner details page, except clicks that land on
  // one of its own links or buttons (Calendar, Status, Edit, Delete).
  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    onOpen(listing._id);
  };

  return (
    <div className={`${styles.card} ${styles.cardClickable}`} onClick={handleCardClick}>
      <div className={styles.cardTop}>
        <ListingImage src={listing.image?.url} alt={listing.name} />

        <div className={styles.cardInfo}>
          <h3 className={styles.mouldName}>
            <Link href={detailsHref} className={styles.mouldNameLink}>
              {listing.name}
            </Link>
          </h3>
          <p className={styles.mouldMeta}>{listing.code}</p>
          {categoryLine && <p className={styles.mouldMeta}>{categoryLine}</p>}
          <p className={styles.mouldLine}>
            <strong>Rent:</strong> {formatPrice(listing.pricing?.perDayCharges)}
            /day
          </p>
          <p className={styles.mouldLine}>
            <strong>{formatMouldSet(mouldSetCount)}</strong>
          </p>
          <span className={`${styles.badge} ${styles[STATUS_CLASS[displayStatus]]}`}>
            {LISTING_STATUS_LABEL[displayStatus]}
          </span>
          {(listing.resubmissionCount ?? 0) > 0 && (
            <p className={styles.mouldMeta}>
              Resubmitted {listing.resubmissionCount}×
            </p>
          )}
        </div>
      </div>

      {listing.status === "rejected" && listing.rejectionReason && (
        <div className={styles.maintenanceInfo}>
          <p className={styles.maintenanceNote}>{listing.rejectionReason}</p>
        </div>
      )}

      {displayStatus === "maintenance" && (
        <div className={styles.maintenanceInfo}>
          <p className={styles.maintenanceNote}>
            Hidden from users while under maintenance.
          </p>
        </div>
      )}

      <hr className={styles.divider} />

      <div className={styles.actionsRow}>
        <Link
          href={`/owner/moulds/${listing._id}/calendar`}
          className={styles.actionBtn}
        >
          <span aria-hidden>📅</span> Calendar
        </Link>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => onEditStatus(listing._id)}
        >
          <span aria-hidden>🔧</span> Status
        </button>
        <Link
          href={`/owner/moulds/new/product?id=${listing._id}`}
          className={styles.actionBtn}
        >
          <span aria-hidden>✎</span> Edit
        </Link>
      </div>

      {listing.status === "draft" && (
        <button
          type="button"
          className={styles.deleteLink}
          onClick={() => onDelete(listing._id)}
          disabled={deleting}
        >
          <span aria-hidden>🗑</span> {deleting ? "Deleting..." : "Delete draft"}
        </button>
      )}
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
  const [statusListingId, setStatusListingId] = useState<string | null>(null);
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
        ...FILTER_PARAMS[statusFilter],
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

  const handleOpen = (id: string) => {
    router.push(`/owner/moulds/${id}`);
  };

  // Errors propagate so the sheet can show them and stay open.
  const handleSaveAvailability = async (availability: ProductAvailability) => {
    if (!statusListingId) return;

    const response = await productApi.updateAvailability(statusListingId, availability);
    const updated = response.data.product;

    setListings((prev) =>
      prev.map((listing) =>
        listing._id === updated._id
          ? {
              ...listing,
              availability: updated.availability,
              availabilityUpdatedAt: updated.availabilityUpdatedAt,
            }
          : listing
      )
    );
    setToast(
      response.message ||
        (availability === "maintenance" ? "Listing is under maintenance" : "Listing is live")
    );
    // Refresh the counts and drop the card if it no longer matches the filter.
    await load();
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
    live: stats?.active ?? stats?.approved ?? 0,
    maintenance: stats?.maintenance ?? 0,
    pending: stats?.in_review ?? 0,
    draft: stats?.draft ?? 0,
    rejected: stats?.rejected ?? 0,
  };

  const statusListing = statusListingId
    ? listings.find((listing) => listing._id === statusListingId) ?? null
    : null;

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
            <FilterIcon size={24} />
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
              onOpen={handleOpen}
              onEditStatus={setStatusListingId}
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

      {statusListing && (
        <StatusSheet
          key={statusListing._id}
          listing={statusListing}
          onClose={() => setStatusListingId(null)}
          onSave={handleSaveAvailability}
        />
      )}

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
