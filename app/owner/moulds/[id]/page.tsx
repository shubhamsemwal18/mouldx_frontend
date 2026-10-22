"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./OwnerMouldDetail.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { productApi } from "@/app/lib/product-api";
import type { Dimensions, LatLng, Media, Mould, ProductDetail } from "@/app/lib/types";
import {
  LISTING_STATUS_LABEL,
  formatMouldSet,
  getListingDisplayStatus,
  type ListingDisplayStatus,
} from "../listing-status";

const STATUS_CLASS: Record<ListingDisplayStatus, string> = {
  draft: "badgeDraft",
  pending: "badgePending",
  live: "badgeLive",
  maintenance: "badgeMaintenance",
  rejected: "badgeRejected",
};

const APPROVAL_LABEL: Record<ProductDetail["product"]["status"], string> = {
  draft: "Draft · not submitted",
  in_review: "Pending admin approval",
  approved: "Approved",
  rejected: "Changes requested",
};

const formatDimensions = (d?: Partial<Dimensions>) =>
  d?.length && d?.breadth && d?.height ? `${d.length} × ${d.breadth} × ${d.height} mm` : "—";

const dash = (value: string | number | undefined | null, suffix = "") =>
  value === undefined || value === null || value === "" ? "—" : `${value}${suffix}`;

const formatMoney = (value?: number) =>
  value === undefined ? "—" : `₹${value.toLocaleString("en-IN")}`;

const formatDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const formatLocation = (location?: LatLng) =>
  location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "—";

interface GalleryItem {
  type: "image" | "video";
  src: string;
}

/** Images first, then videos, in the order the owner uploaded them. */
const toGallery = (images?: Media[] | null, videos?: Media[] | null): GalleryItem[] => [
  ...(images || []).filter((m) => m.url).map((m) => ({ type: "image" as const, src: m.url! })),
  ...(videos || []).filter((m) => m.url).map((m) => ({ type: "video" as const, src: m.url! })),
];

