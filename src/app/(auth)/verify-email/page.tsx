import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, MailOpen, XCircle } from "lucide-react";
import { verifyEmail } from "@/application/auth/verify-email";
import { ResendVerificationLink } from "@/features/authentication/components/resend-verification-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = { title: "Verify your email" };

/**
 * Email verification landing page. Per the PRD this is cosmetic — it never
 * blocks access — so every path here offers a way onward.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sent?: string }>;
}) {
  const { token, sent } = await searchParams;

  if (token) {
    let verified = false;
    try {
      await verifyEmail(token);
      verified = true;
    } catch {
      verified = false;
    }

    return (
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="items-center text-center">
            {verified ? (
              <CheckCircle2 className="mb-2 h-10 w-10 text-success" aria-hidden />
            ) : (
              <XCircle className="mb-2 h-10 w-10 text-destructive" aria-hidden />
            )}
            <CardTitle className="text-xl">
              {verified ? "Email verified" : "Link invalid or expired"}
            </CardTitle>
            <CardDescription>
              {verified
                ? "Thanks — your email is confirmed. You can log in and pick up where you left off."
                : "This verification link is no longer valid. You can still log in — verifying your email never blocks access."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Continue to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader className="items-center text-center">
          <MailOpen className="mb-2 h-10 w-10 text-primary" aria-hidden />
          <CardTitle className="text-xl">
            {sent ? "Check your inbox" : "Verify your email"}
          </CardTitle>
          <CardDescription>
            {sent
              ? "We've sent you a confirmation link. Your account is already active — verifying just ticks the onboarding box."
              : "Open the verification link from your email to confirm your address."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <ResendVerificationLink />
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">Continue to login</Link>
              </Button>
            </div>
          ) : (
            <Button asChild className="w-full">
              <Link href="/login">Continue to login</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
