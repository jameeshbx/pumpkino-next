import type { Metadata } from "next";
import { SupportFaqList } from "@/features/support/components/support-faq-list";
import { SupportContactForm } from "@/features/support/components/support-contact-form";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-primary">How can we help?</h1>
        <p className="mt-2 text-muted-foreground">Answers to common questions, or reach our team directly.</p>
      </div>

      <SupportFaqList />

      <div className="mt-14">
        <h2 className="mb-5 text-xl font-bold text-primary">Still stuck? Contact us</h2>
        <SupportContactForm />
      </div>
    </section>
  );
}
