"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function LegacyOnboardingRedirectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  void children;

  useEffect(() => {
    router.replace(`/owner${pathname}`);
  }, [pathname, router]);

  return null;
}
