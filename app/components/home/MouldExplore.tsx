"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
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
import CatalogueCard from "../shared/CatalogueCard";
import type {
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

/* ---------- Page section ---------- */

interface MouldExploreProps {
  enabled?: boolean;
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
  enabled = true,
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
  const [products, setProducts] = useState<PublicProductCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [matching, setMatching] = useState(0);
  const [totalPublished, setTotalPublished] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [sectionsError, setSectionsError] = useState("");
  const [sectionsLoading, setSectionsLoading] = useState(true);
  // Bumped by "Try again" to re-run both loaders.
  const [reloadKey, setReloadKey] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Guards against the observer firing repeatedly for the same page.
  const loadingMoreRef = useRef(false);
  const requestVersion = useRef(0);

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
  const resultQueryRef = useRef<typeof queryParams | null>(null);
  const [resultQuery, setResultQuery] = useState<typeof queryParams | null>(null);
  const currentProducts = resultQuery === queryParams ? products : [];
  const resultsLoading = loading || resultQuery !== queryParams;

  // Debounce typing so every keystroke does not hit the API.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [search]);

  // Ranked home sections also provide the headline total.
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setSectionsLoading(true);
      publicApi.listSections(10)
        .then(({ sections: loadedSections, stats }) => {
          if (cancelled) return;
          setSections(loadedSections);
          setTotalPublished(stats.totalPublished);
          setSectionsError("");
        })
        .catch((err) => {
          if (!cancelled) setSectionsError(friendlyError(err, "Could not load listings"));
        })
        .finally(() => {
          if (!cancelled) setSectionsLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reloadKey]);

  // First page for the current query. Filters and search reset to page 1.
  useEffect(() => {
    const version = ++requestVersion.current;
    loadingMoreRef.current = false;
    resultQueryRef.current = null;
    if (isBrowsing || !enabled) return;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadingMore(false);

      publicApi
        .listProducts({ ...queryParams, page: 1 })
        .then((data) => {
          if (cancelled) return;
          setError("");
          setProducts(data.products);
          resultQueryRef.current = queryParams;
          setResultQuery(queryParams);
          setPage(1);
          setHasNextPage(data.pagination.hasNextPage);
          setMatching(data.stats.matching);
          setTotalPublished(data.stats.totalPublished);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(friendlyError(err, "Could not load listings"));
          setProducts([]);
          resultQueryRef.current = queryParams;
          setResultQuery(queryParams);
          setHasNextPage(false);
          setMatching(0);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      if (requestVersion.current === version) requestVersion.current += 1;
      window.clearTimeout(timer);
    };
  }, [queryParams, reloadKey, isBrowsing, enabled]);

  useEffect(() => {
    queryParamsRef.current = queryParams;
  }, [queryParams]);

  const loadMore = useCallback(() => {
    if (!enabled || loading || resultQueryRef.current !== queryParams || isBrowsing || loadingMoreRef.current || !hasNextPage) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextPage = page + 1;
    const requestedFor = queryParams;
    const version = requestVersion.current;

    publicApi
      .listProducts({ ...queryParams, page: nextPage })
      .then((data) => {
        // The visitor searched or filtered while this page was loading.
        if (requestVersion.current !== version || queryParamsRef.current !== requestedFor) return;

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
        if (requestVersion.current !== version || queryParamsRef.current !== requestedFor) return;
        setError(friendlyError(err, "Could not load more listings"));
        setHasNextPage(false);
      })
      .finally(() => {
        if (requestVersion.current !== version) return;
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasNextPage, page, queryParams, loading, isBrowsing, enabled]);

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

  const subtitle = (() => {
    if (!isBrowsing && resultsLoading) return "Searching listings…";
    if ((isBrowsing ? sectionsLoading : loading) && totalPublished === null) return "Loading listings…";
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
  const catalogueError = isBrowsing ? sectionsError : resultQuery === queryParams ? error : "";
  const retrying = isBrowsing ? sectionsLoading : loading;

  return (
    <section id="mould-explore" className={styles.section}>
      <h2 className={styles.title}>Find a mould</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      {isFilterOpen && (
        <FilterPanel
          value={filters}
          onChange={setFilters}
          showAll={true}
        />
      )}

      {catalogueError && (
        <div className={styles.errorBox} role="alert">
          <div className={styles.errorContent}>
            <span className={styles.errorIcon} aria-hidden="true"><WifiOff size={21} strokeWidth={1.7} /></span>
            <div className={styles.errorCopy}>
              <h3>Moulds are temporarily unavailable</h3>
              <p>{catalogueError}</p>
            </div>
          </div>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={styles.retryButton} disabled={retrying}>
            <RefreshCw size={16} className={retrying ? styles.retrySpinner : undefined} aria-hidden="true" />
            {retrying ? "Retrying..." : "Try again"}
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
                    setFilters({ ...filters, categorySlug: section.category.slug, subCategorySlug: "" });
                    setIsFilterOpen(false);
                  }}
                  aria-label={`See all ${section.category.title} listings`}
                >
                  →
                </button>
              </div>
              <div className={styles.row}>
                {section.products.map((product) => (
                  <CatalogueCard key={product._id} product={product} className={styles.cardRow} />
                ))}
              </div>
            </div>
          ))}

          {!sectionsLoading && sections.length === 0 && !catalogueError && (
            <p className={styles.emptyText}>
              No listings are published yet. Approved listings appear here automatically.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {currentProducts.map((product) => (
              <CatalogueCard key={product._id} product={product} />
            ))}
          </div>

          {resultsLoading && currentProducts.length === 0 && (
            <p className={styles.emptyText}>Searching…</p>
          )}

          {!resultsLoading && currentProducts.length === 0 && !error && (
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

          {!resultsLoading && !hasNextPage && currentProducts.length > 0 && !error && (
            <p className={styles.emptyText}>
              {matching === currentProducts.length
                ? "That's everything."
                : `Showing all ${currentProducts.length} results.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
