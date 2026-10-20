"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ListingReviewDetail.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { adminApi } from "@/app/lib/admin-api";
import type { Media, Mould, Product, ProductStatus, User } from "@/app/lib/types";

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "DRAFT",
  in_review: "PENDING REVIEW",
  approved: "APPROVED",
  rejected: "REJECTED",
};

interface MediaItem {
  label: string;
  media: Media;
}

const dash = (value: string | number | undefined | null, suffix = "") =>
  value === undefined || value === null || value === "" ? "—" : `${value}${suffix}`;

const formatDimensions = (dimensions?: { length?: number; breadth?: number; height?: number }) =>
  dimensions?.length && dimensions?.breadth && dimensions?.height
    ? `${dimensions.length} × ${dimensions.breadth} × ${dimensions.height} mm`
    : "—";

const formatPrice = (value?: number) =>
  value === undefined ? "—" : `₹${value.toLocaleString("en-IN")}`;

const ownerOf = (product: Product): User | null =>
  typeof product.owner === "object" ? (product.owner as User) : null;

/** Every geo-tagged file on the listing, product first then each mould. */
const collectMedia = (product: Product, moulds: Mould[]): MediaItem[] => {
  const items: MediaItem[] = [];

  (product.images || []).forEach((media, i) =>
    items.push({ label: `Product photo ${i + 1}`, media })
  );
  (product.videos || []).forEach((media, i) =>
    items.push({ label: `Product video ${i + 1}`, media })
  );

  moulds.forEach((mould, index) => {
    const name = mould.component?.name || mould.mouldNameOrId || `Mould ${index + 1}`;
    (mould.images || []).forEach((media, i) =>
      items.push({ label: `${name} photo ${i + 1}`, media })
    );
    (mould.videos || []).forEach((media, i) =>
      items.push({ label: `${name} video ${i + 1}`, media })
    );
  });

  return items;
};

