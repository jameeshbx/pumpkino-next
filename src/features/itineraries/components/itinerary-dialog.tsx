"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPinned, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { upsertItineraryAction } from "@/features/itineraries/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

interface Day {
  title: string;
  description: string;
}

export interface ItineraryInitial {
  overview: string;
  hotelName: string;
  hotelCategory: string;
  days: Day[];
  source: "MANUAL" | "AI_DRAFT";
}

interface ItineraryDialogProps {
  leadId: string;
  leadName: string;
  initial: ItineraryInitial | null;
}

/**
 * Manual itinerary editor (PRD's "AI Itinerary Builder" — 100% manual today;
 * this is the foundation an AI draft slots into later, same shape, source
 * AI_DRAFT instead of MANUAL, per the AI Assistant Plan's design).
 */
export function ItineraryDialog({ leadId, leadName, initial }: ItineraryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [overview, setOverview] = useState(initial?.overview ?? "");
  const [hotelName, setHotelName] = useState(initial?.hotelName ?? "");
  const [hotelCategory, setHotelCategory] = useState(initial?.hotelCategory ?? "");
  const [days, setDays] = useState<Day[]>(
    initial?.days && initial.days.length > 0 ? initial.days : [{ title: "Day 1", description: "" }],
  );
  const [submitting, setSubmitting] = useState(false);

  function updateDay(index: number, patch: Partial<Day>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addDay() {
    setDays((prev) => [...prev, { title: `Day ${prev.length + 1}`, description: "" }]);
  }

  function removeDay(index: number) {
    setDays((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSubmitting(true);
    const result = await upsertItineraryAction({ leadId, overview, hotelName, hotelCategory, days });
    setSubmitting(false);
    if (result.ok) {
      toast.success(`Itinerary saved for ${leadName}.`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs">
          <MapPinned className="h-3.5 w-3.5" />
          {initial ? "Itinerary" : "Build itinerary"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Itinerary — {leadName}
            {initial?.source === "AI_DRAFT" && <Badge variant="secondary">AI-drafted</Badge>}
          </DialogTitle>
          <DialogDescription>
            Day-by-day plan shared with the customer. Nothing here is sent automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Hotel</label>
              <Input
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="e.g. Fragrant Nature Munnar"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Category</label>
              <Input
                value={hotelCategory}
                onChange={(e) => setHotelCategory(e.target.value)}
                placeholder="e.g. 4-star"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Overview</label>
            <Textarea
              rows={2}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="Short summary shown at the top of the shared itinerary"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Days</label>
              <Button type="button" variant="outline" size="sm" onClick={addDay}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add day
              </Button>
            </div>
            {days.map((day, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={day.title}
                    onChange={(e) => updateDay(i, { title: e.target.value })}
                    placeholder={`Day ${i + 1} title`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => removeDay(i)}
                    disabled={days.length <= 1}
                    aria-label={`Remove day ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  value={day.description}
                  onChange={(e) => updateDay(i, { description: e.target.value })}
                  placeholder="What happens this day"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save itinerary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
