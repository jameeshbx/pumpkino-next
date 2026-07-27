"use client";

import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";

/**
 * Global error boundary. Shows a generic message — never the underlying
 * error details (those stay in server logs).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side breadcrumb only; server errors are logged server-side.
    console.error("Unhandled error boundary", error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Our team has been notified — please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
