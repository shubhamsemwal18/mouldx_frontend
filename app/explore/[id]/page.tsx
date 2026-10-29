"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Wrench } from "lucide-react";
import ReviewList from "@/app/components/reviews/ReviewList";
import styles from "./MouldDetail.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { publicApi } from "@/app/lib/public-api";
import { useAuth } from "@/app/lib/auth-context";
import { isAdminUser } from "@/app/lib/auth-routing";
import type { Dimensions, Media, Mould, PublicProductDetail } from "@/app/lib/types";

const formatDimensions = (d?: Partial<Dimensions>) =>
  d?.length && d?.breadth && d?.height ? `${d.length} × ${d.breadth} × ${d.height} mm` : "—";

const dash = (value: string | number | undefined | null, suffix = "") =>
  value === undefined || value === null || value === "" ? "—" : `${value}${suffix}`;

const formatMoney = (value?: number) =>
  value === undefined ? "—" : `₹${value.toLocaleString("en-IN")}`;

interface GalleryItem {
  type: "image" | "video";
  src: string;
}

/** Images first, then videos, in the order the owner uploaded them. */
const toGallery = (images?: Media[] | null, videos?: Media[] | null): GalleryItem[] => [
  ...(images || []).filter((m) => m.url).map((m) => ({ type: "image" as const, src: m.url! })),
  ...(videos || []).filter((m) => m.url).map((m) => ({ type: "video" as const, src: m.url! })),
];

export default function ProductDetailPage({
  params,
}: {
  // Carries the listing slug (the route segment is still named `id`).
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = use(params);
  const { user, loading: authLoading } = useAuth();

  const [detail, setDetail] = useState<PublicProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 0 = Product, 1..N = Component 1..N
  const [activeTab, setActiveTab] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const recordedVisits = useRef(new Set<string>());

  useEffect(() => {
    let controller: AbortController | null = null;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort(); controller = new AbortController();
      const signal = controller.signal;
      publicApi.getProduct(slug, signal).then((data) => { if (!signal.aborted) setDetail(data); }).catch(() => { /* Checkout rechecks availability while offline. */ });
    };
    window.addEventListener("focus", refresh);
    return () => { controller?.abort(); window.removeEventListener("focus", refresh); };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setLoading(true);

      publicApi
        .getProduct(slug)
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
  }, [slug]);

  useEffect(() => {
    const productSlug = detail?.product.slug;
    if (!productSlug || recordedVisits.current.has(productSlug)) return;
    const timer = window.setTimeout(() => {
      const visitId = crypto.randomUUID();
      recordedVisits.current.add(productSlug);
      // Analytics must never block viewing or booking the product.
      publicApi.recordVisit(productSlug, visitId).catch(() => {});
    }, 0);
    return () => window.clearTimeout(timer);
  }, [detail]);

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
        <p className={styles.notFoundText}>{error || "Mould not found."}</p>
        <Link href="/explore" className={styles.notFoundLink}>
          ← Back to Explore
        </Link>
      </div>
    );
  }

  const { product, moulds } = detail;
  const underMaintenance = product.availability === "maintenance";
  // Component tabs only exist when the listing has more than one component.
  const components = moulds.filter((mould) => Boolean(mould.component?.name));
  const hasComponents = components.length > 0;
  const activeComponent: Mould | null = activeTab > 0 ? components[activeTab - 1] ?? null : null;
  const singleMould = !hasComponents ? moulds[0] ?? null : null;

  const tabs = [
    { label: "Product" },
    ...components.map((mould, i) => ({ label: mould.component?.name || `Component ${i + 1}` })),
  ];

  // A mould tab shows that mould's own gallery; the product tab shows the
  // product gallery.
  const media = activeComponent
    ? toGallery(activeComponent.images, activeComponent.videos)
    : toGallery(product.images, product.videos);

  const galleryLabel = activeComponent?.component?.name || product.name;
  const safeMediaIndex = Math.min(activeMediaIndex, Math.max(media.length - 1, 0));
  const activeMedia = media[safeMediaIndex];

  const specSource = activeComponent ?? singleMould ?? moulds[0] ?? null;
  const quickSpecs = specSource
    ? [
        { label: "Tonnage", value: dash(specSource.recommendedMachineTonnage, "T") },
        { label: "Cavities", value: dash(specSource.cavities) },
        { label: "Cycle", value: dash(specSource.expectedCycleTime, "s") },
      ]
    : [];

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
              <div className={styles.galleryVideoWrap} aria-hidden />
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

        {/* ---------- Title + quick specs + price ---------- */}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{product.name}</h1>
        </div>

        <p className={styles.metaRow}>
          {[product.code, product.category?.title, product.subCategory?.title]
            .filter(Boolean)
            .join(" · ")}
        </p>

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
        </div>
        {/* ---------- Tabs: Product + one tab per component ---------- */}
        {hasComponents && (
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
            <Section key="product" title="Product Details">
              <Row label="Product Name" value={product.name} />
              <Row label="Category" value={dash(product.category?.title)} />
              <Row label="Sub Category" value={dash(product.subCategory?.title)} />
              <Row label="Dimensions (L × B × H)" value={formatDimensions(product.dimensions)} />
              <Row label="Weight" value={dash(product.weight, " g")} />
              <Row label="Material" value={dash(product.material)} />
              <Row label="Surface Finish" value={dash(product.surfaceFinish)} />
              <Row
                label="Per Day Rental Charges"
                value={formatMoney(product.pricing?.perDayCharges)}
              />
              <Row
                label="Security Deposit (MouldX payments only)"
                value={formatMoney(product.pricing?.securityDeposit)}
                isLast
              />
            </Section>

            {/* Single mould: mould details follow the product details */}
            {singleMould && (
              <Section key="single-mould" title="Mould Details">
                <MouldRows mould={singleMould} />
              </Section>
            )}
          </>
        )}

        <Section title="Ratings & Reviews"><ReviewList scope="product" slug={product.slug} /></Section>

        {/* ---------- Component tabs ---------- */}
        {activeComponent && (
          <>
            <Section key={`${activeComponent._id}-component`} title="Component Details">
              <Row label="Component Name" value={dash(activeComponent.component?.name)} />
              <Row
                label="Dimensions (L × B × H)"
                value={formatDimensions(activeComponent.component?.dimensions)}
              />
              <Row label="Weight" value={dash(activeComponent.component?.weight, " g")} />
              <Row
                label="Surface Finish"
                value={dash(activeComponent.component?.surfaceFinish)}
                isLast
              />
            </Section>

            <Section key={`${activeComponent._id}-mould`} title="Mould Details">
              <MouldRows mould={activeComponent} />
            </Section>
          </>
        )}
      </div>

      {!authLoading && !isAdminUser(user) && <div className={styles.ctaBar}>
        {underMaintenance ? <div className={styles.maintenanceNotice} role="status"><Wrench size={19} aria-hidden="true" /><span><strong>Under maintenance</strong><span>This product is temporarily unavailable for new bookings.</span></span></div> : <Link
          href={`/explore/${product.slug}/dates`}
          className={`${styles.ctaBtn} flex items-center justify-center no-underline btn-primary`}
        >
          Select Dates →
        </Link>}
      </div>}
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
