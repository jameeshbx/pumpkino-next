import { Check } from "lucide-react";

interface AuthMarketingPanelProps {
  headline: string;
  body: string;
  bullets: string[];
}

/** Left-column marketing panel for the 2-column auth layout (login/signup), ported from
 * pumpkino-login.html / pumpkino-signup.html's left panel copy. Hidden below `lg`. */
export function AuthMarketingPanel({ headline, body, bullets }: AuthMarketingPanelProps) {
  return (
    <div className="hidden rounded-2xl bg-primary p-10 text-primary-foreground lg:block">
      <h2 className="font-serif text-2xl font-bold leading-snug">{headline}</h2>
      <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">{body}</p>
      <ul className="mt-8 space-y-4">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
            <span className="text-sm text-primary-foreground/90">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
