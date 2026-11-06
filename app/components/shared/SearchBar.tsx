"use client";

import { Search, X } from "lucide-react";
import FilterIcon from "./FilterIcon";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Opens the full-screen search sheet; `voice` starts dictation with it. */
  onOpen: (options?: { voice?: boolean }) => void;
  /** Toggles the listing filters. The filter button is hidden without it. */
  onFilterToggle?: () => void;
  filterOpen?: boolean;
  activeFilterCount?: number;
}

export default function SearchBar({
  value,
  onChange,
  onOpen,
  onFilterToggle,
  filterOpen = false,
  activeFilterCount = 0,
}: SearchBarProps) {
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
              Search moulds
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