"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SUPPORT_FAQS, SUPPORT_FAQ_CATEGORIES } from "@/features/support/faq-data";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export function SupportFaqList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return SUPPORT_FAQS.filter((f) => {
      const matchesCategory = category === "All" || f.category === category;
      const matchesSearch =
        !term || f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  return (
    <div>
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the help center…"
          className="pl-9"
        />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {["All", ...SUPPORT_FAQ_CATEGORIES].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              category === cat
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-primary/15 bg-transparent text-muted-foreground hover:text-primary",
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No results for &ldquo;{search}&rdquo; — try a different search or browse all topics.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((faq) => (
            <details key={faq.question} className="group rounded-xl border border-primary/10 bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4.5 py-3.5 text-sm font-bold text-primary marker:content-none">
                {faq.question}
                <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <p className="px-4.5 pb-4 text-[13px] leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
