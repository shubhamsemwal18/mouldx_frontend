"use client";

import { useMemo, useState } from "react";
import styles from "./ApprovedListings.module.css";

type ListingLifecycle = "ACTIVE" | "ARCHIVED";

interface MediaItem {
  type: "photo" | "video";
  label: string;
  previewUrl: string;
  coords?: { lat: number; lng: number };
  duration?: string;
}

interface ActiveListing {
  id: string;
  mouldId: string;
  productName: string;
  type: string;
  owner: string;
  ownerFirm: string;
  pricePerDay: number;
  totalBookings: number;
  rating: number;
  approvedDateISO: string; // yyyy-mm-dd
  lifecycle: ListingLifecycle;
  media: MediaItem[];
  technical: {
    tonnage: string;
    cavities: string;
    steel: string;
    dimensions: string;
    weight: string;
    cycleTime: string;
    hourlyProduction: string;
    runnerType: string;
    coolingTemp: string;
    changeableLogo: string;
  };
  general: {
    condition: string;
    year: string;
    manufacturer: string;
    actualValue: string;
    setOfMoulds: string;
    eligibility: string;
  };
  product: {
    productName: string;
    category: string;
    dimensions: string;
    weight: string;
    material: string;
    finish: string;
  };
}

// TEMP dummy data — real admin API se aayega (owner-approved listings only)
const INITIAL_LISTINGS: ActiveListing[] = [
  {
    id: "1",
    mouldId: "MX-000123",
    productName: "2-Cavity Injection Mould",
    type: "Injection · 2-Cavity",
    owner: "Rohit Sharma",
    ownerFirm: "Sharma Industries",
    pricePerDay: 1800,
    totalBookings: 38,
    rating: 4.8,
    approvedDateISO: "2026-08-02",
    lifecycle: "ACTIVE",
    media: [
      { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1a/900/600", coords: { lat: 19.07, lng: 72.87 } },
      { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx1b/900/600", coords: { lat: 19.07, lng: 72.87 } },
      { type: "video", label: "Video", previewUrl: "https://picsum.photos/seed/mx1c/900/600", duration: "0:42" },
    ],
    technical: {
      tonnage: "120T",
      cavities: "2",
      steel: "P20",
      dimensions: "420 × 310 × 280 mm",
      weight: "185 kg",
      cycleTime: "28 s",
      hourlyProduction: "120",
      runnerType: "Hot Runner",
      coolingTemp: "18 °C",
      changeableLogo: "No",
    },
    general: {
      condition: "Excellent",
      year: "2022",
      manufacturer: "Precision Ltd.",
      actualValue: "₹4,50,000",
      setOfMoulds: "Single mould",
      eligibility: "Pan India",
    },
    product: {
      productName: "28mm PET Bottle Cap",
      category: "Cap & Closure",
      dimensions: "28 × 28 × 14 mm",
      weight: "3.2 g",
      material: "HDPE",
      finish: "Matte",
    },
  },
  {
    id: "2",
    mouldId: "MX-000198",
    productName: "5L Can Blow Mould",
    type: "Blow · 5L Can",
    owner: "Neha Kapoor",
    ownerFirm: "Nova Plastics",
    pricePerDay: 2400,
    totalBookings: 27,
    rating: 4.6,
    approvedDateISO: "2026-07-18",
    lifecycle: "ACTIVE",
    media: [
      { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx2a/900/600", coords: { lat: 18.52, lng: 73.86 } },
      { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx2b/900/600", coords: { lat: 18.52, lng: 73.86 } },
    ],
    technical: {
      tonnage: "180T",
      cavities: "1",
      steel: "S136",
      dimensions: "560 × 400 × 350 mm",
      weight: "240 kg",
      cycleTime: "35 s",
      hourlyProduction: "95",
      runnerType: "Cold Runner",
      coolingTemp: "16 °C",
      changeableLogo: "Yes",
    },
    general: {
      condition: "Good",
      year: "2021",
      manufacturer: "Nova Plastics In-house",
      actualValue: "₹6,20,000",
      setOfMoulds: "Single mould",
      eligibility: "Pan India",
    },
    product: {
      productName: "5L HDPE Can",
      category: "Container",
      dimensions: "220 × 220 × 300 mm",
      weight: "185 g",
      material: "HDPE",
      finish: "Glossy",
    },
  },
  {
    id: "3",
    mouldId: "MX-000212",
    productName: "4-Cavity Injection Mould",
    type: "Injection · 4-Cavity",
    owner: "Vikram Rao",
    ownerFirm: "Vector Molds",
    pricePerDay: 2050,
    totalBookings: 21,
    rating: 4.4,
    approvedDateISO: "2026-06-30",
    lifecycle: "ARCHIVED",
    media: [
      { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx3a/900/600", coords: { lat: 12.97, lng: 77.59 } },
    ],
    technical: {
      tonnage: "150T",
      cavities: "4",
      steel: "P20",
      dimensions: "480 × 360 × 300 mm",
      weight: "210 kg",
      cycleTime: "24 s",
      hourlyProduction: "150",
      runnerType: "Hot Runner",
      coolingTemp: "20 °C",
      changeableLogo: "No",
    },
    general: {
      condition: "Good",
      year: "2020",
      manufacturer: "Vector Molds",
      actualValue: "₹5,10,000",
      setOfMoulds: "Single mould",
      eligibility: "Karnataka & Maharashtra",
    },
    product: {
      productName: "PP Cutlery Set Component",
      category: "Consumer Goods",
      dimensions: "150 × 40 × 20 mm",
      weight: "8 g",
      material: "PP",
      finish: "Matte",
    },
  },
  {
    id: "4",
    mouldId: "MX-000077",
    productName: "Die-Cast Enclosure Housing",
    type: "Die-Cast Housing",
    owner: "Anjali Deshpande",
    ownerFirm: "Apex Poly",
    pricePerDay: 3100,
    totalBookings: 14,
    rating: 4.2,
    approvedDateISO: "2026-05-11",
    lifecycle: "ACTIVE",
    media: [
      { type: "photo", label: "Photo", previewUrl: "https://picsum.photos/seed/mx4a/900/600", coords: { lat: 28.61, lng: 77.23 } },
      { type: "video", label: "Video", previewUrl: "https://picsum.photos/seed/mx4b/900/600", duration: "1:05" },
    ],
    technical: {
      tonnage: "250T",
      cavities: "1",
      steel: "H13",
      dimensions: "600 × 450 × 400 mm",
      weight: "310 kg",
      cycleTime: "40 s",
      hourlyProduction: "78",
      runnerType: "Hot Runner",
      coolingTemp: "22 °C",
      changeableLogo: "No",
    },
    general: {
      condition: "Excellent",
      year: "2023",
      manufacturer: "Apex Poly",
      actualValue: "₹8,90,000",
      setOfMoulds: "Single mould",
      eligibility: "Pan India",
    },
    product: {
      productName: "Junction Box Enclosure",
      category: "Electrical",
      dimensions: "180 × 120 × 90 mm",
      weight: "310 g",
      material: "Zinc Alloy",
      finish: "Powder Coated",
    },
  },
];

const STATUS_FILTERS = ["ALL", "ACTIVE", "ARCHIVED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_CLASS: Record<ListingLifecycle, string> = {
  ACTIVE: "statusActive",
  ARCHIVED: "statusArchived",
};

function StarRating({ value }: { value: number }) {
  return (
    <span className={styles.rating}>
      <span aria-hidden>★</span>
      <span className={styles.ratingValue}>{value.toFixed(1)}</span>
    </span>
  );
}

function Row({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className={`${styles.detailRow} ${isLast ? styles.detailRowLast : ""}`}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

export default function ActiveListingsPage() {
  const [listings, setListings] = useState<ActiveListing[]>(INITIAL_LISTINGS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [viewListing, setViewListing] = useState<ActiveListing | null>(null);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        l.mouldId.toLowerCase().includes(q) ||
        l.owner.toLowerCase().includes(q) ||
        l.ownerFirm.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || l.lifecycle === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [listings, search, statusFilter]);

  const activeCount = listings.filter((l) => l.lifecycle === "ACTIVE").length;

  const handleToggleArchive = (id: string) => {
    // TODO: call archive/restore-listing API
    setListings((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, lifecycle: l.lifecycle === "ACTIVE" ? "ARCHIVED" : "ACTIVE" } : l
      )
    );
    setViewListing((prev) =>
      prev && prev.id === id ? { ...prev, lifecycle: prev.lifecycle === "ACTIVE" ? "ARCHIVED" : "ACTIVE" } : prev
    );
  };

  const handleDelete = (id: string) => {
    // TODO: call delete-listing API
    setListings((prev) => prev.filter((l) => l.id !== id));
    setConfirmDeleteId(null);
    setViewListing(null);
  };

  const listingToDelete = listings.find((l) => l.id === confirmDeleteId);

  return (
    <div className={styles.page}>
      {/* ---------- Header ---------- */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Active Listings</h1>
        <span className={styles.countPill}>{activeCount} ACTIVE</span>
      </div>

      {/* ---------- Search + Status filter ---------- */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by mould ID, host, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.tabs}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`${styles.tabBtn} ${statusFilter === s ? styles.tabBtnActive : ""}`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
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
                <th>Mould ID</th>
                <th>Type</th>
                <th>Host</th>
                <th>Price/Day</th>
                <th>Bookings</th>
                <th>Rating</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className={styles.idCell}>{row.mouldId}</td>
                  <td className={styles.mutedCell}>{row.type}</td>
                  <td className={styles.mutedCell}>
                    {row.owner}
                    <span className={styles.subMeta}>{row.ownerFirm}</span>
                  </td>
                  <td className={styles.priceCell}>₹{row.pricePerDay.toLocaleString("en-IN")}</td>
                  <td className={styles.mutedCell}>{row.totalBookings}</td>
                  <td>
                    <StarRating value={row.rating} />
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${styles[STATUS_CLASS[row.lifecycle]]}`}>
                      {row.lifecycle}
                    </span>
                  </td>
                  <td className={styles.actionCell}>
                    <div className={styles.actionGroup}>
                      <button type="button" onClick={() => setViewListing(row)} className={styles.viewBtn}>
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(row.id)}
                        className={styles.archiveBtn}
                      >
                        {row.lifecycle === "ACTIVE" ? "Archive" : "Restore"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(row.id)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && <p className={styles.emptyText}>No listings match your filters.</p>}
        </div>
      </div>

      {/* ---------- Cards (mobile) ---------- */}
      <div className={styles.mobileList}>
        {filtered.map((row) => (
          <div key={row.id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div className={styles.mobileCardInfo}>
                <p className={styles.idCell}>{row.mouldId}</p>
                <p className={styles.mobileMeta}>{row.type}</p>
              </div>
              <span className={`${styles.statusPill} ${styles[STATUS_CLASS[row.lifecycle]]}`}>
                {row.lifecycle}
              </span>
            </div>

            <div className={styles.mobileCardRow}>
              <span className={styles.mobileMeta}>
                {row.owner} · {row.ownerFirm}
              </span>
              <StarRating value={row.rating} />
            </div>

            <div className={styles.mobileCardRow}>
              <span className={styles.priceCell}>₹{row.pricePerDay.toLocaleString("en-IN")}/day</span>
              <span className={styles.mobileMeta}>{row.totalBookings} bookings</span>
            </div>

            <div className={styles.mobileCardBottom}>
              <button type="button" onClick={() => setViewListing(row)} className={styles.viewBtn}>
                View
              </button>
              <button type="button" onClick={() => handleToggleArchive(row.id)} className={styles.archiveBtn}>
                {row.lifecycle === "ACTIVE" ? "Archive" : "Restore"}
              </button>
              <button type="button" onClick={() => setConfirmDeleteId(row.id)} className={styles.deleteBtn}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <p className={styles.emptyText}>No listings match your filters.</p>}
      </div>

      {/* ---------- View details modal (full listing review, like the approval detail page) ---------- */}
      {viewListing && (
        <div className={styles.detailOverlay} onClick={() => setViewListing(null)}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailModalHeader}>
              <div>
                <h2 className={styles.detailTitle}>
                  {viewListing.mouldId} · {viewListing.productName}
                </h2>
                <p className={styles.detailSubtitle}>
                  {viewListing.owner} — {viewListing.ownerFirm}
                </p>
              </div>
              <div className={styles.detailHeaderRight}>
                <span className={`${styles.statusPill} ${styles[STATUS_CLASS[viewListing.lifecycle]]}`}>
                  {viewListing.lifecycle}
                </span>
                <button
                  type="button"
                  onClick={() => setViewListing(null)}
                  aria-label="Close"
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.detailLayout}>
              {/* Media */}
              <div className={`${styles.innerCard} ${styles.mediaArea}`}>
                <h3 className={styles.innerCardTitle}>Media (geo-tagged)</h3>
                <div className={styles.mediaGrid}>
                  {viewListing.media.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.mediaThumb}
                      onClick={() => setActiveMedia(item)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt={item.label} className={styles.mediaThumbImg} />
                      {item.type === "video" && <span className={styles.playIcon}>▶</span>}
                      <span className={styles.mediaCaption}>
                        {item.label} ·{" "}
                        {item.type === "video" ? item.duration : `${item.coords?.lat.toFixed(2)}°N`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action panel (Archive / Delete only — no edit) */}
              <div className={styles.actionArea}>
                <div className={styles.actionPanel}>
                  <h3 className={styles.innerCardTitle}>Manage Listing</h3>
                  <p className={styles.actionHint}>
                    This listing is host-approved and cannot be edited here. You can only archive it
                    (hide from users, reversible) or permanently delete it.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleToggleArchive(viewListing.id)}
                    className={styles.archivePanelBtn}
                  >
                    {viewListing.lifecycle === "ACTIVE" ? "📦 Archive Listing" : "↺ Restore Listing"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(viewListing.id)}
                    className={styles.deletePanelBtn}
                  >
                    🗑 Delete Permanently
                  </button>

                  <div className={styles.miniStatsRow}>
                    <div className={styles.miniStat}>
                      <span className={styles.miniStatValue}>{viewListing.totalBookings}</span>
                      <span className={styles.miniStatLabel}>Bookings</span>
                    </div>
                    <div className={styles.miniStat}>
                      <span className={styles.miniStatValue}>{viewListing.rating.toFixed(1)} ★</span>
                      <span className={styles.miniStatLabel}>Rating</span>
                    </div>
                    <div className={styles.miniStat}>
                      <span className={styles.miniStatValue}>₹{viewListing.pricePerDay.toLocaleString("en-IN")}</span>
                      <span className={styles.miniStatLabel}>Per Day</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical stats */}
              <div className={`${styles.innerCard} ${styles.techArea}`}>
                <h3 className={styles.innerCardTitle}>Technical Details</h3>
                <div className={styles.statsRow}>
                  <div className={styles.statChip}>
                    <span className={styles.statValue}>{viewListing.technical.tonnage}</span>
                    <span className={styles.statLabel}>Tonnage</span>
                  </div>
                  <div className={styles.statChip}>
                    <span className={styles.statValue}>{viewListing.technical.cavities}</span>
                    <span className={styles.statLabel}>Cavity</span>
                  </div>
                  <div className={styles.statChip}>
                    <span className={styles.statValue}>{viewListing.technical.steel}</span>
                    <span className={styles.statLabel}>Steel</span>
                  </div>
                </div>

                <Row label="Dimensions" value={viewListing.technical.dimensions} />
                <Row label="Weight" value={viewListing.technical.weight} />
                <Row label="Cycle Time" value={viewListing.technical.cycleTime} />
                <Row label="Hourly Production" value={viewListing.technical.hourlyProduction} />
                <Row label="Runner Type" value={viewListing.technical.runnerType} />
                <Row label="Cooling Temp" value={viewListing.technical.coolingTemp} />
                <Row label="Changeable Logo" value={viewListing.technical.changeableLogo} isLast />
              </div>

              {/* Full-width: General + Product + Owner */}
              <div className={styles.detailsArea}>
                <div className={styles.detailsGrid}>
                  <div className={styles.innerCard}>
                    <h3 className={styles.innerCardTitle}>General Details</h3>
                    <Row label="Condition" value={viewListing.general.condition} />
                    <Row label="Year" value={viewListing.general.year} />
                    <Row label="Manufacturer" value={viewListing.general.manufacturer} />
                    <Row label="Actual Value" value={viewListing.general.actualValue} />
                    <Row label="Set of Moulds" value={viewListing.general.setOfMoulds} />
                    <Row label="Eligibility" value={viewListing.general.eligibility} isLast />
                  </div>

                  <div className={styles.innerCard}>
                    <h3 className={styles.innerCardTitle}>Product Details</h3>
                    <Row label="Product Name" value={viewListing.product.productName} />
                    <Row label="Category" value={viewListing.product.category} />
                    <Row label="Dimensions" value={viewListing.product.dimensions} />
                    <Row label="Weight" value={viewListing.product.weight} />
                    <Row label="Material" value={viewListing.product.material} />
                    <Row label="Surface Finish" value={viewListing.product.finish} isLast />
                  </div>

                  <div className={styles.innerCard}>
                    <h3 className={styles.innerCardTitle}>Host</h3>
                    <Row label="Firm Name" value={viewListing.ownerFirm} />
                    <Row label="Host Name" value={viewListing.owner} />
                    <Row label="Approved On" value={viewListing.approvedDateISO} isLast />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Media lightbox (click a photo/video to zoom) ---------- */}
      {activeMedia && (
        <div className={styles.lightboxOverlay} onClick={() => setActiveMedia(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <div>
                <h3 className={styles.lightboxTitle}>{activeMedia.label}</h3>
                {activeMedia.coords && (
                  <p className={styles.lightboxGeo}>
                    📍 {activeMedia.coords.lat.toFixed(4)}°N, {activeMedia.coords.lng.toFixed(4)}°E
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeMedia.previewUrl} alt={activeMedia.label} className={styles.lightboxImage} />
            </div>
          </div>
        </div>
      )}

      {/* ---------- Delete confirmation modal ---------- */}
      {confirmDeleteId && listingToDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Delete this listing?</h3>
            <p className={styles.confirmText}>
              This will permanently remove <strong>{listingToDelete.mouldId}</strong> (
              {listingToDelete.ownerFirm}) from the platform, along with its listing history. This cannot be
              undone.
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