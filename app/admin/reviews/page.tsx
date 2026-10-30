"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, Search, Trash2, X } from "lucide-react";
import { adminApi, type AdminKycPagination, type AdminReview, type AdminReviewMedia, type AdminReviewStats } from "@/app/lib/admin-api";
import { getApiErrorMessage } from "@/app/lib/api";
import styles from "./Reviews.module.css";

type TypeFilter = "ALL" | "product" | "customer";

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "product", label: "By Users" },
  { key: "customer", label: "By Hosts" },
];

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
const DEFAULT_STATS: AdminReviewStats = { total: 0, product: 0, customer: 0, average: 0 };

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    .format(new Date(value));
}

function gradientFor(id: string) {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}

const isHostReview = (review: AdminReview) => review.type === "customer";
const roleLabel = (review: AdminReview) => (isHostReview(review) ? "Host" : "User");
const subjectLine = (review: AdminReview) => isHostReview(review)
  ? `About customer ${review.subject.name || "—"}`
  : `${review.product?.code || ""}${review.product?.name ? ` · ${review.product.name}` : ""}`;

function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  return (
    <span className={`${styles.stars} ${size === "lg" ? styles.starsLg : ""}`} aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden className={i < value ? styles.starFilled : styles.starEmpty}>
          ★
        </span>
      ))}
      <span className={styles.starValue}>{value.toFixed(1)}</span>
    </span>
  );
}

