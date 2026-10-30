"use client";

import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ListingReviewDetail.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { adminApi } from "@/app/lib/admin-api";
import type { Media, Mould, Product, ProductDetail, ProductStatus, User } from "@/app/lib/types";

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

/** Geo-tagged files attached to the main product. */
const collectProductMedia = (product: Product): MediaItem[] => [
  ...(product.images || []).map((media, i) => ({ label: `Product photo ${i + 1}`, media })),
  ...(product.videos || []).map((media, i) => ({ label: `Product video ${i + 1}`, media })),
];

/** Geo-tagged files attached to a single mould / component. */
const collectMouldMedia = (mould: Mould, index: number): MediaItem[] => {
  const name = mould.component?.name || mould.mouldNameOrId || `Mould ${index + 1}`;
  return [
    ...(mould.images || []).map((media, i) => ({ label: `${name} photo ${i + 1}`, media })),
    ...(mould.videos || []).map((media, i) => ({ label: `${name} video ${i + 1}`, media })),
  ];
};

/* Layout rules that only this page needs. Kept here (not in the CSS module)
   so the product / component sections stay self-contained in this file. */
const SECTION_CSS = `
.lrd-split { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
@media (min-width: 768px) {
  .lrd-split { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
}
.lrd-hero { height: 220px !important; }
@media (min-width: 640px) { .lrd-hero { height: 280px !important; } }
.lrd-thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; margin-top: 8px; }
.lrd-thumbs img { height: 70px; }
.lrd-comp-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; align-items: stretch; }
@media (min-width: 640px) { .lrd-comp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; } }
.lrd-comp-grid .lrd-hero { height: 200px !important; }
@media (min-width: 1024px) { .lrd-comp-grid .lrd-hero { height: 240px !important; } }
`;

const ACCENT = {
  product: { color: "#2563eb", soft: "#eff6ff" },
  component: { color: "#7c3aed", soft: "#f5f3ff" },
};

function SectionBadge({ text, tone }: { text: string; tone: keyof typeof ACCENT }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: ACCENT[tone].soft,
        color: ACCENT[tone].color,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.5,
        padding: "4px 10px",
        borderRadius: 9999,
        marginBottom: 8,
      }}
    >
      {text}
    </span>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{
        margin: "4px 0 4px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "#9ca3af",
      }}
    >
      {children}
    </h3>
  );
}

