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
