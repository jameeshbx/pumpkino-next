import Link from "next/link";
import type { ReactNode } from "react";

interface LegalSection {
  heading: string;
  body?: string[];
  list?: string[];
  table?: { headers: string[]; rows: string[][] };
}

interface LegalPageProps {
  title: string;
  updated: string;
  draftNotice?: string;
  sections: LegalSection[];
}

function slug(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Supports the prototype's inline cross-links, e.g. "See our [Refund Policy](/refund-policy)".
function renderWithLinks(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <Link key={i} href={match[2]!} className="text-primary hover:underline">
          {match[1]}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function LegalPage({ title, updated, draftNotice, sections }: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

      {draftNotice && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="font-semibold">Template draft</span> — {draftNotice}
        </div>
      )}

      <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {sections.map((s) => (
          <a key={s.heading} href={`#${slug(s.heading)}`} className="hover:text-foreground hover:underline">
            {s.heading}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.heading} id={slug(s.heading)} className="scroll-mt-24">
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            {s.body?.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {renderWithLinks(p)}
              </p>
            ))}
            {s.list && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                {s.list.map((item, i) => (
                  <li key={i}>{renderWithLinks(item)}</li>
                ))}
              </ul>
            )}
            {s.table && (
              <div className="mt-3 overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {s.table.headers.map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 align-top text-muted-foreground">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