/** One hero tile plus thumbnails, scoped to a single product or component. */
function MediaGallery({
  items,
  emptyText,
  onOpen,
}: {
  items: MediaItem[];
  emptyText: string;
  onOpen: (item: MediaItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div
        className="lrd-hero"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #d1d5db",
          borderRadius: 12,
          background: "#f9fafb",
          padding: 16,
          textAlign: "center",
        }}
      >
        <p className={styles.emptyNote}>{emptyText}</p>
      </div>
    );
  }

  const [hero, ...rest] = items;

  return (
    <div>
      <button
        type="button"
        className={styles.mediaThumb}
        onClick={() => onOpen(hero)}
        style={{ width: "100%" }}
      >
        {hero.media.kind === "video" ? (
          <span className={`${styles.videoTile} lrd-hero`} style={{ aspectRatio: "auto" }} aria-hidden>
            🎥
          </span>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={hero.media.url}
            alt={hero.label}
            className={`${styles.mediaThumbImg} lrd-hero`}
          />
        )}
        {hero.media.kind === "video" && (
          <span className={styles.playIcon} style={{ top: "50%", transform: "translate(-50%, -50%)" }}>
            ▶
          </span>
        )}
        <span className={styles.mediaCaption}>
          {hero.label}
          {hero.media.location ? ` · ${hero.media.location.lat.toFixed(2)}°N` : ""}
        </span>
      </button>

      {rest.length > 0 && (
        <div className="lrd-thumbs">
          {rest.map((item, i) => (
            <button
              key={`${item.media._id}-${i}`}
              type="button"
              className={styles.mediaThumb}
              onClick={() => onOpen(item)}
            >
              {item.media.kind === "video" ? (
                <span className={styles.videoTile} style={{ height: 70, aspectRatio: "auto" }} aria-hidden>
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
  );
}

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

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState("");
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  const canonicalProduct = detail?.product ?? null;
  const pendingUpdate = detail?.pendingUpdate;
  const revision = canonicalProduct?.status === "approved" && pendingUpdate?.status === "in_review"
    ? pendingUpdate
    : null;
  const product = revision && !showCurrent ? revision.product : canonicalProduct;
  const moulds = (revision && !showCurrent ? revision.moulds : detail?.moulds) ?? [];

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await adminApi.getProduct(id);
      setDetail(data);
      setShowCurrent(false);
      setRemarks(data.pendingUpdate?.rejectionReason || data.product.rejectionReason || "");
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
    if (submitting || !canonicalProduct || (!revision && canonicalProduct.status !== "in_review")) return;

    if (status === "rejected" && !remarks.trim()) {
      setError("Please add remarks explaining the rejection.");
      return;
    }

    setSubmitting(status === "approved" ? "approve" : "reject");
    setError("");

    try {
      await adminApi.reviewProduct(canonicalProduct._id, {
        status,
        ...(revision ? { revisionId: revision._id } : {}),
        ...(status === "rejected" ? { reason: remarks.trim() } : {}),
      });
      router.push("/admin/listings");
    } catch (err) {
      setError(getApiErrorMessage(err, `Could not ${status === "approved" ? "approve" : "reject"} the listing`));
      setSubmitting(null);
    }
  };

  const updateAvailability = async () => {
    if (!canonicalProduct || canonicalProduct.status !== "approved" || savingAvailability) return;
    setSavingAvailability(true);
    setAvailabilityError("");
    try {
      setDetail(await adminApi.updateProductAvailability(canonicalProduct._id,
        canonicalProduct.availability === "maintenance" ? "active" : "maintenance"));
    } catch (err) {
      setAvailabilityError(getApiErrorMessage(err, "Could not update availability"));
    } finally {
      setSavingAvailability(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>Loading listing...</p>
      </div>
    );
  }

  if (!product || !canonicalProduct || !detail) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>{error || "Listing not found."}</p>
        <Link href="/admin/listings" className={styles.notFoundLink}>
          ← Back to Listing Approvals
        </Link>
      </div>
    );
  }

  const owner = ownerOf(canonicalProduct);
  const productMedia = collectProductMedia(product);
  const isDecided = canonicalProduct.status === "approved" || canonicalProduct.status === "rejected";
  const canReview = Boolean(revision) || canonicalProduct.status === "in_review";
  const reviewMeta = revision ?? canonicalProduct;
  const maintenance = canonicalProduct.availability === "maintenance";
  const comparison = revision ? [
    ["Name", canonicalProduct.name, revision.product.name],
    ["Category", dash(canonicalProduct.category?.title), dash(revision.product.category?.title)],
    ["Subcategory", dash(canonicalProduct.subCategory?.title), dash(revision.product.subCategory?.title)],
    ["Rent / day", formatPrice(canonicalProduct.pricing?.perDayCharges), formatPrice(revision.product.pricing?.perDayCharges)],
    ["Deposit", formatPrice(canonicalProduct.pricing?.securityDeposit), formatPrice(revision.product.pricing?.securityDeposit)],
    ["Moulds", String(detail.moulds.length), String(revision.moulds.length)],
    ["Dimensions", formatDimensions(canonicalProduct.dimensions), formatDimensions(revision.product.dimensions)],
    ["Weight", dash(canonicalProduct.weight, " g"), dash(revision.product.weight, " g")],
    ["Material", dash(canonicalProduct.material), dash(revision.product.material)],
    ["Surface finish", dash(canonicalProduct.surfaceFinish), dash(revision.product.surfaceFinish)],
    ["Location", canonicalProduct.location ? `${canonicalProduct.location.lat}, ${canonicalProduct.location.lng}` : "—", revision.product.location ? `${revision.product.location.lat}, ${revision.product.location.lng}` : "—"],
    ["Product photos / videos", `${canonicalProduct.images?.length ?? 0} / ${canonicalProduct.videos?.length ?? 0}`, `${revision.product.images?.length ?? 0} / ${revision.product.videos?.length ?? 0}`],
  ] : [];

  return (
    <div className={styles.page}>
      {canonicalProduct.status === "approved" && !revision ? (
        <Link href="/admin/active-listings" className={styles.notFoundLink}>← Back to Active Listings</Link>
      ) : (
        <Link href="/admin/listings" className={styles.notFoundLink}>← Back to Listing Approvals</Link>
      )}
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow} style={{ marginTop: 10 }}>
        <h1 className={styles.title}>
          {product.code} · {product.name}
        </h1>
        <span className={styles.statusPill}>
          {revision ? "UPDATE · PENDING REVIEW" : (product.resubmissionCount ?? 0) > 0 && product.status === "in_review"
            ? "RESUBMITTED"
            : STATUS_LABEL[product.status]}
        </span>
      </div>

      <style>{SECTION_CSS}</style>

      {canonicalProduct.status === "approved" && (
        <section className={`${styles.card} ${styles.availabilityCard}`} aria-label="Current listing availability">
          <div>
            <h2 className={styles.cardTitle}>Current listing: {maintenance ? "Maintenance" : "Live"}</h2>
            <p className={styles.emptyNote}>
              Visible in Explore and search. {maintenance ? "New bookings are paused." : "Open for booking."}
              {maintenance && canonicalProduct.maintenanceByRole ? ` Maintenance set by ${canonicalProduct.maintenanceByRole}.` : ""}
            </p>
          </div>
          <button type="button" className={styles.availabilityBtn} onClick={updateAvailability} disabled={savingAvailability || submitting !== null}>
            {savingAvailability ? "Saving…" : maintenance ? "Enable bookings" : "Set maintenance"}
          </button>
          {availabilityError && <p className={styles.errorText} role="alert">{availabilityError}</p>}
        </section>
      )}

      {pendingUpdate && !revision && (
        <div className={styles.updateNotice}>
          <strong>UPDATE · {STATUS_LABEL[pendingUpdate.status]}</strong>
          <p>{pendingUpdate.status === "rejected" ? pendingUpdate.rejectionReason || "No rejection reason was provided." : "The host has saved an update draft. It has not been submitted for review."}</p>
          <p>The current approved version is shown below.</p>
        </div>
      )}

      {revision && (
        <section className={styles.updateNotice} aria-label="Update comparison">
          <h2 className={styles.cardTitle}>UPDATE · Proposed changes</h2>
          <p>The approved version remains published until this update is approved. Approval and rejection below apply to this update.</p>
          <div className={styles.comparisonWrap}>
            <table className={styles.comparisonTable}>
              <thead><tr><th>Field</th><th>Current approved version</th><th>Proposed version</th></tr></thead>
              <tbody>{comparison.map(([label, current, proposed]) => (
                <tr key={label} className={current !== proposed ? styles.changedRow : undefined}>
                  <th scope="row">{label}</th><td>{current}</td><td>{proposed}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p><strong>Showing {showCurrent ? "current approved version" : "proposed version"} below, including all media and mould specifications.</strong></p>
          <button type="button" className={styles.availabilityBtn} onClick={() => { setShowCurrent((value) => !value); setActiveMedia(null); }}>
            View {showCurrent ? "proposed" : "current approved"} version
          </button>
        </section>
      )}

      {/* ---------- Grid layout ---------- */}
      <div className={styles.layout}>
        {/* Main product: its own media + details */}
        <section
          className={`${styles.card} ${styles.mediaArea}`}
          style={{ borderTop: `4px solid ${ACCENT.product.color}` }}
        >
          <SectionBadge text={revision ? showCurrent ? "CURRENT APPROVED PRODUCT" : "PROPOSED PRODUCT" : "MAIN PRODUCT"} tone="product" />
          <h2 className={styles.cardTitle} style={{ fontSize: 16 }}>
            {product.name}
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>
              {product.code}
            </span>
          </h2>

          <div className="lrd-split">
            <div>
              <SubHeading>Product media (geo-tagged)</SubHeading>
              <MediaGallery
                items={productMedia}
                emptyText="No media was attached to the main product."
                onOpen={setActiveMedia}
              />
            </div>

            <div>
              <SubHeading>Product details</SubHeading>
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
          </div>
        </section>

        {/* Components: two-column grid, each card holds its own media then its details.
            Uses the full-width details row on desktop so two cards fit side by side. */}
        <div className={styles.detailsArea} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <h2 className={styles.cardTitle} style={{ margin: 0, fontSize: 15 }}>
              Components
            </h2>
            <span
              style={{
                background: ACCENT.component.soft,
                color: ACCENT.component.color,
                fontSize: 11,
                fontWeight: 800,
                padding: "2px 9px",
                borderRadius: 9999,
              }}
            >
              {moulds.length}
            </span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          {moulds.length === 0 && (
            <div className={styles.card}>
              <p className={styles.emptyNote}>No components were added to this listing.</p>
            </div>
          )}

          {moulds.length > 0 && (
            <div className="lrd-comp-grid">
              {moulds.map((mould, index) => (
                <section
                  key={mould._id}
                  className={styles.card}
                  style={{
                    borderTop: `4px solid ${ACCENT.component.color}`,
                    background: "#fcfcff",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <SectionBadge text={`COMPONENT ${index + 1}`} tone="component" />
                  <h2 className={styles.cardTitle} style={{ fontSize: 15 }}>
                    {mould.component?.name
                      ? `Component ${index + 1} · ${mould.component.name}`
                      : `Mould ${index + 1}`}
                  </h2>

                  <SubHeading>Component media (geo-tagged)</SubHeading>
                  <MediaGallery
                    items={collectMouldMedia(mould, index)}
                    emptyText="No media was attached to this component."
                    onOpen={setActiveMedia}
                  />

                  <div className={styles.cardDivider} />

                  {mould.component?.name && (
                    <>
                      <SubHeading>Component specifications</SubHeading>
                      <Row label="Component dimensions" value={formatDimensions(mould.component.dimensions)} />
                      <Row label="Component weight" value={dash(mould.component.weight, " g")} />
                      <Row label="Component finish" value={dash(mould.component.surfaceFinish)} isLast />
                      <div className={styles.cardDivider} />
                    </>
                  )}

                  <SubHeading>Mould specifications</SubHeading>
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
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Decision panel + owner. On mobile it follows the components;
            on desktop the grid area keeps it in the right column. */}
        <div className={styles.decisionArea} style={{ order: 5 }}>
          <div className={styles.decisionCard}>
            <h2 className={styles.cardTitle}>{revision ? "Update decision" : "Decision"}</h2>

            {canReview ? (
              <>
                <label className={styles.fieldLabel}>Remarks (sent to host)</label>
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
                  disabled={submitting !== null || savingAvailability}
                  className={`${styles.approveBtn} btn-primary`}
                >
                  {submitting === "approve" ? "Approving..." : revision ? "✓ Approve Update" : "✓ Approve Listing"}
                </button>
                <button
                  type="button"
                  onClick={() => review("rejected")}
                  disabled={submitting !== null || savingAvailability}
                  className={styles.rejectBtn}
                >
                  {submitting === "reject" ? "Rejecting..." : revision ? "✕ Reject Update with Remarks" : "✕ Reject with Remarks"}
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
              <Row label={revision ? "Update submitted" : "Submitted"} value={dash(reviewMeta.submittedAt?.slice(0, 10))} />
              {!revision && <Row label="Resubmissions" value={String(canonicalProduct.resubmissionCount ?? 0)} />}
              {reviewMeta.rejectionReason && (
                <Row label="Last rejection" value={reviewMeta.rejectionReason} />
              )}
              {canonicalProduct.publishedAt && (
                <Row label="Published" value={canonicalProduct.publishedAt.slice(0, 10)} isLast />
              )}
            </div>
          </div>

          <div className={styles.card} style={{ marginTop: 14 }}>
            <h2 className={styles.cardTitle}>Host</h2>
            <Row label="Name" value={dash(owner?.fullName)} />
            <Row label="Phone" value={dash(owner?.phone)} />
            <Row label="Email" value={dash(owner?.email)} />
            <Row label="Listing code" value={product.code} isLast />
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
