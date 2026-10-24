"use client";

import CustomerHome from "@/app/components/home/CustomerHome";
import OwnerArea from "@/app/components/owner/OwnerArea";
import OwnerHome from "@/app/components/owner/OwnerHome";
import { useHomeView } from "@/app/lib/home-view";

/** One URL for both modes: the active role decides which home renders. */
export default function RootPage() {
  const view = useHomeView();

  if (view === "pending") return null;

  if (view === "owner") {
    return (
      <OwnerArea>
        <OwnerHome />
      </OwnerArea>
    );
  }

  return <CustomerHome />;
}
