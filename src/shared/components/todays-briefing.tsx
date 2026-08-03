import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Reminder } from "@/application/reminders/reminder-service";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

/**
 * "Today's briefing" (AI Assistant Plan: the "Pumpkin" character's home on
 * the dashboard). Reminders here are deterministic rule-engine output with
 * plain templated wording — the LLM wording layer (Section 4) is a later,
 * optional enhancement blocked on an API key, not a placeholder for this.
 */
export function TodaysBriefing({ reminders }: { reminders: Reminder[] }) {
  return (
    <Card className="mb-6 border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-sm">Today&apos;s briefing</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            Pumpkin
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up — nothing needs your attention right now.</p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id} className="text-sm">
                <Link href={r.href} className="text-foreground hover:underline">
                  {r.text}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
