"use client";

import dynamic from "next/dynamic";
import type { MapPlace, MapStop } from "@/components/usa-map-inner";
import { theme } from "@/lib/theme";

const UsaMapInner = dynamic(() => import("@/components/usa-map-inner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 420,
        border: "none",
        borderRadius: 12,
        background: theme.fill.secondary,
      }}
    />
  ),
});

export function UsaMap({
  stops,
  cities,
  focusId,
  onAddCity,
}: {
  stops: MapStop[];
  cities: MapPlace[];
  focusId?: string | null;
  onAddCity?: (id: string) => void;
}) {
  return <UsaMapInner stops={stops} cities={cities} focusId={focusId} onAddCity={onAddCity} />;
}
