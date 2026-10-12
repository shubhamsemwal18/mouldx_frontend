import { apiClient, type ApiResponse } from "@/app/lib/api";
import type {
  MediaRef,
  OwnerProfileVerification,
  ProfileVerificationStatus,
  User,
} from "@/app/lib/types";

export interface UserProfileVerificationPayload {
  userDetails: {
    fullName: string;
    email?: string;
  };
  personalDetails: {
    panNumber: string;
    panCard?: MediaRef;
  };
  firmDetails: {
    name: string;
    email: string;
    address: string;
    gstNumber: string;
    gstCertificate: MediaRef;
    msmeCertificate: MediaRef;
    electricityBill: MediaRef;
  };
  payoutDetails: {
    bankAccountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    upiId?: string;
  };
}

export const userApi = {
  submitProfileVerification(payload: UserProfileVerificationPayload) {
    return apiClient
      .post<
        ApiResponse<{
          user: User;
          profileVerification: OwnerProfileVerification;
          ownerProfileVerification?: OwnerProfileVerification;
          devEmailVerificationUrl?: string;
        }>
      >("/user/profile-verification", payload)
      .then((response) => response.data.data);
  },

  getMyProfileVerification() {
    return apiClient
      .get<
        ApiResponse<{
          profileVerificationStatus: ProfileVerificationStatus;
          profileVerification: OwnerProfileVerification | null;
          ownerProfileVerification?: OwnerProfileVerification | null;
        }>
      >("/user/profile-verification")
      .then((response) => response.data.data);
  },
};
