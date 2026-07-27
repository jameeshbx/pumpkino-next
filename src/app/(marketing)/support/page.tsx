import type { Metadata } from "next";
import { LifeBuoy, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Support" };

const CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    body: "support@pumpkino.com — we reply within one business day.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp business line",
    body: "+91 90000 00000, Monday–Saturday, 9:00–18:00 IST.",
  },
  {
    icon: LifeBuoy,
    title: "Priority support",
    body: "Growth and Scale plans include a dedicated support queue.",
  },
];

export default function SupportPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Support</h1>
      <p className="mt-3 text-muted-foreground">
        Stuck on anything — onboarding, billing, verification, or a dispute? We&apos;re here.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {CHANNELS.map((c) => (
          <Card key={c.title}>
            <CardContent className="p-6">
              <c.icon className="mb-3 h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-semibold">{c.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