function TypePill({ review }: { review: AdminReview }) {
  return (
    <span className={`${styles.typePill} ${isHostReview(review) ? styles.typeOwner : styles.typeCustomer}`}>
      {roleLabel(review)}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminKycPagination>(DEFAULT_PAGINATION);
  const [stats, setStats] = useState<AdminReviewStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewReview, setViewReview] = useState<AdminReview | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [activeMedia, setActiveMedia] = useState<AdminReviewMedia | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminReview | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      const data = await adminApi.listReviews({
        search: debouncedSearch || undefined,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        page,
        limit: PAGE_SIZE,
      });
      if (request !== requestId.current) return;
      if (data.reviews.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }
      setReviews(data.reviews);
      setPagination(data.pagination);
      setStats(data.stats);
      setError("");
    } catch (err) {
      if (request === requestId.current) setError(getApiErrorMessage(err, "Could not load reviews"));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, page, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openReview = async (review: AdminReview) => {
    setViewReview(review);
    setViewLoading(true);
    try {
      const full = await adminApi.getReview(review._id);
      setViewReview((current) => (current?._id === review._id ? full : current));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load the review"));
      setViewReview(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminApi.deleteReview(confirmDelete._id);
      setNotice(`The review by ${confirmDelete.reviewer.name} was deleted permanently.`);
      setConfirmDelete(null);
      setViewReview(null);
      await load();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Could not delete the review"));
    } finally {
      setDeleting(false);
    }
  };

  const askDelete = (review: AdminReview) => {
    setDeleteError("");
    setConfirmDelete(review);
  };

  const media = viewReview?.product
    ? [...(viewReview.product.media ?? []), ...(viewReview.product.moulds ?? []).flatMap((m) => m.media)]
    : [];
  const initial = (name: string) => (name || "?").charAt(0).toUpperCase();
  const emptyMessage = debouncedSearch || typeFilter !== "ALL" ? "No reviews match your filters." : "No reviews yet.";

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Reviews</h1>
          <p className={styles.subtitle}>
            Ratings &amp; feedback from users and hosts{stats.total ? ` · average ${stats.average.toFixed(1)} ★` : ""}.
          </p>
        </div>
        <span className={styles.countPill}>{stats.total} TOTAL</span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            <Search size={17} />
          </span>
          <input
            type="text"
            placeholder="Search by reviewer, mould ID, booking, comment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Search reviews"
          />
        </div>

        <div className={styles.tabs} role="group" aria-label="Reviewer type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={typeFilter === f.key}
              onClick={() => { setTypeFilter(f.key); setPage(1); }}
              className={`${styles.tabBtn} ${typeFilter === f.key ? styles.tabBtnActive : ""}`}
            >
              {f.label} ({f.key === "ALL" ? stats.total : stats[f.key]})
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
                <th>Reviewer</th>
                <th>Type</th>
                <th>Mould</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r._id}>
                  <td>
                    <div className={styles.reviewerCell}>
                      <span className={styles.avatar} style={{ background: gradientFor(r._id) }}>
                        {initial(r.reviewer.name)}
                      </span>
                      <span className={styles.reviewerName}>{r.reviewer.name}</span>
                    </div>
                  </td>
                  <td><TypePill review={r} /></td>
                  <td className={styles.mouldCell}>
                    {r.product?.code || "—"}
                    <span className={styles.subMeta}>
                      {isHostReview(r) ? `Customer: ${r.subject.name || "—"}` : r.product?.name || ""}
                    </span>
                  </td>
                  <td><StarRating value={r.rating} /></td>
                  <td className={styles.reviewSnippetCell}>{r.comment}</td>
                  <td className={styles.mutedCell}>{formatDate(r.createdAt)}</td>
                  <td className={styles.actionCell}>
                    <button type="button" onClick={() => openReview(r)} className={styles.iconBtn} aria-label="View review" title="View review">
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => askDelete(r)}
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      aria-label="Delete review"
                      title="Delete review"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && reviews.length === 0 && <p className={styles.emptyText}>Loading reviews…</p>}
          {!loading && reviews.length === 0 && <p className={styles.emptyText}>{emptyMessage}</p>}
        </div>
      </div>

      <div className={styles.mobileList}>
        {reviews.map((r) => (
          <div key={r._id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <span className={styles.avatar} style={{ background: gradientFor(r._id) }}>
                {initial(r.reviewer.name)}
              </span>
              <div className={styles.mobileCardInfo}>
                <p className={styles.reviewerName}>{r.reviewer.name}</p>
                <p className={styles.mobileMeta}>{subjectLine(r)}</p>
              </div>
              <TypePill review={r} />
            </div>

            <div className={styles.mobileCardRow}>
              <StarRating value={r.rating} />
              <span className={styles.mobileMeta}>{formatDate(r.createdAt)}</span>
            </div>

            <p className={styles.mobileReviewText}>{r.comment}</p>

            <div className={styles.mobileCardBottom}>
              <button type="button" onClick={() => openReview(r)} className={styles.mobileActionBtn}>
                <Eye size={16} /> View
              </button>
              <button
                type="button"
                onClick={() => askDelete(r)}
                className={`${styles.mobileActionBtn} ${styles.mobileActionBtnDanger}`}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        ))}

        {loading && reviews.length === 0 && <p className={styles.emptyText}>Loading reviews…</p>}
        {!loading && reviews.length === 0 && <p className={styles.emptyText}>{emptyMessage}</p>}
      </div>

      {pagination.total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationMeta}>
            Page {pagination.page} of {pagination.pages} · {pagination.total} review{pagination.total === 1 ? "" : "s"}
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

      {viewReview && (
        <div className={styles.detailOverlay} onClick={() => setViewReview(null)}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button type="button" onClick={() => setViewReview(null)} aria-label="Close" className={styles.closeBtn}>
              <X size={16} />
            </button>

            <div className={styles.detailLayout}>
              <div className={styles.mediaCol}>
                <p className={styles.eyebrow}>Mould</p>
                <h2 className={styles.mouldTitle}>
                  {viewReview.product ? `${viewReview.product.code} · ${viewReview.product.name}` : "Listing unavailable"}
                </h2>

                {viewLoading && <p className={styles.mobileMeta}>Loading media…</p>}
                {!viewLoading && media.length === 0 && <p className={styles.mobileMeta}>No media for this booking.</p>}
                <div className={styles.mediaGrid}>
                  {media.map((item, i) => (
                    <button key={`${item.url}-${i}`} type="button" className={styles.mediaThumb} onClick={() => setActiveMedia(item)}>
                      {item.kind === "video" ? (
                        <video src={item.url} className={styles.mediaThumbImg} muted preload="metadata" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.url} alt="Booked mould" className={styles.mediaThumbImg} />
                      )}
                      {item.kind === "video" && <span className={styles.playIcon} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.reviewCol}>
                <div className={styles.reviewerRow}>
                  <span className={styles.modalAvatar} style={{ background: gradientFor(viewReview._id) }}>
                    {initial(viewReview.reviewer.name)}
                  </span>
                  <div>
                    <p className={styles.reviewerNameLg}>{viewReview.reviewer.name}</p>
                    <TypePill review={viewReview} />
                  </div>
                </div>

                <StarRating value={viewReview.rating} size="lg" />

                <p className={styles.reviewFullText}>{viewReview.comment}</p>

                {viewReview.reply && (
                  <div className={styles.replyBox}>
                    <p className={styles.eyebrow}>Host reply</p>
                    <p className={styles.replyText}>{viewReview.reply.comment}</p>
                  </div>
                )}

                <p className={styles.reviewMeta}>
                  {isHostReview(viewReview)
                    ? `Host ${viewReview.host.name || "—"} reviewed customer ${viewReview.customer.name || "—"}`
                    : `Customer ${viewReview.customer.name || "—"} reviewed host ${viewReview.host.name || "—"}`}
                </p>
                <p className={styles.reviewMeta}>
                  {viewReview.booking ? `Booking ${viewReview.booking.code} · ` : ""}
                  {formatDate(viewReview.createdAt)}
                </p>

                <button
                  type="button"
                  onClick={() => askDelete(viewReview)}
                  className={styles.deletePanelBtn}
                >
                  <Trash2 size={16} /> Delete This Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMedia && (
        <div className={styles.lightboxOverlay} onClick={() => setActiveMedia(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setActiveMedia(null)} className={styles.lightboxCloseBtn} aria-label="Close preview">
              <X size={16} />
            </button>
            {activeMedia.kind === "video" ? (
              <video src={activeMedia.url} className={styles.lightboxImage} controls autoPlay />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={activeMedia.url} alt="Booked mould" className={styles.lightboxImage} />
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => !deleting && setConfirmDelete(null)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.confirmIcon}><AlertTriangle size={26} /></div>
            <h3 className={styles.confirmTitle}>Delete this review?</h3>
            <p className={styles.confirmText}>
              This will permanently remove the review by <strong>{confirmDelete.reviewer.name}</strong>
              {confirmDelete.booking ? <> for booking <strong>{confirmDelete.booking.code}</strong></> : null}
              {confirmDelete.reply ? ", including the host's reply" : ""}. Ratings update immediately. This cannot be undone.
            </p>
            {deleteError && <p className={styles.errorText} role="alert">{deleteError}</p>}
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmDelete(null)} disabled={deleting} className={styles.confirmCancelBtn}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting} className={styles.confirmDeleteBtn}>
                {deleting ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}