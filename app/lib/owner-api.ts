import { userApi, type UserProfileVerificationPayload } from "@/app/lib/user-api";

export type OwnerProfileVerificationPayload = UserProfileVerificationPayload;

export const ownerApi = userApi;
