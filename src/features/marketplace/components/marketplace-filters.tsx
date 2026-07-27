"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const ALL = "all";

interface MarketplaceFiltersProps {
  countries: string[];
  services: string[];
}

/** GET-based filters so results stay server-rendered, shareable and cacheable. */
export function MarketplaceFilters({ countries, services }: MarketplaceFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    router.replace(`/marketplace?${next.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search DMCs"
          placeholder="Search destinations, cities, services…"
          className="pl-9"
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
        />
      </div>
      <Select value={params.get("country") ?? ALL} onValueChange={(v) => setParam("country", v)}>
        <SelectTrigger className="sm:w-44" aria-label="Filter by country">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All countries</SelectItem>
          {countries.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("service") ?? ALL} onValueChange={(v) => setParam("service", v)}>
        <SelectTrigger className="sm:w-48" aria-label="Filter by service">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All services</SelectItem>
          {services.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("sort") ?? "bookings"} onValueChange={(v) => setParam("sort", v)}>
        <SelectTrigger className="sm:w-44" aria-label="Sort results">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bookings">Most bookings</SelectItem>
          <SelectItem value="response">Fastest response</SelectItem>
          <SelectItem value="name">Name (A–Z)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
