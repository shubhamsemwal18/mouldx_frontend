export type UserRole = "customer" | "owner" | "admin";
export type ProfileVerificationStatus = "pending" | "in_review" | "approved" | "rejected";

export interface User {
  _id: string;
  id?: string;
  fullName: string;
  phone: string;
  email?: string;
  approvedRoles: UserRole[];
  profileVerificationStatus: ProfileVerificationStatus;
  phoneVerifiedAt?: string;
  emailVerifiedAt?: string;
  isBlocked?: boolean;
}

export interface MediaRef {
  key: string;
  bucket?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface Category {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  description?: string;
  parent?: string | Pick<Category, "_id" | "title" | "isActive"> | null;
  isActive: boolean;
  childCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OwnerProfileVerification {
  _id: string;
  id?: string;
  user: string | User;
  status: ProfileVerificationStatus;
  personalDetails?: {
    panNumber: string;
    panCard?: MediaRef;
  };
  firmDetails?: {
    name: string;
    email: string;
    address: string;
    gstNumber: string;
    gstCertificate: MediaRef;
    msmeCertificate: MediaRef;
    electricityBill: MediaRef;
  };
  payoutDetails?: {
    bankAccountNumber?: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    upiId?: string;
  };
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: User;
  resubmissionCount?: number;
}

export interface AuthPayload {
  tokens: {
    accessToken: string;
  };
  user: User;
  profileVerification?: OwnerProfileVerification | null;
  ownerProfileVerification?: OwnerProfileVerification | null;
}

/* ------------------------------------------------------------------ *
 * Listings (product + moulds)
 * ------------------------------------------------------------------ */

export type ProductStatus = "draft" | "in_review" | "approved" | "rejected";
export type MouldType = "Injection" | "Blow" | "Die-Cast" | "Compression";
export type RunnerType = "Hot Runner" | "Cold Runner";
export type MediaKind = "image" | "video" | "document";

/** Explicit keys — never GeoJSON's [lng, lat] ordering. */
export interface LatLng {
  lat: number;
  lng: number;
}

export interface Media {
  _id: string;
  key: string;
  bucket?: string;
  visibility: "public" | "private";
  kind: MediaKind;
  mimeType: string;
  size?: number;
  originalName?: string;
  status: "pending" | "ready";
  location?: LatLng;
  capturedAt?: string;
  /** Public asset URL, or a short-lived presigned read URL for private media. */
  url?: string;
  expiresIn?: number | null;
}

export interface Dimensions {
  length: number;
  breadth: number;
  height: number;
}

/** Descriptive fields only — media lives on the mould. */
export interface MouldComponent {
  name?: string;
  dimensions?: Partial<Dimensions>;
  weight?: number;
  surfaceFinish?: string;
}

export interface Mould {
  _id: string;
  product: string;
  owner: string;
  position: number;
  mouldNameOrId?: string;
  mouldType?: MouldType;
  yearOfManufacturing?: number;
  dimensions?: Partial<Dimensions>;
  weight?: number;
  cavities?: number;
  expectedCycleTime?: number;
  recommendedMachineTonnage?: number;
  runnerType?: RunnerType;
  changeableBrandLogo?: boolean;
  images?: Media[];
  videos?: Media[];
  component?: MouldComponent;
}

export interface ProductCategoryRef {
  _id: string;
  title: string;
  slug?: string;
}

export interface Product {
  _id: string;
  code: string;
  owner: string | User;
  name: string;
  category?: ProductCategoryRef | null;
  subCategory?: ProductCategoryRef | null;
  images?: Media[];
  videos?: Media[];
  dimensions?: Partial<Dimensions>;
  weight?: number;
  material?: string;
  surfaceFinish?: string;
  pricing?: {
    perDayCharges?: number;
    securityDeposit?: number;
  };
  componentCount?: number;
  status: ProductStatus;
  rejectionReason?: string | null;
  resubmissionCount?: number;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  publishedAt?: string | null;
  location?: LatLng;
  isEditable?: boolean;
  isPublished?: boolean;
  /* ---- Present on list responses only ---- */
  /** Resolved cover image (first of `images`), so lists stay lightweight. */
  image?: Media | null;
  mouldCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductDetail {
  product: Product;
  moulds: Mould[];
}

export interface ProductStatusStats {
  total: number;
  draft: number;
  in_review: number;
  approved: number;
  rejected: number;
}

/* ------------------------------------------------------------------ *
 * Public catalogue
 * ------------------------------------------------------------------ */

export interface PublicProductCard {
  _id: string;
  code: string;
  slug: string;
  name: string;
  category?: ProductCategoryRef | null;
  subCategory?: ProductCategoryRef | null;
  /** Cover image only; the full gallery comes from the detail endpoint. */
  image?: Media | null;
  imageCount?: number;
  videoCount?: number;
  pricing?: { perDayCharges?: number; securityDeposit?: number };
  componentCount?: number;
  mouldCount?: number;
  mouldTypes?: MouldType[];
  publishedAt?: string;
  location?: LatLng;
}

export interface PublicProductDetail {
  product: PublicProductCard & {
    images?: Media[];
    videos?: Media[];
    dimensions?: Partial<Dimensions>;
    weight?: number;
    material?: string;
    surfaceFinish?: string;
  };
  moulds: Mould[];
}

export interface CategorySection {
  category: { _id: string; title: string; slug: string };
  products: PublicProductCard[];
}

export interface CatalogueFilterOptions {
  mouldTypes: MouldType[];
  priceRange: { min: number; max: number };
}
