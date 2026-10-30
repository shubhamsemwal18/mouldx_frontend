import type { Product, ProductUpdateStatus } from "@/app/lib/types";

/**
 * What the owner sees on a listing: the admin approval `status`, except that an
 * approved listing with bookings paused shows as under maintenance.
 */
export type ListingDisplayStatus = "draft" | "pending" | "live" | "maintenance" | "rejected";

export const LISTING_STATUS_LABEL: Record<ListingDisplayStatus, string> = {
  draft: "DRAFT",
  pending: "PENDING APPROVAL",
  live: "LIVE",
  maintenance: "MAINTENANCE",
  rejected: "CHANGES REQUESTED",
};

export const isUnderMaintenance = (listing: Pick<Product, "availability">) =>
  listing.availability === "maintenance";

export const UPDATE_STATUS_LABEL: Record<ProductUpdateStatus, string> = {
  draft: "Update draft",
  in_review: "Update pending approval",
  rejected: "Update rejected · changes requested",
};

export const canEditListing = (listing: Pick<Product, "status" | "pendingUpdate">) =>
  listing.status !== "in_review" && listing.pendingUpdate?.status !== "in_review";

export const isAdminMaintenance = (
  listing: Pick<Product, "availability" | "maintenanceByRole">
) => isUnderMaintenance(listing) && listing.maintenanceByRole === "admin";

export function getListingDisplayStatus(
  listing: Pick<Product, "status" | "availability">
): ListingDisplayStatus {
  switch (listing.status) {
    case "approved":
      return isUnderMaintenance(listing) ? "maintenance" : "live";
    case "in_review":
      return "pending";
    default:
      return listing.status;
  }
}

/** Number of moulds in the set, from the stored moulds when the list sends them. */
export const getMouldSetCount = (listing: Pick<Product, "mouldCount" | "componentCount">) =>
  listing.mouldCount ?? listing.componentCount ?? 0;

export const formatMouldSet = (count: number) =>
  `Set of ${count} mould${count === 1 ? "" : "s"}`;