export default function OwnerMouldDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 0 = Product, 1..N = Mould 1..N
  const [activeTab, setActiveTab] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Deferred to a macrotask so the state updates do not run synchronously
    // inside the effect.
    const timer = window.setTimeout(() => {
      setLoading(true);

      // Owner-scoped endpoint: it only ever returns the signed-in owner's listing.
      productApi
        .get(id)
        .then((data) => {
          if (!cancelled) {
            setDetail(data);
            setError("");
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setDetail(null);
            setError(getApiErrorMessage(err, "Listing not found"));
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id]);

  const selectTab = useCallback((index: number) => {
    setActiveTab(index);
    setActiveMediaIndex(0);
  }, []);

  if (loading) {
    return (
      <div className={styles.notFoundWrap}>
        <p className={styles.notFoundText}>Loading listing…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.notFoundWrap}>
        <p className={styles.notFoundText}>
          {error || "This listing does not exist or you do not have access to it."}
        </p>
       
      </div>
    );
  }

  const { product, moulds } = detail;
  const displayStatus = getListingDisplayStatus(product);
  const isLive = displayStatus === "live";
  const mouldSetCount = moulds.length || product.componentCount || 0;

  // One tab per mould when the listing is a set; a single mould shows under
  // the product tab.
  const hasMouldTabs = moulds.length > 1;
  const activeMould: Mould | null = activeTab > 0 ? moulds[activeTab - 1] ?? null : null;
  const singleMould = !hasMouldTabs ? moulds[0] ?? null : null;

  const tabs = [
    { label: "Product" },
    ...(hasMouldTabs
      ? moulds.map((mould, i) => ({
          label: mould.component?.name || mould.mouldNameOrId || `Mould ${i + 1}`,
        }))
      : []),
  ];

  const media = activeMould
    ? toGallery(activeMould.images, activeMould.videos)
    : toGallery(product.images, product.videos);

  const galleryLabel = activeMould?.component?.name || product.name;
  const safeMediaIndex = Math.min(activeMediaIndex, Math.max(media.length - 1, 0));
  const activeMedia = media[safeMediaIndex];

  const specSource = activeMould ?? singleMould ?? moulds[0] ?? null;
  const quickSpecs = specSource
    ? [
        { label: "Tonnage", value: dash(specSource.recommendedMachineTonnage, "T") },
        { label: "Cavities", value: dash(specSource.cavities) },
        { label: "Cycle", value: dash(specSource.expectedCycleTime, "s") },
      ]
    : [];

  const mouldTypes = Array.from(
    new Set(moulds.map((mould) => mould.mouldType).filter(Boolean))
  ).join(", ");

  const goToMedia = (index: number) => {
    if (index < 0 || index >= media.length) return;
    setActiveMediaIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 40;
    if (deltaX > SWIPE_THRESHOLD) goToMedia(safeMediaIndex - 1);
    else if (deltaX < -SWIPE_THRESHOLD) goToMedia(safeMediaIndex + 1);
    touchStartX.current = null;
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <Link href="/owner/moulds" className={styles.backLink}>
          ← My Products
        </Link>

        {/* ---------- Gallery (changes with the selected tab) ---------- */}
        <div className={styles.gallery}>
          <div
            className={styles.galleryMain}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {activeMedia ? (
              activeMedia.type === "image" ? (
                <Image
                  key={`${activeTab}-${safeMediaIndex}`}
                  src={activeMedia.src}
                  alt={`${galleryLabel} photo ${safeMediaIndex + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className={styles.galleryImage}
                  priority
                />
              ) : (
                <video
                  key={`${activeTab}-${safeMediaIndex}`}
                  src={activeMedia.src}
                  controls
                  playsInline
                  preload="metadata"
                  className={styles.galleryVideo}
                />
              )
            ) : (
              <div className={styles.galleryEmpty}>No media uploaded</div>
            )}

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goToMedia(safeMediaIndex - 1)}
                  disabled={safeMediaIndex === 0}
                  className={`${styles.galleryNav} ${styles.galleryNavLeft}`}
                  aria-label="Previous media"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => goToMedia(safeMediaIndex + 1)}
                  disabled={safeMediaIndex === media.length - 1}
                  className={`${styles.galleryNav} ${styles.galleryNavRight}`}
                  aria-label="Next media"
                >
                  ›
                </button>
              </>
            )}

            {activeMedia && (
              <span className={styles.galleryCounter}>
                {activeMedia.type === "video" ? "Video" : "Photo"} · {safeMediaIndex + 1}/
                {media.length}
              </span>
            )}
          </div>

          {media.length > 1 && (
            <div className={styles.thumbStrip}>
              {media.map((item, index) => (
                <button
                  key={`${activeTab}-${item.type}-${index}`}
                  type="button"
                  onClick={() => goToMedia(index)}
                  className={`${styles.thumb} ${
                    index === safeMediaIndex ? styles.thumbActive : ""
                  }`}
                  aria-label={`View ${item.type} ${index + 1}`}
                >
                  {item.type === "image" ? (
                    <Image src={item.src} alt="" fill sizes="80px" className={styles.thumbImage} />
                  ) : (
                    <span className={styles.thumbPlay}>▶</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Title + status + quick specs + price ---------- */}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{product.name}</h1>
          <span className={`${styles.badge} ${styles[STATUS_CLASS[displayStatus]]}`}>
            {LISTING_STATUS_LABEL[displayStatus]}
          </span>
        </div>

        <p className={styles.metaRow}>
          {[product.code, product.category?.title, product.subCategory?.title]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className={styles.metaRow}>
          {formatMouldSet(mouldSetCount)}
          {mouldTypes ? ` · ${mouldTypes}` : ""}
        </p>

        {product.status === "rejected" && (
          <div className={styles.rejectedCard}>
            <p className={styles.rejectedTitle}>Admin remarks</p>
            <p className={styles.rejectedText}>
              {product.rejectionReason || "No reason was provided."}
            </p>
          </div>
        )}

        {quickSpecs.length > 0 && (
          <div className={styles.quickSpecs}>
            {quickSpecs.map((spec) => (
              <div key={spec.label} className={styles.quickSpecCard}>
                <p className={styles.quickSpecValue}>{spec.value}</p>
                <p className={styles.quickSpecLabel}>{spec.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className={styles.priceRow}>
          <p className={styles.priceValue}>
            {formatMoney(product.pricing?.perDayCharges)}
            <span className={styles.pricePeriod}> / day</span>
          </p>
          {product.pricing?.securityDeposit !== undefined && (
            <span className={styles.depositBadge}>
              {formatMoney(product.pricing.securityDeposit)} deposit
            </span>
          )}
        </div>

        {/* ---------- Tabs: Product + one tab per mould in the set ---------- */}
        {hasMouldTabs && (
          <div className={styles.tabsRow} role="tablist">
            {tabs.map((tab, index) => (
              <button
                key={`${tab.label}-${index}`}
                type="button"
                role="tab"
                aria-selected={activeTab === index}
                onClick={() => selectTab(index)}
                className={`${styles.tabBtn} ${activeTab === index ? styles.tabBtnActive : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ---------- Product tab ---------- */}
        {activeTab === 0 && (
          <>
            <Section key="status" title="Listing Status">
              <Row label="Approval" value={APPROVAL_LABEL[product.status]} />
              <Row
                label="Availability"
                value={
                  product.status !== "approved"
                    ? "Set after approval"
                    : displayStatus === "maintenance"
                      ? "Maintenance"
                      : "Active / Live"
                }
              />
              <Row
                label="Visible to customers"
                value={isLive ? "Yes" : "No"}
              />
              <Row label="Submitted" value={formatDateTime(product.submittedAt)} />
              <Row label="Reviewed" value={formatDateTime(product.reviewedAt)} />
              <Row label="Published" value={formatDateTime(product.publishedAt)} />
              <Row
                label="Resubmissions"
                value={String(product.resubmissionCount ?? 0)}
                isLast
              />
            </Section>

            <Section key="product" title="Product Details">
              <Row label="Product Name" value={product.name} />
              <Row label="Listing ID" value={product.code} />
              <Row label="Category" value={dash(product.category?.title)} />
              <Row label="Sub Category" value={dash(product.subCategory?.title)} />
              <Row label="Set of Moulds" value={formatMouldSet(mouldSetCount)} />
              <Row label="Dimensions (L × B × H)" value={formatDimensions(product.dimensions)} />
              <Row label="Weight" value={dash(product.weight, " g")} />
              <Row label="Material" value={dash(product.material)} />
              <Row label="Surface Finish" value={dash(product.surfaceFinish)} />
              <Row
                label="Per Day Rental Charges"
                value={formatMoney(product.pricing?.perDayCharges)}
              />
              <Row
                label="Security Deposit Amount"
                value={formatMoney(product.pricing?.securityDeposit)}
              />
              <Row label="Media Location" value={formatLocation(product.location)} isLast />
            </Section>

            {/* Single mould: mould details follow the product details */}
            {singleMould && (
              <Section key="single-mould" title="Mould Details">
                <MouldRows mould={singleMould} />
              </Section>
            )}
          </>
        )}

        {/* ---------- Mould tabs ---------- */}
        {activeMould && (
          <>
            {activeMould.component && (
              <Section key={`${activeMould._id}-component`} title="Component Details">
                <Row label="Component Name" value={dash(activeMould.component.name)} />
                <Row
                  label="Dimensions (L × B × H)"
                  value={formatDimensions(activeMould.component.dimensions)}
                />
                <Row label="Weight" value={dash(activeMould.component.weight, " g")} />
                <Row
                  label="Surface Finish"
                  value={dash(activeMould.component.surfaceFinish)}
                  isLast
                />
              </Section>
            )}

            <Section key={`${activeMould._id}-mould`} title="Mould Details">
              <MouldRows mould={activeMould} />
            </Section>
          </>
        )}

        {/* ---------- Owner actions ---------- */}
        <div className={styles.actions}>
          <Link
            href={`/owner/moulds/new/product?id=${product._id}`}
            className={`${styles.actionPrimary} btn-primary`}
          >
            ✎ Edit Listing
          </Link>
          <Link href="/owner/moulds" className={styles.actionSecondary}>
            Back to My Products
          </Link>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   SMALL PIECES
===================================================================== */
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.sectionTitle}>{title}</span>
        <span
          className={`${styles.sectionChevron} ${open ? styles.sectionChevronOpen : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

function MouldRows({ mould }: { mould: Mould }) {
  return (
    <>
      <Row label="Mould Name / ID" value={dash(mould.mouldNameOrId)} />
      <Row label="Mould Type" value={dash(mould.mouldType)} />
      <Row label="Year of Manufacturing" value={dash(mould.yearOfManufacturing)} />
      <Row label="Dimensions (L × B × H)" value={formatDimensions(mould.dimensions)} />
      <Row label="Weight" value={dash(mould.weight, " kg")} />
      <Row label="No. of Cavities / Core" value={dash(mould.cavities)} />
      <Row
        label="Expected Cycle Time (virgin material)"
        value={dash(mould.expectedCycleTime, " s")}
      />
      <Row
        label="Recommended Machine Tonnage"
        value={dash(mould.recommendedMachineTonnage, " T")}
      />
      <Row label="Hot Runner / Cold Runner" value={dash(mould.runnerType)} />
      <Row
        label="Changeable Brand Logo"
        value={mould.changeableBrandLogo ? "Yes" : "No"}
      />
      <Row
        label="Media"
        value={`${mould.images?.length ?? 0} photo(s) · ${mould.videos?.length ?? 0} video(s)`}
        isLast
      />
    </>
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
