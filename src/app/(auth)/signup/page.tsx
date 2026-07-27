import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/features/authentication/components/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = role === "dmc" ? "dmc" : "agency";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
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
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