function Row({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div className={`${styles.detailRow} ${isLast ? styles.detailRowLast : ""}`}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

export default function ListingReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [moulds, setMoulds] = useState<Mould[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState("");
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await adminApi.getProduct(id);
      setProduct(data.product);
      setMoulds(data.moulds);
      setRemarks(data.product.rejectionReason || "");
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load the listing"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Deferred to a macrotask so the fetch's setState calls do not run
  // synchronously inside the effect.
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const review = async (status: "approved" | "rejected") => {
    if (submitting || !product) return;

    if (status === "rejected" && !remarks.trim()) {
      setError("Please add remarks explaining the rejection.");
      return;
    }

    setSubmitting(status === "approved" ? "approve" : "reject");
    setError("");

    try {
      await adminApi.reviewProduct(product._id, {
        status,
        ...(status === "rejected" ? { reason: remarks.trim() } : {}),
      });
      router.push("/admin/listings");
    } catch (err) {
      setError(getApiErrorMessage(err, `Could not ${status === "approved" ? "approve" : "reject"} the listing`));
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Loading listing...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>{error || "Listing not found."}</p>
        <Link href="/admin/listings" className={styles.notFoundLink}>
          ← Back to Listing Approvals
        </Link>
      </div>
    );
  }

  const owner = ownerOf(product);
  const media = collectMedia(product, moulds);
  const isDecided = product.status === "approved" || product.status === "rejected";
  const canReview = product.status === "in_review";

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>
          {product.code} · {product.name}
        </h1>
        <span className={styles.statusPill}>
          {(product.resubmissionCount ?? 0) > 0 && product.status === "in_review"
            ? "RESUBMITTED"
            : STATUS_LABEL[product.status]}
        </span>
      </div>

      {/* ---------- Grid layout ---------- */}
      <div className={styles.layout}>
        {/* Media */}
        <div className={`${styles.card} ${styles.mediaArea}`}>
          <h2 className={styles.cardTitle}>Media (geo-tagged)</h2>
          {media.length === 0 ? (
            <p className={styles.emptyNote}>No media was attached to this listing.</p>
          ) : (
            <div className={styles.mediaGrid}>
              {media.map((item, i) => (
                <button
                  key={`${item.media._id}-${i}`}
                  type="button"
                  className={styles.mediaThumb}
                  onClick={() => setActiveMedia(item)}
                >
                  {item.media.kind === "video" ? (
                    <span className={styles.videoTile} aria-hidden>
                      🎥
                    </span>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.media.url} alt={item.label} className={styles.mediaThumbImg} />
                  )}
                  {item.media.kind === "video" && <span className={styles.playIcon}>▶</span>}
                  <span className={styles.mediaCaption}>
                    {item.label}
                    {item.media.location ? ` · ${item.media.location.lat.toFixed(2)}°N` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Decision panel */}
        <div className={styles.decisionArea}>
          <div className={styles.decisionCard}>
            <h2 className={styles.cardTitle}>Decision</h2>

            {canReview ? (
              <>
                <label className={styles.fieldLabel}>Remarks (sent to owner)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add remarks if rejecting..."
                  rows={4}
                  className={styles.textarea}
                />

                {error && <p className={styles.errorText}>{error}</p>}

                <button
                  type="button"
                  onClick={() => review("approved")}
                  disabled={submitting !== null}
                  className={`${styles.approveBtn} btn-primary`}
                >
                  {submitting === "approve" ? "Approving..." : "✓ Approve Listing"}
                </button>
                <button
                  type="button"
                  onClick={() => review("rejected")}
                  disabled={submitting !== null}
                  className={styles.rejectBtn}
                >
                  {submitting === "reject" ? "Rejecting..." : "✕ Reject with Remarks"}
                </button>
              </>
            ) : (
              <p className={styles.emptyNote}>
                {isDecided
                  ? `This listing was already ${product.status}. Only listings under review can be decided.`
                  : "This listing is still a draft and has not been submitted."}
              </p>
            )}

            <div className={styles.reviewMeta}>
              <Row label="Submitted" value={dash(product.submittedAt?.slice(0, 10))} />
              <Row label="Resubmissions" value={String(product.resubmissionCount ?? 0)} />
              {product.rejectionReason && (
                <Row label="Last rejection" value={product.rejectionReason} />
              )}
              {product.publishedAt && (
                <Row label="Published" value={product.publishedAt.slice(0, 10)} isLast />
              )}
            </div>
          </div>
        </div>

        {/* Product details */}
        <div className={`${styles.card} ${styles.techArea}`}>
          <h2 className={styles.cardTitle}>Product Details</h2>
          <div className={styles.statsRow}>
            <div className={styles.statChip}>
              <span className={styles.statValue}>{formatPrice(product.pricing?.perDayCharges)}</span>
              <span className={styles.statLabel}>Per day</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statValue}>{product.componentCount ?? moulds.length}</span>
              <span className={styles.statLabel}>Moulds</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statValue}>
                {formatPrice(product.pricing?.securityDeposit)}
              </span>
              <span className={styles.statLabel}>Deposit</span>
            </div>
          </div>

          <Row label="Category" value={dash(product.category?.title)} />
          <Row label="Sub Category" value={dash(product.subCategory?.title)} />
          <Row label="Dimensions" value={formatDimensions(product.dimensions)} />
          <Row label="Weight" value={dash(product.weight, " g")} />
          <Row label="Material" value={dash(product.material)} />
          <Row label="Surface Finish" value={dash(product.surfaceFinish)} />
          <Row
            label="Location"
            value={
              product.location
                ? `${product.location.lat.toFixed(4)}°N, ${product.location.lng.toFixed(4)}°E`
                : "—"
            }
            isLast
          />
        </div>

        {/* Owner + every mould */}
        <div className={styles.detailsArea}>
          <div className={styles.detailsGrid}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Owner</h2>
              <Row label="Name" value={dash(owner?.fullName)} />
              <Row label="Phone" value={dash(owner?.phone)} />
              <Row label="Email" value={dash(owner?.email)} />
              <Row label="Listing code" value={product.code} isLast />
            </div>

            {moulds.map((mould, index) => (
              <div key={mould._id} className={styles.card}>
                <h2 className={styles.cardTitle}>
                  {mould.component?.name
                    ? `Component ${index + 1} · ${mould.component.name}`
                    : `Mould ${index + 1}`}
                </h2>

                {mould.component?.name && (
                  <>
                    <Row label="Component dimensions" value={formatDimensions(mould.component.dimensions)} />
                    <Row label="Component weight" value={dash(mould.component.weight, " g")} />
                    <Row label="Component finish" value={dash(mould.component.surfaceFinish)} />
                    <div className={styles.cardDivider} />
                  </>
                )}

                <Row label="Mould Name / ID" value={dash(mould.mouldNameOrId)} />
                <Row label="Type" value={dash(mould.mouldType)} />
                <Row label="Year" value={dash(mould.yearOfManufacturing)} />
                <Row label="Dimensions" value={formatDimensions(mould.dimensions)} />
                <Row label="Weight" value={dash(mould.weight, " kg")} />
                <Row label="Cavities / Core" value={dash(mould.cavities)} />
                <Row label="Cycle Time" value={dash(mould.expectedCycleTime, " s")} />
                <Row label="Machine Tonnage" value={dash(mould.recommendedMachineTonnage, " T")} />
                <Row label="Runner Type" value={dash(mould.runnerType)} />
                <Row
                  label="Changeable Logo"
                  value={mould.changeableBrandLogo ? "Yes" : "No"}
                  isLast
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Media lightbox ---------- */}
      {activeMedia && (
        <div className={styles.lightboxOverlay} onClick={() => setActiveMedia(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <div>
                <h3 className={styles.lightboxTitle}>{activeMedia.label}</h3>
                {activeMedia.media.location && (
                  <p className={styles.lightboxGeo}>
                    📍 {activeMedia.media.location.lat.toFixed(4)}°N,{" "}
                    {activeMedia.media.location.lng.toFixed(4)}°E
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveMedia(null)}
                className={styles.lightboxCloseBtn}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className={styles.lightboxBody}>
              {activeMedia.media.kind === "video" ? (
                <video
                  src={activeMedia.media.url}
                  controls
                  playsInline
                  preload="metadata"
                  className={styles.lightboxVideo}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeMedia.media.url}
                  alt={activeMedia.label}
                  className={styles.lightboxImage}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
