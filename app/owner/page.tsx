"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setActiveRole } from "@/app/lib/active-role";

/**
 * The host dashboard now lives at `/`. Old links and bookmarks to `/owner`
 * still mean "host dashboard", so this keeps the host mode and moves to `/`.
 * The owner layout has already checked access before this renders.
 */
export default function OwnerRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    setActiveRole("owner");
    router.replace("/");
  }, [router]);

  return null;
}
