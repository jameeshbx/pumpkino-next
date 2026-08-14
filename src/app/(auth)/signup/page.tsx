import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/features/authentication/components/signup-form";
import { AuthMarketingPanel } from "@/features/authentication/components/auth-marketing-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = role === "dmc" ? "dmc" : "agency";

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      <AuthMarketingPanel
        headline="Set up your workspace in a minute."
        body="Just the basics for now — we'll verify your business details after you subscribe."
        bullets={[
          "Travel agencies get a free 7-day trial, no credit card needed",
          "Add business/verification details later",
          "Connect with agencies/DMCs already on Pumpkino",
        ]}
      />
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xl">Create your account</CardTitle>
              <Badge variant="secondary" className="shrink-0">
                🎉 Free 7-day trial
              </Badge>
            </div>
            <CardDescription>
              Your account is active immediately — business verification is optional and can be done
              any time from your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm initialRole={initialRole} />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Log in
              </Link>{" "}
              ·{" "}
              <Link href="/pricing" className="font-medium text-primary underline-offset-4 hover:underline">
                View plans &amp; pricing
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
