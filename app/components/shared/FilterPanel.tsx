"use client";

import styles from "./FilterPanel.module.css";
import {
  PRICE_RANGES,
  SORT_LABELS,
  clearFilterValues,
  countActiveFilters,
  type CatalogueFilters,
} from "@/app/lib/catalogue-filters";
import { useCatalogueCategories } from "@/app/lib/use-catalogue-categories";

interface FilterPanelProps {
  value: CatalogueFilters;
  onChange: (next: CatalogueFilters) => void;
  showAll?: boolean;
  /** Wrap chips onto new lines instead of scrolling each row sideways. */
  wrapChips?: boolean;
  className?: string;
}

export default function FilterPanel({
  value,
  onChange,
  showAll = true,
  wrapChips = false,
  className,
}: FilterPanelProps) {
  const { categorySlug, subCategorySlug, priceLabel, sort } = value;
  const roots = useCatalogueCategories(showAll);
  const children = useCatalogueCategories(showAll, categorySlug, Boolean(categorySlug));
  const set = (patch: Partial<CatalogueFilters>) => onChange({ ...value, ...patch });
  const chipClass = (active: boolean) => `${styles.chip} ${active ? styles.chipActive : ""}`;
  const activeFilterCount = countActiveFilters(value);

  return (
    <div
      className={`${styles.filterPanel} ${wrapChips ? styles.wrapChips : ""} ${className ?? ""}`}
    >
        <div className={styles.filterGroup}>
          <p className={styles.filterLabel}>Category</p>
          <div className={styles.chipsRow}>
            <button
              type="button"
              onClick={() => set({ categorySlug: "", subCategorySlug: "" })}
              className={chipClass(categorySlug === "")}
              aria-pressed={categorySlug === ""}
            >
              All
            </button>
            {roots.categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => set({ categorySlug: category.slug, subCategorySlug: "" })}
                className={chipClass(categorySlug === category.slug)}
                aria-pressed={categorySlug === category.slug}
              >
                {category.title}
              </button>
            ))}
          </div>
          {roots.loading && <p className={styles.optionStatus} role="status">Loading categories...</p>}
          {roots.error && <button type="button" className={styles.clearFilters} onClick={roots.retry}>Retry loading categories</button>}
        </div>

      {categorySlug && (
        <div className={styles.filterGroup}>
          <p className={styles.filterLabel}>Subcategory</p>
          <div className={styles.chipsRow}>
            <button
              type="button"
              onClick={() => set({ subCategorySlug: "" })}
              className={chipClass(subCategorySlug === "")}
              aria-pressed={subCategorySlug === ""}
            >
              All
            </button>
            {children.categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => set({ subCategorySlug: category.slug })}
                className={chipClass(subCategorySlug === category.slug)}
                aria-pressed={subCategorySlug === category.slug}
              >
                {category.title}
              </button>
            ))}
          </div>
          {children.loading && <p className={styles.optionStatus} role="status">Loading subcategories...</p>}
          {children.error && <button type="button" className={styles.clearFilters} onClick={children.retry}>Retry loading subcategories</button>}
          {!children.loading && !children.error && children.categories.length === 0 && <p className={styles.optionStatus}>No subcategories available.</p>}
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
              aria-pressed={priceLabel === range.label}
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
              aria-pressed={sort === option.value}
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
