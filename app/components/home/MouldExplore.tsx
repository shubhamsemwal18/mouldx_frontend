"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./MouldExplore.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { publicApi } from "@/app/lib/public-api";
import {
  DEFAULT_FILTERS,
  clearFilterValues,
  countActiveFilters,
  filtersToParams,
  type CatalogueFilters,
} from "@/app/lib/catalogue-filters";
import FilterPanel from "../shared/FilterPanel";
import type {
  CatalogueFilterOptions,
  CategorySection,
  PublicProductCard,
} from "@/app/lib/types";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

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
  /** Lets the page's search bar open and close the filter panel. */
  filterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;
  /** Lets the page share the chosen filters with the search sheet. */
  filters?: CatalogueFilters;
  onFiltersChange?: (filters: CatalogueFilters) => void;
}

export default function MouldExplore({
  search: searchProp,
  onSearchChange,
  filterOpen,
  onFilterOpenChange,
  filters: filtersProp,
  onFiltersChange,
}: MouldExploreProps) {
  // The landing page owns the search term so the hero bar, the search sheet
  // and this section all stay on the same query.
  const [localSearch, setLocalSearch] = useState("");
  const search = searchProp ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;

  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [localFilterOpen, setLocalFilterOpen] = useState(false);
  const isFilterOpen = filterOpen ?? localFilterOpen;
  const setIsFilterOpen = onFilterOpenChange ?? setLocalFilterOpen;
  const [localFilters, setLocalFilters] = useState<CatalogueFilters>(DEFAULT_FILTERS);
  const filters = filtersProp ?? localFilters;
  const setFilters = onFiltersChange ?? setLocalFilters;

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

  const activeFilterCount = countActiveFilters(filters);
  const hasQuery = debouncedSearch.length > 0;
  // Browse-by-category is the default view. Any query, filter or explicit sort
  // switches to the flat results grid — otherwise sorting would appear to do
  // nothing, since the category rows have their own order.
  const isBrowsing = !hasQuery && activeFilterCount === 0 && filters.sort === "recent";

  const queryParams = useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...filtersToParams(filters),
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, filters]
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

  const clearAll = () => {
    setFilters(clearFilterValues(filters));
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

      {isFilterOpen && (
        <FilterPanel
          value={filters}
          onChange={setFilters}
          categories={categoryChips}
          mouldTypes={filterOptions?.mouldTypes ?? []}
        />
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
                    setFilters({ ...filters, categorySlug: section.category.slug });
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
