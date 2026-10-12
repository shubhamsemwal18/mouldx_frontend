import { apiClient, type ApiResponse } from "@/app/lib/api";
import type { MediaRef } from "@/app/lib/types";

interface PresignedUpload {
  bucket: string;
  key: string;
  uploadUrl: string;
  expiresIn: number;
  headers: Record<string, string>;
}

export async function uploadPrivateFile(file: File, folder: "kyc" | "firm" | "moulds" | "bookings") {
  const response = await apiClient.post<ApiResponse<{ upload: PresignedUpload }>>(
    "/uploads/presigned-url",
    {
      folder,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      fileSize: file.size,
    }
  );
  const upload = response.data.data.upload;

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: upload.headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("File upload failed");
  }

  return {
    bucket: upload.bucket,
    key: upload.key,
    mimeType: file.type,
    size: file.size,
  } satisfies MediaRef;
}

export async function getPrivateFilePreviewUrl(key: string) {
  const response = await apiClient.post<ApiResponse<{ previewUrl: string }>>("/uploads/presigned-read-url", {
    key,
  });

  return response.data.data.previewUrl;
}
