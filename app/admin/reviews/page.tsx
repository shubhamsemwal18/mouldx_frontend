"use client";

import { useMemo, useState } from "react";
import styles from "./Reviews.module.css";

type ReviewerType = "CUSTOMER" | "OWNER";
type TypeFilter = ReviewerType | "ALL";

interface MediaItem {
  type: "photo" | "video";
  label: string;
  previewUrl: string;
  duration?: string;
}

interface MouldInfo {
  mouldId: string;
  mouldName: string;
  media: MediaItem[];
}

interface Review {
  id: string;
  reviewerType: ReviewerType;
  reviewerName: string;
  bookingId: string;
  rating: number; // 1-5
  reviewText: string;
  createdDateISO: string;
  initial: string;
  gradient: string;
  mould: MouldInfo; // which mould this review is about
}

// TEMP dummy data — real reviews + listing API se aayega
const INITIAL_REVIEWS: Review[] = [
  {
    id: "1",
    reviewerType: "CUSTOMER",
    reviewerName: "Rohit Sharma",
    bookingId: "BK-24581",
    rating: 5,
    reviewText:
      "Mould was exactly as described — clean, well-maintained and the host helped with setup over a call. Cycle time matched what was listed. Would rent again for our next PET cap run.",
    createdDateISO: "2026-09-16",
    initial: "R",
    gradient: "linear-gradient(135deg, #22d3ee, #2563eb)",
    mould: {
      mouldId: "MX-000123",
      mouldName: "2-Cavity Injection Mould",
      media: [
        { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1a/900/600" },
        { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1b/900/600" },
        { type: "video", label: "Video", previewUrl: "https://picsum.photos/seed/mx1c/900/600", duration: "0:42" },
      ],
    },
  },
  {
    id: "2",
    reviewerType: "OWNER",
    reviewerName: "Sharma Industries",
    bookingId: "BK-24581",
    rating: 4,
    reviewText:
      "Returned in good condition, minor cleaning needed on the cooling channels. User communicated delays in advance which we appreciated. Would rent to them again.",
    createdDateISO: "2026-09-17",
    initial: "S",
    gradient: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    mould: {
      mouldId: "MX-000123",
      mouldName: "2-Cavity Injection Mould",
      media: [
        { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1a/900/600" },
        { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1b/900/600" },
         { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1b/900/600" },
      ],
    },
  },
  {
    id: "3",
    reviewerType: "CUSTOMER",
    reviewerName: "Neha Kapoor",
    bookingId: "BK-24602",
    rating: 3,
    reviewText:
      "Mould worked fine but dispatch was delayed by a day from what was confirmed in the booking. Host was responsive once we followed up. Product quality was okay overall.",
    createdDateISO: "2026-09-14",
    initial: "N",
    gradient: "linear-gradient(135deg, #34d399, #059669)",
    mould: {
      mouldId: "MX-000198",
      mouldName: "5L Can Blow Mould",
      media: [
       { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1b/900/600" },
        { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx2b/900/600" },
         { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1a/900/600" },
      ],
    },
  },
  {
    id: "4",
    reviewerType: "CUSTOMER",
    reviewerName: "Vikram Rao",
    bookingId: "BK-24102",
    rating: 2,
    reviewText:
      "Mould had a hairline crack near the gate that wasn't mentioned in the listing — affected our first batch. Raised a damage/quality concern with support; waiting on resolution.",
    createdDateISO: "2026-09-10",
    initial: "V",
    gradient: "linear-gradient(135deg, #818cf8, #7c3aed)",
    mould: {
      mouldId: "MX-000077",
      mouldName: "Die-Cast Enclosure Housing",
      media: [
        { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1b/900/600" },
        { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx2b/900/600" },
         { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1a/900/600" },
      ],
    },
  },
  {
    id: "5",
    reviewerType: "OWNER",
    reviewerName: "Nova Plastics",
    bookingId: "BK-24602",
    rating: 5,
    reviewText:
      "Smooth rental, mould came back on time and in the same condition it was sent. Clear communication throughout. Happy to work with this user again.",
    createdDateISO: "2026-09-15",
    initial: "N",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    mould: {
      mouldId: "MX-000198",
      mouldName: "5L Can Blow Mould",
      media: [  { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1b/900/600" },
        { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx2b/900/600" },
         { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1a/900/600" },],
    },
  },
];

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CUSTOMER", label: "User" },
  { key: "OWNER", label: "Host" },
];

function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  return (
    <span className={`${styles.stars} ${size === "lg" ? styles.starsLg : ""}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden className={i < value ? styles.starFilled : styles.starEmpty}>
          ★
        </span>
      ))}
      <span className={styles.starValue}>{value.toFixed(1)}</span>
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        r.reviewerName.toLowerCase().includes(q) ||
        r.mould.mouldId.toLowerCase().includes(q) ||
        r.mould.mouldName.toLowerCase().includes(q) ||
        r.bookingId.toLowerCase().includes(q);

      const matchesType = typeFilter === "ALL" || r.reviewerType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [reviews, search, typeFilter]);

  const customerCount = reviews.filter((r) => r.reviewerType === "CUSTOMER").length;
  const ownerCount = reviews.filter((r) => r.reviewerType === "OWNER").length;

  const handleDelete = (id: string) => {
    // TODO: call delete-review API
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
    setViewReview(null);
  };

  const reviewToDelete = reviews.find((r) => r.id === confirmDeleteId);

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Reviews</h1>
          <p className={styles.subtitle}>Ratings &amp; feedback from users and hosts.</p>
        </div>
        <span className={styles.countPill}>{reviews.length} TOTAL</span>
      </div>

      {/* ---------- Search + Type filter ---------- */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by reviewer, mould ID, booking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.tabs}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`${styles.tabBtn} ${typeFilter === f.key ? styles.tabBtnActive : ""}`}
            >
              {f.label}
              {f.key === "CUSTOMER" && ` (${customerCount})`}
              {f.key === "OWNER" && ` (${ownerCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Table (desktop) ---------- */}
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
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className={styles.reviewerCell}>
                      <span className={styles.avatar} style={{ background: r.gradient }}>
                        {r.initial}
                      </span>
                      <span className={styles.reviewerName}>{r.reviewerName}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.typePill} ${
                        r.reviewerType === "OWNER" ? styles.typeOwner : styles.typeCustomer
                      }`}
                    >
                      {r.reviewerType === "OWNER" ? "Host" : "User"}
                    </span>
                  </td>
                  <td className={styles.mouldCell}>
                    {r.mould.mouldId}
                    <span className={styles.subMeta}>{r.mould.mouldName}</span>
                  </td>
                  <td>
                    <StarRating value={r.rating} />
                  </td>
                  <td className={styles.reviewSnippetCell}>{r.reviewText}</td>
                  <td className={styles.mutedCell}>{r.createdDateISO}</td>
                  <td className={styles.actionCell}>
                    <button
                      type="button"
                      onClick={() => setViewReview(r)}
                      className={styles.iconBtn}
                      aria-label="View review"
                    >
                      👁
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(r.id)}
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      aria-label="Delete review"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && <p className={styles.emptyText}>No reviews match your filters.</p>}
        </div>
      </div>

      {/* ---------- Cards (mobile) ---------- */}
      <div className={styles.mobileList}>
        {filtered.map((r) => (
          <div key={r.id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <span className={styles.avatar} style={{ background: r.gradient }}>
                {r.initial}
              </span>
              <div className={styles.mobileCardInfo}>
                <p className={styles.reviewerName}>{r.reviewerName}</p>
                <p className={styles.mobileMeta}>
                  {r.mould.mouldId} · {r.mould.mouldName}
                </p>
              </div>
              <span
                className={`${styles.typePill} ${
                  r.reviewerType === "OWNER" ? styles.typeOwner : styles.typeCustomer
                }`}
              >
                {r.reviewerType === "OWNER" ? "Host" : "User"}
              </span>
            </div>

            <div className={styles.mobileCardRow}>
              <StarRating value={r.rating} />
              <span className={styles.mobileMeta}>{r.createdDateISO}</span>
            </div>

            <p className={styles.mobileReviewText}>{r.reviewText}</p>

            <div className={styles.mobileCardBottom}>
              <button type="button" onClick={() => setViewReview(r)} className={styles.mobileActionBtn}>
                👁 View
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(r.id)}
                className={`${styles.mobileActionBtn} ${styles.mobileActionBtnDanger}`}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <p className={styles.emptyText}>No reviews match your filters.</p>}
      </div>

      {/* ---------- View modal: mould media + the review ---------- */}
      {viewReview && (
        <div className={styles.detailOverlay} onClick={() => setViewReview(null)}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewReview(null)}
              aria-label="Close"
              className={styles.closeBtn}
            >
              ✕
            </button>

            <div className={styles.detailLayout}>
              {/* Mould media */}
              <div className={styles.mediaCol}>
                <p className={styles.eyebrow}>Mould</p>
                <h2 className={styles.mouldTitle}>
                  {viewReview.mould.mouldId} · {viewReview.mould.mouldName}
                </h2>

                <div className={styles.mediaGrid}>
                  {viewReview.mould.media.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.mediaThumb}
                      onClick={() => setActiveMedia(item)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt={item.label} className={styles.mediaThumbImg} />
                      {item.type === "video" && <span className={styles.playIcon}>▶</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review */}
              <div className={styles.reviewCol}>
                <div className={styles.reviewerRow}>
                  <span className={styles.modalAvatar} style={{ background: viewReview.gradient }}>
                    {viewReview.initial}
                  </span>
                  <div>
                    <p className={styles.reviewerNameLg}>{viewReview.reviewerName}</p>
                    <span
                      className={`${styles.typePill} ${
                        viewReview.reviewerType === "OWNER" ? styles.typeOwner : styles.typeCustomer
                      }`}
                    >
                      {viewReview.reviewerType === "OWNER" ? "Host" : "User"}
                    </span>
                  </div>
                </div>

                <StarRating value={viewReview.rating} size="lg" />

                <p className={styles.reviewFullText}>{viewReview.reviewText}</p>

                <p className={styles.reviewMeta}>
                  Booking {viewReview.bookingId} · {viewReview.createdDateISO}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(viewReview.id);
                    setViewReview(null);
                  }}
                  className={styles.deletePanelBtn}
                >
                  🗑 Delete This Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Media lightbox (click to zoom) ---------- */}
      {activeMedia && (
        <div className={styles.lightboxOverlay} onClick={() => setActiveMedia(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveMedia(null)}
              className={styles.lightboxCloseBtn}
              aria-label="Close preview"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeMedia.previewUrl} alt={activeMedia.label} className={styles.lightboxImage} />
          </div>
        </div>
      )}

      {/* ---------- Delete confirmation modal ---------- */}
      {confirmDeleteId && reviewToDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Delete this review?</h3>
            <p className={styles.confirmText}>
              This will permanently remove the review by <strong>{reviewToDelete.reviewerName}</strong> for{" "}
              <strong>{reviewToDelete.mould.mouldId}</strong>. This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmDeleteId(null)} className={styles.confirmCancelBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                className={styles.confirmDeleteBtn}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}