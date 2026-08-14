import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/features/authentication/components/login-form";
import { AuthMarketingPanel } from "@/features/authentication/components/auth-marketing-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      <AuthMarketingPanel
        headline="One platform connecting agencies and DMCs — end to end."
        body="Quotes, itineraries, inventory blocking, payments and invoices, all in one place — whichever side of the booking you're on."
        bullets={[
          "Travel agencies manage leads, itineraries and DMC bookings",
          "DMCs manage quote requests, inventory and payments",
          "Pumpkino-to-Pumpkino requests sync instantly, no email needed",
        ]}
      />
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Log in to your Pumpkino workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={callbackUrl} />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to Pumpkino?{" "}
              <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                Create an account
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
