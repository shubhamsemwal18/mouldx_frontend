import type { NextConfig } from "next";

const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
const assetHost = (() => {
  if (!assetBaseUrl) return null;
  try {
    return new URL(assetBaseUrl).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/owner/onboarding/:path*", destination: "/onboarding/:path*", permanent: false }];
  },
  images: {
    remotePatterns: [
      // Listing media served straight from the S3 bucket.
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Explicit CDN host once ASSET_BASE_URL points at CloudFront.
      ...(assetHost ? [{ protocol: "https" as const, hostname: assetHost }] : []),
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
