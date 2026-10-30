"use client";

import OwnerArea from "@/app/components/owner/OwnerArea";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerArea>{children}</OwnerArea>;
}
