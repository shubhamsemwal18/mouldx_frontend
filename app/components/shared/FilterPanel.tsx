"use client";

import styles from "./FilterPanel.module.css";
import {
  PRICE_RANGES,
  SORT_LABELS,
  clearFilterValues,
  countActiveFilters,
  type CatalogueFilters,
} from "@/app/lib/catalogue-filters";
import type { MouldType } from "@/app/lib/types";

interface FilterPanelProps {
  value: CatalogueFilters;
  onChange: (next: CatalogueFilters) => void;
  categories: { slug: string; title: string }[];
  mouldTypes: MouldType[];
  /** Wrap chips onto new lines instead of scrolling each row sideways. */
  wrapChips?: boolean;
  className?: string;
}

export default function FilterPanel({
  value,
  onChange,
  categories,
  mouldTypes,
  wrapChips = false,
  className,
}: FilterPanelProps) {
  const { categorySlug, mouldType, priceLabel, sort } = value;
  const set = (patch: Partial<CatalogueFilters>) => onChange({ ...value, ...patch });
  const chipClass = (active: boolean) => `${styles.chip} ${active ? styles.chipActive : ""}`;
  const activeFilterCount = countActiveFilters(value);

  return (
    <div
      className={`${styles.filterPanel} ${wrapChips ? styles.wrapChips : ""} ${className ?? ""}`}
    >
      {categories.length > 0 && (
        <div className={styles.filterGroup}>
          <p className={styles.filterLabel}>Category</p>
          <div className={styles.chipsRow}>
            <button
              type="button"
              onClick={() => set({ categorySlug: "" })}
              className={chipClass(categorySlug === "")}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => set({ categorySlug: category.slug })}
                className={chipClass(categorySlug === category.slug)}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {mouldTypes.length > 0 && (
        <div className={styles.filterGroup}>
          <p className={styles.filterLabel}>Mould type</p>
          <div className={styles.chipsRow}>
            <button
              type="button"
              onClick={() => set({ mouldType: "" })}
              className={chipClass(mouldType === "")}
            >
              All
            </button>
            {mouldTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => set({ mouldType: type })}
                className={chipClass(mouldType === type)}
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
              onClick={() => set({ priceLabel: range.label })}
              className={chipClass(priceLabel === range.label)}
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
              onClick={() => set({ sort: option.value })}
              className={chipClass(sort === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={() => onChange(clearFilterValues(value))}
          className={styles.clearFilters}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
