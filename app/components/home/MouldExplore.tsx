"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./MouldExplore.module.css";
import { DUMMY_MOULDS } from "@/app/data/moulds";

const CATEGORIES = ["All", "Injection", "Blow", "Die-Cast", "Nearby"] as const;
const ROW_CATEGORIES = ["Injection", "Blow", "Die-Cast"] as const;
const AVAILABILITY_OPTIONS = ["All", "FREE", "2 LEFT", "BOOKED"] as const;
const PRICE_RANGES = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under ₹2,000", min: 0, max: 1999 },
  { label: "₹2,000 – ₹3,500", min: 2000, max: 3500 },
  { label: "Above ₹3,500", min: 3501, max: Infinity },
] as const;

const PAGE_SIZE = 10;

function parsePrice(price: string) {
  return Number(price.replace(/[^0-9]/g, "")) || 0;
}

// Strip a trailing "s" so plural search terms still match (e.g. "tables" -> "table")
function normalizeToken(t: string) {
  return t.length > 3 ? t.replace(/s$/, "") : t;
}

interface BigCardProps {
  id: string | number;
  name: string;
  code: string;
  city: string;
  category: string;
  price: string;
  image?: string;
  rating?: number;
  variant: "row" | "grid";
}

function BigCard({ id, name, code, city, category, price, image, rating, variant }: BigCardProps) {
  
  const [imgError, setImgError] = useState(false);

  return (
    <article className={`${styles.card} ${variant === "grid" ? styles.cardGrid : styles.cardRow}`}>
      {/* The whole card (image + text) opens the detail page */}
      <Link href={`/explore/${id}`} className={styles.cardLink}>
        <div className={styles.imageWrap}>
          {image && !imgError ? (
            <img
              src={image}
              alt={name}
              className={styles.image}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.placeholder} aria-hidden>▽</div>
          )}
        </div>

        <h3 className={styles.name}>{name}</h3>
        <p className={styles.meta}>
          {price}
          {rating ? <span> · ★ {rating.toFixed(2)}</span> : null}
        </p>
        <p className={styles.sub}>
          {category} · {city} · {code}
        </p>
      </Link>

     
    </article>
  );
}

interface MouldExploreProps {
  search?: string;
  onSearchChange?: (value: string) => void;
}

export default function MouldExplore({ search: searchProp, onSearchChange }: MouldExploreProps) {
  // Use the parent's search value if provided, otherwise fall back to local state
  const [localSearch, setLocalSearch] = useState("");
  const search = searchProp ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [activePriceLabel, setActivePriceLabel] = useState<(typeof PRICE_RANGES)[number]["label"]>("Any price");
  const [activeAvailability, setActiveAvailability] = useState<(typeof AVAILABILITY_OPTIONS)[number]>("All");
  const [page, setPage] = useState(1);

  const listTopRef = useRef<HTMLDivElement | null>(null);
  const prevPageRef = useRef(page);

  const activePriceRange = PRICE_RANGES.find((r) => r.label === activePriceLabel) ?? PRICE_RANGES[0];

  const filteredMoulds = useMemo(() => {
    const tokens = search
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(normalizeToken);

    return DUMMY_MOULDS.filter((m) => {
      const matchesCategory =
        activeCategory === "All" || activeCategory === "Nearby" || m.category === activeCategory;

      // Search across name, code, city and category
      const haystack = `${m.name} ${m.code} ${m.city} ${m.category}`.toLowerCase();
      const matchesSearch = tokens.every((t) => haystack.includes(t));

      const priceValue = parsePrice(m.price);
      const matchesPrice = priceValue >= activePriceRange.min && priceValue <= activePriceRange.max;
      const matchesAvailability = activeAvailability === "All" || m.availability === activeAvailability;
      return matchesCategory && matchesSearch && matchesPrice && matchesAvailability;
    });
  }, [search, activeCategory, activePriceRange, activeAvailability]);

  useEffect(() => {
    if (prevPageRef.current !== page) {
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    prevPageRef.current = page;
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(filteredMoulds.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMoulds = filteredMoulds.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const activeFilterCount =
    (activeCategory !== "All" ? 1 : 0) +
    (activePriceLabel !== "Any price" ? 1 : 0) +
    (activeAvailability !== "All" ? 1 : 0);

  const clearFilters = () => {
    setActiveCategory("All");
    setActivePriceLabel("Any price");
    setActiveAvailability("All");
  };

  // Browsing mode = no search and no filters, shows horizontal rows per category
  const isBrowsing = !search.trim() && activeFilterCount === 0;

  return (
    <section id="mould-explore" className={styles.section}>
      <h2 className={styles.title}>Find a mould</h2>
      <p className={styles.subtitle}>
        {search.trim()
          ? `${filteredMoulds.length} result${filteredMoulds.length === 1 ? "" : "s"} for “${search.trim()}”`
          : "1,240+ verified listings"}
      </p>

      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>🔍</span>
          <input
            type="text"
            placeholder="Search by mould type, cavity, size..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <button
          onClick={() => setIsFilterOpen((v) => !v)}
          className={`${styles.filterToggle} ${isFilterOpen ? styles.filterToggleActive : ""}`}
        >
          <span aria-hidden>▽</span>
          {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
        </button>
      </div>

      {isFilterOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGroup}>
            <p className={styles.filterLabel}>Category</p>
            <div className={styles.chipsRow}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`${styles.chip} ${activeCategory === cat ? styles.chipActive : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <p className={styles.filterLabel}>Price</p>
            <div className={styles.chipsRow}>
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setActivePriceLabel(range.label)}
                  className={`${styles.chip} ${activePriceLabel === range.label ? styles.chipActive : ""}`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <p className={styles.filterLabel}>Availability</p>
            <div className={styles.chipsRow}>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setActiveAvailability(opt)}
                  className={`${styles.chip} ${activeAvailability === opt ? styles.chipActive : ""}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className={styles.clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      <div ref={listTopRef}>
        {isBrowsing ? (
          ROW_CATEGORIES.map((cat) => {
            const items = DUMMY_MOULDS.filter((m) => m.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className={styles.rowSection}>
                <div className={styles.rowHeader}>
                  <h3 className={styles.rowTitle}>{cat} moulds</h3>
                  <button
                    className={styles.rowArrow}
                    onClick={() => setActiveCategory(cat)}
                    aria-label={`See all ${cat} moulds`}
                  >
                    →
                  </button>
                </div>
                <div className={styles.row}>
                  {items.map((m) => (
                    <BigCard key={m.id} {...m} variant="row" />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.grid}>
            {paginatedMoulds.map((m) => (
              <BigCard key={m.id} {...m} variant="grid" />
            ))}
            {filteredMoulds.length === 0 && (
              <p className={styles.emptyText}>No moulds match your search.</p>
            )}
          </div>
        )}
      </div>

      {!isBrowsing && filteredMoulds.length > 0 && totalPages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className={styles.pageBtn}>
            ← Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ""}`}
            >
              {p}
            </button>
          ))}

          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className={styles.pageBtn}>
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
