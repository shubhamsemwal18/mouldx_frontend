"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import FilterIcon from "./FilterIcon";
import styles from "./SearchBar.module.css";

const FALLBACK_SUGGESTIONS = ["chair mould", "table mould", "stool mould"];

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Opens the full-screen search sheet; `voice` starts dictation with it. */
  onOpen: (options?: { voice?: boolean }) => void;
  /** Real category names, so the rotating placeholder reflects the catalogue. */
  suggestions?: string[];
  /** Toggles the listing filters. The filter button is hidden without it. */
  onFilterToggle?: () => void;
  filterOpen?: boolean;
  activeFilterCount?: number;
}

export default function SearchBar({
  value,
  onChange,
  onOpen,
  suggestions,
  onFilterToggle,
  filterOpen = false,
  activeFilterCount = 0,
}: SearchBarProps) {
  const [index, setIndex] = useState(0);
  const rotating =
    suggestions && suggestions.length > 0
      ? suggestions.map((s) => `${s.toLowerCase()} mould`)
      : FALLBACK_SUGGESTIONS;

  // rotating placeholder
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % rotating.length);
    }, 2500);
    return () => clearInterval(id);
  }, [rotating.length]);

  return (
    <div className={styles.wrap} role="search">
      <div
        className={styles.bar}
        onClick={() => onOpen()}
        role="button"
        tabIndex={0}
        aria-label="Open search"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
      >
        <Search size={18} className={styles.searchIcon} aria-hidden />

        <div className={styles.inputArea}>
          {value ? (
            <span className={styles.valueText}>{value}</span>
          ) : (
            <span className={styles.placeholder} aria-hidden>
              Search&nbsp;
              <AnimatePresence mode="wait">
                <motion.span
                  key={index}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={styles.placeholderWord}
                >
                  &ldquo;{rotating[index % rotating.length]}&rdquo;
                </motion.span>
              </AnimatePresence>
            </span>
          )}
        </div>

        {value && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}

        {onFilterToggle && (
          <>
            <span className={styles.divider} aria-hidden />

            <button
              type="button"
              className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnActive : ""}`}
              aria-expanded={filterOpen}
              aria-label="Filter listings"
              onClick={(e) => {
                e.stopPropagation();
                onFilterToggle();
              }}
            >
              <FilterIcon size={18} />
              {activeFilterCount > 0 && (
                <span className={styles.filterCount}>{activeFilterCount}</span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
