"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setListingStatusAction } from "@/features/admin/actions";
import { Button } from "@/shared/components/ui/button";

interface ListingStatusToggleProps {
  listingId: string;
  status: "PUBLISHED" | "DRAFT";
}

export function ListingStatusToggle({ listingId, status }: ListingStatusToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const next = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  async function toggle() {
    setLoading(true);
    const result = await setListingStatusAction({ listingId, status: next });
    setLoading(false);
    if (result.ok) {
      toast.success(next === "PUBLISHED" ? "Listing published." : "Listing moved to draft.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Button
      size="sm"
      variant={status === "PUBLISHED" ? "outline" : "default"}
      onClick={toggle}
      disabled={loading}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {status === "PUBLISHED" ? "Unpublish" : "Publish"}
    </Button>
  );
}
