"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Search, X, Clock, RefreshCw } from "lucide-react";
import FilterIcon from "./FilterIcon";
import FilterPanel from "./FilterPanel";
import CatalogueCard from "./CatalogueCard";
import styles from "./SearchOverlay.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { publicApi } from "@/app/lib/public-api";
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  filtersToParams,
  type CatalogueFilters,
} from "@/app/lib/catalogue-filters";
import { useRecentSearches } from "@/app/lib/recent-searches";
import { useVoiceSearch } from "@/app/lib/use-voice-search";
import type { PublicProductCard } from "@/app/lib/types";

const MAX_RESULTS = 12;
const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  /** Start dictation as soon as the sheet opens (mic tapped in the hero bar). */
  autoVoice?: boolean;
  /** The page's catalogue filters; passing a setter shows the filter button. */
  filters?: CatalogueFilters;
  onFiltersChange?: (filters: CatalogueFilters) => void;
}

export default function SearchOverlay({
  open,
  query,
  onQueryChange,
  onClose,
  autoVoice = false,
  filters = DEFAULT_FILTERS,
  onFiltersChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestVersion = useRef(0);
  const loadingMoreRef = useRef(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  const [results, setResults] = useState<PublicProductCard[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters);
  const filterParams = useMemo(() => filtersToParams(filters), [filters]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const { recent, add: addRecent, remove: removeRecent, clear: clearRecent } = useRecentSearches();

  const commitSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length >= 2) addRecent(trimmed);
    },
    [addRecent]
  );

  const voice = useVoiceSearch({
    onTranscript: onQueryChange,
    onFinal: commitSearch,
  });

  const hasQuery = debouncedQuery.length > 0;
  const showPopular = !hasQuery && activeFilterCount === 0 && filters.sort === "recent";
  const params = useMemo(() => ({
    ...filterParams,
    ...(debouncedQuery ? { search: debouncedQuery } : {}),
    sort: showPopular ? "popular" as const : filterParams.sort,
    limit: MAX_RESULTS,
  }), [debouncedQuery, filterParams, showPopular]);
  const [resultParams, setResultParams] = useState<typeof params | null>(null);
  const displayedResults = resultParams === params ? results : [];
  const resultsLoading = loading || resultParams !== params;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Lock scroll, focus the field and wire Escape while the sheet is open.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      voice.stop();
      // Reopening the sheet starts with the filter panel folded away.
      setFilterPanelOpen(false);
    };
    // `voice.stop` is stable; re-running on it would restart the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  // Dictation requested from the hero search bar.
  useEffect(() => {
    if (!open || !autoVoice || !voice.supported) return;

    const timer = window.setTimeout(() => voice.start(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoVoice, voice.supported]);

  // Live results for whatever is typed, narrowed by the chosen filters.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const version = ++requestVersion.current;
    loadingMoreRef.current = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadingMore(false);
      setError("");
      bodyRef.current?.scrollTo({ top: 0 });

      publicApi
        .listProducts({ ...params, page: 1 })
        .then((data) => {
          if (cancelled) return;
          setResults(data.products);
          setResultParams(params);
          setPage(1);
          setTotal(data.stats.matching);
          setHasNextPage(!showPopular && data.pagination.hasNextPage);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(getApiErrorMessage(err, "Could not load results"));
          setResults([]);
          setResultParams(params);
          setHasNextPage(false);
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
  }, [params, open, showPopular, reloadKey]);

  const loadMore = useCallback(() => {
    if (!open || resultsLoading || !hasNextPage || loadingMoreRef.current) return;
    const version = requestVersion.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    publicApi.listProducts({ ...params, page: page + 1 }).then((data) => {
      if (requestVersion.current !== version) return;
      setResults((current) => {
        const seen = new Set(current.map((product) => product._id));
        return [...current, ...data.products.filter((product) => !seen.has(product._id))];
      });
      setPage(page + 1);
      setHasNextPage(data.pagination.hasNextPage);
    }).catch((err) => {
      if (requestVersion.current === version) {
        setError(getApiErrorMessage(err, "Could not load more results"));
        setHasNextPage(false);
      }
    }).finally(() => {
      if (requestVersion.current === version) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    });
  }, [open, resultsLoading, hasNextPage, params, page]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!open || !sentinel || !hasNextPage || resultsLoading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { root: bodyRef.current, rootMargin: "240px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, resultsLoading, loadMore]);

  const voiceHint = useMemo(() => {
    if (voice.listening) return "Listening… speak now";
    if (voice.error === "denied") return "Microphone permission was denied";
    if (voice.error === "unsupported") return "Voice search is not supported in this browser";
    if (voice.error === "failed") return "Could not hear that — try again";
    return "";
  }, [voice.error, voice.listening]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Search listings"
        >
          <div className={styles.topBar}>
            <button type="button" onClick={() => { commitSearch(query); onClose(); }} className={styles.backBtn} aria-label="Back">
              <ArrowLeft size={22} />
            </button>

            <form
              className={styles.field}
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                commitSearch(query);
                inputRef.current?.blur();
              }}
            >
              <Search size={18} className={styles.fieldIcon} aria-hidden />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search product, mould or component..."
                className={styles.input}
                autoComplete="off"
                enterKeyHint="search"
                aria-label="Search listings"
              />
              {query.trim().length > 0 && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => {
                    onQueryChange("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              {onFiltersChange && (
                <button
                  type="button"
                  onClick={() => setFilterPanelOpen((v) => !v)}
                  className={`${styles.filterBtn} ${filterPanelOpen ? styles.filterBtnActive : ""}`}
                  aria-expanded={filterPanelOpen}
                  aria-controls="search-filter-panel"
                  aria-label="Filter listings"
                >
                  <FilterIcon size={18} />
                  {activeFilterCount > 0 && (
                    <span className={styles.filterCount}>{activeFilterCount}</span>
                  )}
                </button>
              )}
            </form>
          </div>

          <div className={styles.body} ref={bodyRef}>
            {filterPanelOpen && onFiltersChange && (
              <div id="search-filter-panel">
                <FilterPanel
                  value={filters}
                  onChange={onFiltersChange}
                  showAll={true}
                  wrapChips
                  className={styles.filterPanel}
                />
              </div>
            )}

            {voiceHint && <p className={styles.sectionLabel}>{voiceHint}</p>}

            {!hasQuery && recent.length > 0 && (
              <div className={styles.popular}>
                <div className={styles.recentHeader}>
                  <p className={styles.sectionLabel}>Recent searches</p>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className={styles.clearAllBtn}
                  >
                    Clear all
                  </button>
                </div>
                <div className={styles.chips}>
                  {recent.map((term) => (
                    <span key={term} className={styles.recentChip}>
                      <button
                        type="button"
                        className={styles.recentChipTerm}
                        onClick={() => onQueryChange(term)}
                      >
                        <Clock size={12} aria-hidden />
                        {term}
                      </button>
                      <button
                        type="button"
                        className={styles.recentChipRemove}
                        onClick={() => removeRecent(term)}
                        aria-label={`Remove ${term} from recent searches`}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className={styles.sectionLabel}>
              {resultsLoading
                ? "Searching…"
                : hasQuery
                  ? `${total} result${total === 1 ? "" : "s"} for “${debouncedQuery}”`
                  : activeFilterCount > 0
                    ? `${total} filtered result${total === 1 ? "" : "s"}`
                    : "Popular moulds"}
            </p>

            {error && resultParams === params && (
              <div className={styles.errorNotice} role="alert">
                <p>{/network error/i.test(error) ? "We couldn't reach the server. Please try again." : error}</p>
                <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={resultsLoading}>
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              </div>
            )}

            <div className={styles.list}>
              {displayedResults.map((product) => (
                <CatalogueCard
                  key={product._id}
                  product={product}
                  onNavigate={() => {
                    commitSearch(query);
                    onClose();
                  }}
                />
              ))}

              {!resultsLoading && displayedResults.length === 0 && !error && (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>No listings found</p>
                  <p className={styles.emptyText}>
                    Try a product, mould or component name — or browse the categories above.
                  </p>
                </div>
              )}
            </div>
            <div ref={sentinelRef} aria-hidden="true" />
            {loadingMore && <p className={styles.emptyText} role="status">Loading more...</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
