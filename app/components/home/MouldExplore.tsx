"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./MouldExplore.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { publicApi, type CatalogueSort } from "@/app/lib/public-api";
import type {
  CatalogueFilterOptions,
  CategorySection,
  MouldType,
  PublicProductCard,
} from "@/app/lib/types";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

const PRICE_RANGES = [
  { label: "Any price", min: undefined, max: undefined },
  { label: "Under ₹2,000", min: undefined, max: 1999 },
  { label: "₹2,000 – ₹3,500", min: 2000, max: 3500 },
  { label: "Above ₹3,500", min: 3501, max: undefined },
] as const;

const SORT_LABELS: { value: CatalogueSort; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

/** axios reports offline as the bare string "Network Error"; say something useful. */
const friendlyError = (err: unknown, fallback: string) => {
  const message = getApiErrorMessage(err, fallback);
  return /network error/i.test(message)
    ? "We couldn't reach the server. Please check your connection."
    : message;
};

const formatPrice = (value?: number) =>
  value === undefined ? "Price on request" : `₹${value.toLocaleString("en-IN")}/day`;

/* ---------- Listing card ---------- */

function ListingCard({
  product,
  variant,
}: {
  product: PublicProductCard;
  variant: "row" | "grid";
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.image?.url;

  return (
    <article className={`${styles.card} ${variant === "grid" ? styles.cardGrid : styles.cardRow}`}>
      <Link href={`/explore/${product.slug}`} className={styles.cardLink}>
        <div className={styles.imageWrap}>
          {imageUrl && !imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={product.name}
              className={styles.image}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.placeholder} aria-hidden>
              ▽
            </div>
          )}
        </div>

        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.meta}>{formatPrice(product.pricing?.perDayCharges)}</p>
        <p className={styles.sub}>
          {[
            product.category?.title,
            product.mouldTypes?.length ? product.mouldTypes.join(" · ") : null,
            product.code,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </Link>
    </article>
  );
}

/* ---------- Page section ---------- */

interface MouldExploreProps {
  search?: string;
  onSearchChange?: (value: string) => void;
}

export default function MouldExplore({ search: searchProp, onSearchChange }: MouldExploreProps) {
  // The landing page owns the search term so the hero bar, the search sheet
  // and this section all stay on the same query.
  const [localSearch, setLocalSearch] = useState("");
  const search = searchProp ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;

  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [categorySlug, setCategorySlug] = useState("");
  const [mouldType, setMouldType] = useState<MouldType | "">("");
  const [priceLabel, setPriceLabel] = useState<string>(PRICE_RANGES[0].label);
  const [sort, setSort] = useState<CatalogueSort>("recent");

  const [sections, setSections] = useState<CategorySection[]>([]);
  const [filterOptions, setFilterOptions] = useState<CatalogueFilterOptions | null>(null);
  const [products, setProducts] = useState<PublicProductCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [matching, setMatching] = useState(0);
  const [totalPublished, setTotalPublished] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [sectionsFailed, setSectionsFailed] = useState(false);
  // Bumped by "Try again" to re-run both loaders.
  const [reloadKey, setReloadKey] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Guards against the observer firing repeatedly for the same page.
  const loadingMoreRef = useRef(false);

  const activeRange = PRICE_RANGES.find((range) => range.label === priceLabel) ?? PRICE_RANGES[0];
  const activeFilterCount =
    (categorySlug ? 1 : 0) + (mouldType ? 1 : 0) + (priceLabel !== PRICE_RANGES[0].label ? 1 : 0);
  const hasQuery = debouncedSearch.length > 0;
  // Browse-by-category is the default view. Any query, filter or explicit sort
  // switches to the flat results grid — otherwise sorting would appear to do
  // nothing, since the category rows have their own order.
  const isBrowsing = !hasQuery && activeFilterCount === 0 && sort === "recent";


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
  
  const queryParams = useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(categorySlug ? { categorySlug } : {}),
      ...(mouldType ? { mouldType } : {}),
      ...(activeRange.min !== undefined ? { minPrice: activeRange.min } : {}),
      ...(activeRange.max !== undefined ? { maxPrice: activeRange.max } : {}),
      sort,
      limit: PAGE_SIZE,
    }),
    [activeRange.max, activeRange.min, categorySlug, debouncedSearch, mouldType, sort]
  );

  // Identity of the query a load-more was started for, so a page that lands
  // after the visitor searched again is discarded instead of appended.
  const queryParamsRef = useRef(queryParams);

  // Debounce typing so every keystroke does not hit the API.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [search]);

  // Static-ish data: the category rows and the filter options.
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      Promise.all([publicApi.listSections(10), publicApi.listFilterOptions()])
        .then(([loadedSections, options]) => {
          if (cancelled) return;
          setSections(loadedSections);
          setFilterOptions(options);
          setSectionsFailed(false);
        })
        .catch(() => {
          if (!cancelled) setSectionsFailed(true);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reloadKey]);

  // First page for the current query. Filters and search reset to page 1.
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");

      publicApi
        .listProducts({ ...queryParams, page: 1 })
        .then((data) => {
          if (cancelled) return;
          setProducts(data.products);
          setPage(1);
          setHasNextPage(data.pagination.hasNextPage);
          setMatching(data.stats.matching);
          setTotalPublished(data.stats.totalPublished);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(friendlyError(err, "Could not load listings"));
          setProducts([]);
          setHasNextPage(false);
          setMatching(0);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [queryParams, reloadKey]);

  useEffect(() => {
    queryParamsRef.current = queryParams;
  }, [queryParams]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasNextPage) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextPage = page + 1;
    const requestedFor = queryParams;

    publicApi
      .listProducts({ ...queryParams, page: nextPage })
      .then((data) => {
        // The visitor searched or filtered while this page was loading.
        if (queryParamsRef.current !== requestedFor) return;

        // De-duplicate: offset paging can repeat an item if a listing is
        // published while the visitor is scrolling.
        setProducts((current) => {
          const seen = new Set(current.map((item) => item._id));
          return [...current, ...data.products.filter((item) => !seen.has(item._id))];
        });
        setPage(nextPage);
        setHasNextPage(data.pagination.hasNextPage);
      })
      .catch((err) => {
        if (queryParamsRef.current !== requestedFor) return;
        setError(friendlyError(err, "Could not load more listings"));
        setHasNextPage(false);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasNextPage, page, queryParams]);

  // Infinite scroll: fetch the next page as the sentinel comes into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || isBrowsing || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "320px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isBrowsing, loadMore]);

  const clearFilters = () => {
    setCategorySlug("");
    setMouldType("");
    setPriceLabel(PRICE_RANGES[0].label);
  };

  const clearAll = () => {
    clearFilters();
    setSearch("");
  };

  const categoryChips = useMemo(
    () => sections.map((section) => ({ slug: section.category.slug, title: section.category.title })),
    [sections]
  );

  const subtitle = (() => {
    if (loading && totalPublished === null) return "Loading listings…";
    // The count never arrived (offline or API error) — do not render "null".
    if (totalPublished === null) return "Browse available moulds";
    if (hasQuery || activeFilterCount > 0) {
      return `${matching} ${matching === 1 ? "listing" : "listings"} found${
        hasQuery ? ` for “${debouncedSearch}”` : ""
      }`;
    }
    if (totalPublished === 0) return "No listings published yet";
    return `${totalPublished} verified ${totalPublished === 1 ? "listing" : "listings"}`;
  })();

  return (
    <section id="mould-explore" className={styles.section}>
      <h2 className={styles.title}>Find a mould</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by product, mould or component..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Search listings"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsFilterOpen((v) => !v)}
          className={`${styles.filterToggle} ${isFilterOpen ? styles.filterToggleActive : ""}`}
          aria-expanded={isFilterOpen}
          aria-label="Filter listings"
        >
           <button className="filter-btn" aria-label="Filter">
  <FilterIcon size={24} />
</button>
          {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
        </button>
      </div>

      {isFilterOpen && (
        <div className={styles.filterPanel}>
          {categoryChips.length > 0 && (
            <div className={styles.filterGroup}>
              <p className={styles.filterLabel}>Category</p>
              <div className={styles.chipsRow}>
                <button
                  type="button"
                  onClick={() => setCategorySlug("")}
                  className={`${styles.chip} ${categorySlug === "" ? styles.chipActive : ""}`}
                >
                  All
                </button>
                {categoryChips.map((category) => (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => setCategorySlug(category.slug)}
                    className={`${styles.chip} ${
                      categorySlug === category.slug ? styles.chipActive : ""
                    }`}
                  >
                    {category.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(filterOptions?.mouldTypes.length ?? 0) > 0 && (
            <div className={styles.filterGroup}>
              <p className={styles.filterLabel}>Mould type</p>
              <div className={styles.chipsRow}>
                <button
                  type="button"
                  onClick={() => setMouldType("")}
                  className={`${styles.chip} ${mouldType === "" ? styles.chipActive : ""}`}
                >
                  All
                </button>
                {filterOptions?.mouldTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMouldType(type)}
                    className={`${styles.chip} ${mouldType === type ? styles.chipActive : ""}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.filterGroup}>
            <p className={styles.filterLabel}>Price</p>
            <div className={styles.chipsRow}>
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => setPriceLabel(range.label)}
                  className={`${styles.chip} ${priceLabel === range.label ? styles.chipActive : ""}`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <p className={styles.filterLabel}>Sort</p>
            <div className={styles.chipsRow}>
              {SORT_LABELS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={`${styles.chip} ${sort === option.value ? styles.chipActive : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters} className={styles.clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {error && (
        <div className={styles.errorBox} role="alert">
          <p className={styles.emptyText}>{error}</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={styles.clearFilters}>
            Try again
          </button>
        </div>
      )}

      {isBrowsing ? (
        <div>
          {sections.map((section) => (
            <div key={section.category._id} className={styles.rowSection}>
              <div className={styles.rowHeader}>
                <h3 className={styles.rowTitle}>{section.category.title}</h3>
                <button
                  type="button"
                  className={styles.rowArrow}
                  onClick={() => {
                    setCategorySlug(section.category.slug);
                    setIsFilterOpen(false);
                  }}
                  aria-label={`See all ${section.category.title} listings`}
                >
                  →
                </button>
              </div>
              <div className={styles.row}>
                {section.products.map((product) => (
                  <ListingCard key={product._id} product={product} variant="row" />
                ))}
              </div>
            </div>
          ))}

          {!loading && sections.length === 0 && (
            <p className={styles.emptyText}>
              {sectionsFailed
                ? "We couldn't load listings just now. Please check your connection and try again."
                : "No listings are published yet. Approved listings appear here automatically."}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {products.map((product) => (
              <ListingCard key={product._id} product={product} variant="grid" />
            ))}
          </div>

          {loading && products.length === 0 && (
            <p className={styles.emptyText}>Searching…</p>
          )}

          {!loading && products.length === 0 && !error && (
            <div>
              <p className={styles.emptyText}>No listings match your search.</p>
              <button type="button" onClick={clearAll} className={styles.clearFilters}>
                Clear search &amp; filters
              </button>
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} aria-hidden />

          {loadingMore && <p className={styles.emptyText}>Loading more…</p>}

          {!hasNextPage && products.length > 0 && (
            <p className={styles.emptyText}>
              {matching === products.length
                ? "That's everything."
                : `Showing all ${products.length} results.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
