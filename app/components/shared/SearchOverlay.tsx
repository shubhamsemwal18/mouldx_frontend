"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Search, Mic, X, Clock } from "lucide-react";
import styles from "./SearchOverlay.module.css";
import { getApiErrorMessage } from "@/app/lib/api";
import { publicApi } from "@/app/lib/public-api";
import { useRecentSearches } from "@/app/lib/recent-searches";
import { useVoiceSearch } from "@/app/lib/use-voice-search";
import type { PublicProductCard } from "@/app/lib/types";

const MAX_RESULTS = 24;
const SEARCH_DEBOUNCE_MS = 300;

const formatPrice = (value?: number) =>
  value === undefined ? "Price on request" : `₹${value.toLocaleString("en-IN")}/day`;

function ResultCard({
  product,
  onNavigate,
}: {
  product: PublicProductCard;
  onNavigate?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.image?.url;

  return (
    <article className={styles.card}>
      <Link href={`/explore/${product.slug}`} className={styles.cardLink} onClick={onNavigate}>
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
          {[product.category?.title, product.mouldTypes?.join(" · "), product.code]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </Link>
    </article>
  );
}

interface Props {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  /** Start dictation as soon as the sheet opens (mic tapped in the hero bar). */
  autoVoice?: boolean;
}

export default function SearchOverlay({
  open,
  query,
  onQueryChange,
  onClose,
  autoVoice = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  const [results, setResults] = useState<PublicProductCard[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Popular terms come from the real category list, not a hardcoded list.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      publicApi
        .listSections(1)
        .then((sections) => {
          if (!cancelled) setPopular(sections.map((section) => section.category.title).slice(0, 8));
        })
        .catch(() => {
          if (!cancelled) setPopular([]);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  // Live results for whatever is typed.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");

      publicApi
        .listProducts({
          ...(debouncedQuery ? { search: debouncedQuery } : {}),
          limit: MAX_RESULTS,
          page: 1,
        })
        .then((data) => {
          if (!cancelled) setResults(data.products);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(getApiErrorMessage(err, "Could not load results"));
          setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [debouncedQuery, open]);

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
            <button type="button" onClick={onClose} className={styles.backBtn} aria-label="Back">
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
                onBlur={() => commitSearch(query)}
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
              {voice.supported && (
                <button
                  type="button"
                  onClick={voice.toggle}
                  className={`${styles.micBtn} ${voice.listening ? styles.micActive : ""}`}
                  aria-label={voice.listening ? "Stop voice search" : "Search by voice"}
                  aria-pressed={voice.listening}
                >
                  <Mic size={16} />
                </button>
              )}
            </form>
          </div>

          <div className={styles.body}>
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

            {!hasQuery && popular.length > 0 && (
              <div className={styles.popular}>
                <p className={styles.sectionLabel}>Browse categories</p>
                <div className={styles.chips}>
                  {popular.map((term) => (
                    <button
                      key={term}
                      type="button"
                      className={styles.chip}
                      onClick={() => {
                        onQueryChange(term);
                        commitSearch(term);
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className={styles.sectionLabel}>
              {loading
                ? "Searching…"
                : hasQuery
                  ? `${results.length} result${results.length === 1 ? "" : "s"} for “${debouncedQuery}”`
                  : "All listings"}
            </p>

            {error && <p className={styles.emptyText}>{error}</p>}

            <div className={styles.list}>
              {results.map((product) => (
                <ResultCard
                  key={product._id}
                  product={product}
                  onNavigate={() => {
                    commitSearch(query);
                    onClose();
                  }}
                />
              ))}

              {!loading && results.length === 0 && !error && (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>No listings found</p>
                  <p className={styles.emptyText}>
                    Try a product, mould or component name — or browse the categories above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
