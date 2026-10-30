import { apiClient, type ApiResponse } from "@/app/lib/api";
import type { LatLng, Media } from "@/app/lib/types";

/* ------------------------------------------------------------------ *
 * Upload limits
 *
 * These mirror FILE_POLICIES on the server (`product` purpose). Checking them
 * in the browser means an oversized file is rejected instantly instead of
 * after a long upload that the API would refuse anyway.
 * ------------------------------------------------------------------ */

const MB = 1024 * 1024;

export const MAX_UPLOAD_BYTES = 50 * MB;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

export const formatBytes = (bytes: number) => {
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes >= 10 * MB ? 0 : 1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
};

/**
 * Returns a human-readable reason the file cannot be uploaded, or null when
 * it is acceptable.
 */
export function getUploadRejection(file: File, kind: "image" | "video"): string | null {
  const accepted = kind === "image" ? ACCEPTED_IMAGE_TYPES : ACCEPTED_VIDEO_TYPES;

  if (!accepted.includes(file.type)) {
    const names = kind === "image" ? "JPG, PNG or WebP" : "MP4 or MOV";
    return `“${file.name}” is not a supported ${kind} (use ${names}).`;
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)} — the limit is ${formatBytes(
      MAX_UPLOAD_BYTES
    )}.`;
  }

  if (file.size === 0) {
    return `“${file.name}” is empty.`;
  }

  return null;
}

/** Folder purposes the listing-media route accepts. */
export type MediaFolder = "product" | "products" | "moulds" | "image" | "images" | "bookings";

interface PresignedMediaUpload {
  mediaId: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
  key: string;
  bucket: string;
  visibility: "public" | "private";
  maxSize: number;
  publicUrl?: string;
}

export const mediaApi = {
  createUploadTarget(payload: {
    folder: MediaFolder;
    fileName: string;
    contentType: string;
    fileSize?: number;
  }) {
    return apiClient
      .post<ApiResponse<{ upload: PresignedMediaUpload }>>("/media/presigned-url", payload)
      .then((response) => response.data.data.upload);
  },

  confirm(mediaId: string, payload: { location?: LatLng; capturedAt?: string; size?: number }) {
    return apiClient
      .patch<ApiResponse<{ media: Media }>>(`/media/${mediaId}/confirm`, payload)
      .then((response) => response.data.data.media);
  },
};

/**
 * Uploads one file straight to S3 and returns the media id to reference it by.
 *
 * The server generates the S3 key, so the client never picks a path. The
 * geotag captured when the photo or video was taken is attached on confirm.
 */
export async function uploadListingMedia(
  file: File,
  options: { folder?: MediaFolder; location?: LatLng | null } = {}
): Promise<string> {
  const upload = await mediaApi.createUploadTarget({
    folder: options.folder ?? "product",
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    fileSize: file.size,
  });

  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: upload.headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${file.name}`);
  }

  await mediaApi.confirm(upload.mediaId, {
    location: options.location ?? undefined,
    size: file.size,
  });

  return upload.mediaId;
}
