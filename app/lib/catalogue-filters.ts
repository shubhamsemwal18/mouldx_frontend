import type { CatalogueParams, CatalogueSort } from "@/app/lib/public-api";
import type { MouldType } from "@/app/lib/types";

export const PRICE_RANGES = [
  { label: "Any price", min: undefined, max: undefined },
  { label: "Under ₹2,000", min: undefined, max: 1999 },
  { label: "₹2,000 – ₹3,500", min: 2000, max: 3500 },
  { label: "Above ₹3,500", min: 3501, max: undefined },
] as const;

export const SORT_LABELS: { value: CatalogueSort; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

/** The catalogue filters a visitor can pick, shared by the page and the search sheet. */
export interface CatalogueFilters {
  categorySlug: string;
  mouldType: MouldType | "";
  priceLabel: string;
  sort: CatalogueSort;
}

export const DEFAULT_FILTERS: CatalogueFilters = {
  categorySlug: "",
  mouldType: "",
  priceLabel: PRICE_RANGES[0].label,
  sort: "recent",
};

export const getPriceRange = (priceLabel: string) =>
  PRICE_RANGES.find((range) => range.label === priceLabel) ?? PRICE_RANGES[0];

/** Sort is not counted: it orders results rather than narrowing them. */
export const countActiveFilters = ({ categorySlug, mouldType, priceLabel }: CatalogueFilters) =>
  (categorySlug ? 1 : 0) + (mouldType ? 1 : 0) + (priceLabel !== PRICE_RANGES[0].label ? 1 : 0);

/** Clears the narrowing filters but keeps the chosen sort. */
export const clearFilterValues = (filters: CatalogueFilters): CatalogueFilters => ({
  ...DEFAULT_FILTERS,
  sort: filters.sort,
});

export const filtersToParams = ({
  categorySlug,
  mouldType,
  priceLabel,
  sort,
}: CatalogueFilters): CatalogueParams => {
  const range = getPriceRange(priceLabel);
  return {
    ...(categorySlug ? { categorySlug } : {}),
    ...(mouldType ? { mouldType } : {}),
    ...(range.min !== undefined ? { minPrice: range.min } : {}),
    ...(range.max !== undefined ? { maxPrice: range.max } : {}),
    sort,
  };
};
