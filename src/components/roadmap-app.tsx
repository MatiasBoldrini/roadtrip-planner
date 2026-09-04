"use client";

import { startTransition, ViewTransition, type ReactNode } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  H1,
  H2,
  IconButton,
  Link,
  Pill,
  Row,
  Stack,
  Table,
  Text,
  TextInput,
  useCanvasState,
  useEffect,
  useHostTheme,
  useRef,
  useState,
} from "@/lib/canvas-compat";
import { UsaMap } from "@/components/usa-map";

type Coast = "este" | "oeste" | "sur" | "escala";
type Source = "notion" | "estimado";
type Filter = Coast | "ambas" | "mexico";
type Mode = "tren" | "vuelo" | "local";
type Extra = { id: string; name: string; amount: number };

const DEFAULT_EXTRAS: Extra[] = [];

type City = {
  id: string;
  name: string;
  state: string;
  coast: Coast;
  lat: number;
  lon: number;
  low: number;
  high: number;
  source: Source;
};

type Hop = {
  mode: Mode;
  hours: number;
  door: number;
  costLow: number;
  costHigh: number;
  source: Source;
  name: string;
};

type Stop = { city: string; days: number };
type Block = { city: string; start: string; days: number };

type Drag =
  | { kind: "add"; city: string }
  | { kind: "order"; from: number }
  | {
      kind: "resize";
      index: number;
      partner: number | null;
      edge: "start" | "end";
      originX: number;
      originDays: number;
      originPartnerDays: number;
      pxPerDay: number;
    };

type Ptr = {
  clientX: number;
  clientY: number;
  pointerId: number;
  stopPropagation: () => void;
  currentTarget: HTMLElement;
};

type Grab = {
  kind: "order" | "add";
  city: string;
  days: number;
  event: boolean;
  from: number | null;
  width: number;
  height: number;
  grabX: number;
  grabY: number;
  x: number;
  y: number;
};

function hop(
  mode: Mode,
  hours: number,
  door: number,
  costLow: number,
  costHigh: number,
  source: Source,
  name: string,
): Hop {
  return { mode, hours, door, costLow, costHigh, source, name };
}

const EVENT = "2026-11-05";
const FLIGHT = 1059;
const CURSOR = 1200;
const RANGE_START = "2026-10-20";
const RANGE_END = "2026-11-22";
const SHORT_MONTH = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const PILL_PAGE = 4;

const CITIES: City[] = [
  { id: "ny", name: "Nueva York", state: "Nueva York", coast: "este", lat: 40.71, lon: -74.01, low: 98.6666666666667, high: 98.6666666666667, source: "notion" },
  { id: "dc", name: "Washington D. C.", state: "D. C.", coast: "este", lat: 38.91, lon: -77.04, low: 88.386, high: 88.386, source: "notion" },
  { id: "phl", name: "Filadelfia", state: "Pennsylvania", coast: "este", lat: 39.95, lon: -75.17, low: 102.56, high: 102.56, source: "notion" },
  { id: "bos", name: "Boston", state: "Massachusetts", coast: "este", lat: 42.36, lon: -71.06, low: 114.19, high: 114.19, source: "notion" },
  { id: "chi", name: "Chicago", state: "Illinois", coast: "este", lat: 41.88, lon: -87.63, low: 75.475, high: 75.475, source: "notion" },
  { id: "bal", name: "Baltimore", state: "Maryland", coast: "este", lat: 39.29, lon: -76.61, low: 6, high: 6, source: "notion" },
  { id: "nwk", name: "Newark", state: "Nueva Jersey", coast: "este", lat: 40.74, lon: -74.17, low: 85, high: 120, source: "estimado" },
  { id: "wil", name: "Wilmington", state: "Delaware", coast: "este", lat: 39.74, lon: -75.55, low: 65, high: 100, source: "estimado" },
  { id: "pvd", name: "Providence", state: "Rhode Island", coast: "este", lat: 41.82, lon: -71.41, low: 75, high: 115, source: "estimado" },
  { id: "pwm", name: "Portland ME", state: "Maine", coast: "este", lat: 43.66, lon: -70.26, low: 80, high: 120, source: "estimado" },
  { id: "buf", name: "Niagara", state: "Nueva York", coast: "este", lat: 43.1, lon: -79.05, low: 55, high: 90, source: "estimado" },
  { id: "pit", name: "Pittsburgh", state: "Pennsylvania", coast: "este", lat: 40.44, lon: -80, low: 55, high: 90, source: "estimado" },
  { id: "ric", name: "Richmond", state: "Virginia", coast: "este", lat: 37.54, lon: -77.44, low: 60, high: 95, source: "estimado" },
  { id: "rdu", name: "Raleigh", state: "Carolina del Norte", coast: "sur", lat: 35.78, lon: -78.64, low: 60, high: 95, source: "estimado" },
  { id: "clt", name: "Charlotte", state: "Carolina del Norte", coast: "sur", lat: 35.23, lon: -80.84, low: 70, high: 105, source: "estimado" },
  { id: "chs", name: "Charleston", state: "Carolina del Sur", coast: "sur", lat: 32.78, lon: -79.93, low: 80, high: 120, source: "estimado" },
  { id: "sav", name: "Savannah", state: "Georgia", coast: "sur", lat: 32.08, lon: -81.09, low: 70, high: 105, source: "estimado" },
  { id: "atl", name: "Atlanta", state: "Georgia", coast: "sur", lat: 33.75, lon: -84.39, low: 65, high: 100, source: "estimado" },
  { id: "mia", name: "Miami", state: "Florida", coast: "sur", lat: 25.76, lon: -80.19, low: 85, high: 130, source: "estimado" },
  { id: "orl", name: "Orlando", state: "Florida", coast: "sur", lat: 28.54, lon: -81.38, low: 70, high: 110, source: "estimado" },
  { id: "tpa", name: "Tampa", state: "Florida", coast: "sur", lat: 27.95, lon: -82.46, low: 70, high: 110, source: "estimado" },
  { id: "jax", name: "Jacksonville", state: "Florida", coast: "sur", lat: 30.33, lon: -81.66, low: 60, high: 95, source: "estimado" },
  { id: "fll", name: "Fort Lauderdale", state: "Florida", coast: "sur", lat: 26.12, lon: -80.14, low: 75, high: 120, source: "estimado" },
  { id: "eyw", name: "Key West", state: "Florida", coast: "sur", lat: 24.56, lon: -81.78, low: 95, high: 150, source: "estimado" },
  { id: "ust", name: "San Agustín", state: "Florida", coast: "sur", lat: 29.89, lon: -81.31, low: 70, high: 110, source: "estimado" },
  { id: "msy", name: "Nueva Orleans", state: "Luisiana", coast: "sur", lat: 29.95, lon: -90.07, low: 75, high: 115, source: "estimado" },
  { id: "bna", name: "Nashville", state: "Tennessee", coast: "sur", lat: 36.16, lon: -86.78, low: 75, high: 115, source: "estimado" },
  { id: "mem", name: "Memphis", state: "Tennessee", coast: "sur", lat: 35.15, lon: -90.05, low: 55, high: 90, source: "estimado" },
  { id: "aus", name: "Austin", state: "Texas", coast: "sur", lat: 30.27, lon: -97.74, low: 70, high: 110, source: "estimado" },
  { id: "hou", name: "Houston", state: "Texas", coast: "sur", lat: 29.76, lon: -95.37, low: 60, high: 95, source: "estimado" },
  { id: "sat", name: "San Antonio", state: "Texas", coast: "sur", lat: 29.42, lon: -98.49, low: 55, high: 90, source: "estimado" },
  { id: "pty", name: "Ciudad de Panamá", state: "Panamá", coast: "escala", lat: 8.98, lon: -79.52, low: 50, high: 80, source: "estimado" },
  { id: "boc", name: "Bocas del Toro", state: "Panamá", coast: "escala", lat: 9.34, lon: -82.25, low: 45, high: 75, source: "estimado" },
  { id: "bqt", name: "Boquete", state: "Panamá", coast: "escala", lat: 8.78, lon: -82.43, low: 40, high: 65, source: "estimado" },
  { id: "sfo", name: "San Francisco", state: "California", coast: "oeste", lat: 37.77, lon: -122.42, low: 110, high: 160, source: "estimado" },
  { id: "lax", name: "Los Ángeles", state: "California", coast: "oeste", lat: 34.05, lon: -118.24, low: 95, high: 145, source: "estimado" },
  { id: "san", name: "San Diego", state: "California", coast: "oeste", lat: 32.72, lon: -117.16, low: 85, high: 130, source: "estimado" },
  { id: "pdx", name: "Portland OR", state: "Oregón", coast: "oeste", lat: 45.52, lon: -122.68, low: 80, high: 125, source: "estimado" },
  { id: "sea", name: "Seattle", state: "Washington", coast: "oeste", lat: 47.61, lon: -122.33, low: 95, high: 145, source: "estimado" },
  { id: "las", name: "Las Vegas", state: "Nevada", coast: "oeste", lat: 36.17, lon: -115.14, low: 70, high: 120, source: "estimado" },
  { id: "phx", name: "Phoenix", state: "Arizona", coast: "oeste", lat: 33.45, lon: -112.07, low: 70, high: 110, source: "estimado" },
];

const KNOWN_HOPS: Record<string, Hop> = {
  "ny|dc": hop("tren", 3.5, 4.3, 17, 17, "notion", "Amtrak NY → D. C."),
  "dc|phl": hop("tren", 1.75, 2.4, 11, 11, "notion", "Amtrak D. C. → Filadelfia"),
  "ny|phl": hop("tren", 1.35, 2.1, 11, 11, "notion", "Amtrak Filadelfia ↔ NY"),
  "bos|dc": hop("tren", 8, 9, 54, 54, "notion", "Amtrak D. C. → Boston"),
  "bos|ny": hop("tren", 4.1, 5, 22, 22, "notion", "Amtrak Boston ↔ NY"),
  "bal|dc": hop("tren", 0.7, 1.4, 6, 6, "notion", "Amtrak D. C. → Baltimore"),
  "bal|ny": hop("tren", 2.75, 3.5, 17, 17, "notion", "Amtrak Baltimore ↔ NY"),
  "nwk|ny": hop("local", 0.5, 0.8, 3, 15, "estimado", "PATH / tren NJ"),
  "ny|wil": hop("tren", 1.8, 2.5, 15, 40, "estimado", "Amtrak NY ↔ Wilmington"),
  "phl|wil": hop("tren", 0.4, 1, 8, 20, "estimado", "Amtrak Filadelfia ↔ Wilmington"),
  "bal|phl": hop("tren", 1.1, 1.8, 10, 25, "estimado", "Amtrak Filadelfia ↔ Baltimore"),
  "bos|phl": hop("tren", 5, 6, 35, 80, "estimado", "Amtrak Boston ↔ Filadelfia"),
  "bos|pvd": hop("tren", 0.8, 1.3, 12, 30, "estimado", "Amtrak Boston ↔ Providence"),
  "ny|pvd": hop("tren", 3.3, 4, 20, 50, "estimado", "Amtrak NY ↔ Providence"),
  "ny|pwm": hop("tren", 5.5, 6.5, 30, 70, "estimado", "Tren / bus NY ↔ Portland ME"),
  "dc|ric": hop("tren", 2.2, 3, 20, 45, "estimado", "Amtrak D. C. ↔ Richmond"),
  "dc|mia": hop("vuelo", 2.75, 6, 70, 170, "estimado", "Vuelo D. C. ↔ Miami"),
  "mia|ny": hop("vuelo", 3, 6.2, 80, 180, "estimado", "Vuelo NY ↔ Miami"),
  "ny|orl": hop("vuelo", 2.8, 6, 70, 170, "estimado", "Vuelo NY ↔ Orlando"),
  "atl|ny": hop("vuelo", 2.4, 5.5, 70, 180, "estimado", "Vuelo NY ↔ Atlanta"),
  "fll|mia": hop("local", 0.6, 1.2, 8, 35, "estimado", "Auto / tren Miami ↔ Fort Lauderdale"),
  "eyw|mia": hop("vuelo", 0.9, 3.2, 40, 110, "estimado", "Vuelo Miami ↔ Key West"),
  "jax|mia": hop("vuelo", 1.3, 4, 40, 120, "estimado", "Vuelo Jacksonville ↔ Miami"),
  "jax|orl": hop("tren", 2.2, 3, 20, 50, "estimado", "Auto / tren Jacksonville ↔ Orlando"),
  "jax|ust": hop("local", 1, 1.4, 15, 40, "estimado", "Auto Jacksonville ↔ San Agustín"),
  "aus|hou": hop("vuelo", 0.8, 3.2, 40, 110, "estimado", "Vuelo Austin ↔ Houston"),
  "aus|sat": hop("local", 1.5, 2, 20, 50, "estimado", "Auto Austin ↔ San Antonio"),
  "hou|sat": hop("vuelo", 0.8, 3, 35, 100, "estimado", "Vuelo Houston ↔ San Antonio"),
  "hou|mia": hop("vuelo", 2.3, 5.5, 70, 170, "estimado", "Vuelo Houston ↔ Miami"),
  "hou|msy": hop("vuelo", 1.2, 4, 50, 140, "estimado", "Vuelo Houston ↔ Nueva Orleans"),
  "hou|ny": hop("vuelo", 3.6, 7, 90, 220, "estimado", "Vuelo NY ↔ Houston"),
  "aus|ny": hop("vuelo", 3.8, 7.2, 90, 230, "estimado", "Vuelo NY ↔ Austin"),
  "boc|pty": hop("vuelo", 1.1, 3.2, 40, 120, "estimado", "Vuelo Panamá ↔ Bocas"),
  "bqt|pty": hop("vuelo", 1, 3, 40, 100, "estimado", "Vuelo Panamá ↔ David / Boquete"),
  "boc|bqt": hop("vuelo", 1.2, 3.4, 50, 130, "estimado", "Vuelo Bocas ↔ David / Boquete"),
  "mia|pty": hop("vuelo", 3.1, 6.2, 160, 280, "estimado", "Copa Panamá ↔ Miami"),
  "fll|pty": hop("vuelo", 3.1, 6.2, 160, 280, "estimado", "Copa Panamá ↔ Fort Lauderdale"),
  "orl|pty": hop("vuelo", 3.5, 6.6, 170, 290, "estimado", "Copa Panamá ↔ Orlando"),
  "pty|tpa": hop("vuelo", 3.3, 6.4, 160, 280, "estimado", "Copa Panamá ↔ Tampa"),
  "dc|pty": hop("vuelo", 4.8, 8, 180, 330, "estimado", "Copa Panamá ↔ D. C."),
  "ny|pty": hop("vuelo", 5.2, 8.4, 200, 350, "estimado", "Copa Panamá ↔ NY"),
  "nwk|pty": hop("vuelo", 5.2, 8.4, 200, 350, "estimado", "Copa Panamá ↔ Newark"),
  "bos|pty": hop("vuelo", 5.5, 8.8, 210, 360, "estimado", "Copa Panamá ↔ Boston"),
  "atl|pty": hop("vuelo", 3.8, 7, 170, 300, "estimado", "Copa Panamá ↔ Atlanta"),
  "hou|pty": hop("vuelo", 4.3, 7.5, 170, 300, "estimado", "Copa Panamá ↔ Houston"),
  "chi|pty": hop("vuelo", 5.2, 8.5, 200, 350, "estimado", "Copa Panamá ↔ Chicago"),
  "lax|pty": hop("vuelo", 6.5, 10, 220, 400, "estimado", "Copa Panamá ↔ Los Ángeles"),
  "pty|sfo": hop("vuelo", 7, 10.5, 230, 410, "estimado", "Copa Panamá ↔ San Francisco"),
  "las|pty": hop("vuelo", 6.3, 9.8, 220, 400, "estimado", "Copa Panamá ↔ Las Vegas"),
  "chi|ny": hop("vuelo", 2.5, 5.5, 80, 200, "estimado", "Vuelo NY ↔ Chicago"),
  "lax|ny": hop("vuelo", 6, 10.5, 180, 380, "estimado", "Vuelo NY ↔ Los Ángeles"),
  "ny|sfo": hop("vuelo", 6.5, 11, 180, 380, "estimado", "Vuelo NY ↔ San Francisco"),
  "ny|san": hop("vuelo", 6, 10.5, 180, 400, "estimado", "Vuelo NY ↔ San Diego"),
  "ny|sea": hop("vuelo", 6.2, 10.5, 180, 400, "estimado", "Vuelo NY ↔ Seattle"),
  "ny|las": hop("vuelo", 5.5, 10, 150, 350, "estimado", "Vuelo NY ↔ Las Vegas"),
  "lax|sfo": hop("vuelo", 1.5, 4.5, 50, 140, "estimado", "Vuelo SF ↔ LA"),
  "lax|san": hop("tren", 3, 4, 20, 80, "estimado", "Tren / vuelo LA ↔ San Diego"),
  "las|lax": hop("vuelo", 1.2, 4, 40, 130, "estimado", "Vuelo LA ↔ Las Vegas"),
  "pdx|sea": hop("vuelo", 0.9, 3.5, 40, 120, "estimado", "Vuelo Seattle ↔ Portland"),
  "pdx|sfo": hop("vuelo", 1.7, 4.5, 50, 140, "estimado", "Vuelo SF ↔ Portland"),
};

const PRESETS: Record<string, { label: string; stops: Stop[] }> = {
  libre: { label: "En blanco", stops: [{ city: "ny", days: 1 }] },
  A: {
    label: "Filadelfia",
    stops: [
      { city: "phl", days: 2 },
      { city: "dc", days: 6 },
      { city: "ny", days: 5 },
    ],
  },
  B: {
    label: "Boston",
    stops: [
      { city: "bos", days: 2 },
      { city: "dc", days: 6 },
      { city: "ny", days: 5 },
    ],
  },
  C: {
    label: "Baltimore",
    stops: [
      { city: "dc", days: 6 },
      { city: "bal", days: 2 },
      { city: "ny", days: 5 },
    ],
  },
  sur: {
    label: "Miami",
    stops: [
      { city: "dc", days: 3 },
      { city: "mia", days: 4 },
      { city: "ny", days: 6 },
    ],
  },
  texas: {
    label: "Texas",
    stops: [
      { city: "aus", days: 3 },
      { city: "hou", days: 2 },
      { city: "ny", days: 6 },
    ],
  },
  escala: {
    label: "Panamá",
    stops: [
      { city: "pty", days: 3 },
      { city: "ny", days: 6 },
    ],
  },
  oeste: {
    label: "California",
    stops: [
      { city: "sfo", days: 3 },
      { city: "lax", days: 3 },
      { city: "ny", days: 7 },
    ],
  },
};

function cityById(id: string) {
  return CITIES.find((city) => city.id === id);
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function cityMatches(city: City, query: string) {
  const q = fold(query.trim());
  if (!q) return true;
  return fold(`${city.name} ${city.state} ${city.id}`).includes(q);
}

function hopKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

const NEC = new Set(["ny", "nwk", "phl", "wil", "bal", "dc", "bos", "pvd", "pwm", "ric"]);
const CA_SOUTH = new Set(["lax", "san"]);

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function milesBetween(a: City, b: City) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 3959 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function estimateHop(a: City, b: City): Hop {
  const miles = milesBetween(a, b);
  if (miles < 35) {
    const hours = Math.max(0.4, miles / 28);
    return hop("local", round1(hours), round1(hours + 0.3), 4, 18, "estimado", "Local / tren corto");
  }
  const rail =
    (NEC.has(a.id) && NEC.has(b.id) && miles < 480) ||
    (CA_SOUTH.has(a.id) && CA_SOUTH.has(b.id));
  if (rail) {
    const hours = Math.max(0.5, miles / (NEC.has(a.id) ? 68 : 45));
    return hop(
      "tren",
      round1(hours),
      round1(hours + 0.75),
      Math.round(8 + miles * 0.09),
      Math.round(22 + miles * 0.22),
      "estimado",
      "Tren",
    );
  }
  const hours = Math.max(0.85, miles / 470 + 0.4);
  const door = hours + (miles > 1400 ? 4 : 3.3);
  return hop(
    "vuelo",
    round1(hours),
    round1(door),
    Math.round(48 + miles * 0.07),
    Math.round(110 + miles * 0.16),
    "estimado",
    miles > 1400 ? "Vuelo costa a costa" : "Vuelo interno",
  );
}

const COPA_US = new Set([
  "ny",
  "nwk",
  "dc",
  "mia",
  "fll",
  "orl",
  "tpa",
  "bos",
  "atl",
  "hou",
  "chi",
  "lax",
  "sfo",
  "las",
]);

function isEscala(id: string) {
  return cityById(id)?.coast === "escala";
}

function hopIndexOf(fromId: string, toId: string, stops: Stop[]) {
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (stops[i]?.city === fromId && stops[i + 1]?.city === toId) return i;
  }
  return -1;
}

function firstUsIndex(stops: Stop[]) {
  return stops.findIndex((stop) => !isEscala(stop.city));
}

function lastUsIndex(stops: Stop[]) {
  for (let i = stops.length - 1; i >= 0; i -= 1) {
    if (!isEscala(stops[i]?.city ?? "")) return i;
  }
  return -1;
}

function includedCopaLeg(fromId: string, toId: string, stops: Stop[]) {
  const safe = ensureNy(stops);
  const index = hopIndexOf(fromId, toId, safe);
  if (index < 0) return false;
  const firstUs = firstUsIndex(safe);
  const lastUs = lastUsIndex(safe);
  if (firstUs > 0 && index === firstUs - 1 && fromId === "pty" && COPA_US.has(toId)) return true;
  if (lastUs >= 0 && index === lastUs && toId === "pty" && COPA_US.has(fromId)) return true;
  return false;
}

function hopBetween(fromId: string, toId: string, stops?: Stop[]): Hop {
  const from = cityById(fromId);
  const to = cityById(toId);
  if (!from || !to) return hop("vuelo", 2.5, 5.5, 70, 180, "estimado", "Tramo interno");
  const base = KNOWN_HOPS[hopKey(from.id, to.id)] ?? estimateHop(from, to);
  if (stops && includedCopaLeg(fromId, toId, stops)) {
    return hop(base.mode, base.hours, base.door, 0, 0, base.source, `${base.name} · incluido`);
  }
  return base;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseISO(iso: string) {
  const parts = iso.split("-").map(Number);
  return { year: parts[0] ?? 2026, month: parts[1] ?? 1, day: parts[2] ?? 1 };
}

function addDays(iso: string, count: number) {
  const { year, month, day } = parseISO(iso);
  const date = new Date(Date.UTC(year, month - 1, day + count));
  return toISO(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function diffDays(later: string, earlier: string) {
  return Math.round(
    (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000,
  );
}

function endOf(block: Block) {
  return addDays(block.start, block.days - 1);
}

function covers(block: Block, iso: string) {
  return iso >= block.start && iso <= endOf(block);
}

function clampDays(days: number) {
  return Math.max(1, Math.min(34, Math.round(days)));
}

function clampLiveDays(days: number) {
  return Math.max(1, Math.min(34, days));
}

function ensureNy(stops: Stop[]): Stop[] {
  const next = stops.map((stop) => ({ city: stop.city, days: Math.max(1, stop.days) }));
  if (next.some((stop) => stop.city === "ny")) return next;
  return [...next, { city: "ny", days: 1 }];
}

function startForEvent(stops: Stop[]): string {
  const index = stops.findIndex((stop) => stop.city === "ny");
  const ny = stops[index] ?? { city: "ny", days: 1 };
  const before = stops.slice(0, Math.max(0, index)).reduce((sum, stop) => sum + stop.days, 0);
  const offset = ny.days >= 2 ? 1 : 0;
  return addDays(EVENT, -(before + offset));
}

function startBounds(stops: Stop[]): { min: string; max: string } {
  const safe = ensureNy(stops);
  const index = safe.findIndex((stop) => stop.city === "ny");
  const ny = safe[index] ?? { city: "ny", days: 1 };
  const before = safe.slice(0, Math.max(0, index)).reduce((sum, stop) => sum + stop.days, 0);
  let min = addDays(EVENT, -(before + ny.days - 1));
  let max = addDays(EVENT, -before);
  if (min < RANGE_START) min = RANGE_START;
  if (max > EVENT) max = EVENT;
  if (min > max) min = max;
  return { min, max };
}

function clampStart(start: string, stops: Stop[]): string {
  const bounds = startBounds(stops);
  if (start < bounds.min) return bounds.min;
  if (start > bounds.max) return bounds.max;
  return start;
}

function layoutFrom(stops: Stop[], start: string): Block[] {
  let cursor = start;
  return ensureNy(stops).map((stop) => {
    const days = Math.max(1, Math.round(stop.days));
    const block = { city: stop.city, start: cursor, days };
    cursor = addDays(cursor, days);
    return block;
  });
}

function layout(stops: Stop[], start: string): Block[] {
  const safe = ensureNy(stops);
  return layoutFrom(safe, clampStart(start, safe));
}

function holdsEvent(stops: Stop[], start: string) {
  return layoutFrom(stops, start).some((block) => block.city === "ny" && covers(block, EVENT));
}

function applyEnd(stops: Stop[], start: string, end: string): Stop[] {
  const safe = ensureNy(stops);
  const blocks = layoutFrom(safe, start);
  const last = blocks[blocks.length - 1];
  if (!last) return safe;
  let days = diffDays(end, last.start) + 1;
  if (last.city === "ny") days = Math.max(days, diffDays(EVENT, last.start) + 1);
  if (days < 1) days = 1;
  if (addDays(last.start, days - 1) > RANGE_END) days = diffDays(RANGE_END, last.start) + 1;
  days = clampDays(days);
  const next = safe.map((stop, i) => (i === safe.length - 1 ? { ...stop, days } : stop));
  return holdsEvent(next, start) ? next : safe;
}

function tripEnd(stops: Stop[], start: string) {
  const last = layoutFrom(stops, start).slice(-1)[0];
  return last ? endOf(last) : start;
}

function applyStart(stops: Stop[], start: string, nextStart: string): { stops: Stop[]; start: string } {
  const safe = ensureNy(stops);
  const blocks = layoutFrom(safe, start);
  const last = blocks[blocks.length - 1];
  if (!last || !safe[0]) return { stops: safe, start };
  const end = endOf(last);
  const rest = safe.slice(1).reduce((sum, stop) => sum + Math.max(1, Math.round(stop.days)), 0);
  let next = nextStart;
  if (next < RANGE_START) next = RANGE_START;
  if (next > end) next = end;
  let firstDays = diffDays(end, next) + 1 - rest;
  if (firstDays < 1) {
    firstDays = 1;
    next = addDays(end, -rest);
  }
  const updated = safe.map((stop, i) => (i === 0 ? { ...stop, days: firstDays } : stop));
  if (holdsEvent(updated, next)) return { stops: updated, start: next };
  const dir = next > start ? -1 : 1;
  let probe = next;
  for (let i = 0; i < 40; i += 1) {
    probe = addDays(probe, dir);
    const days = diffDays(end, probe) + 1 - rest;
    if (days < 1) break;
    const cand = safe.map((stop, j) => (j === 0 ? { ...stop, days } : stop));
    if (holdsEvent(cand, probe)) return { stops: cand, start: probe };
  }
  return { stops: safe, start };
}

function resizePartner(index: number, edge: "start" | "end", count: number) {
  if (count < 2) return null;
  if (edge === "end") return index < count - 1 ? index + 1 : index - 1;
  return index > 0 ? index - 1 : index + 1;
}

function shiftDays(
  stops: Stop[],
  index: number,
  partner: number,
  originDays: number,
  originPartnerDays: number,
  delta: number,
): Stop[] {
  let nextDays = originDays + delta;
  let nextPartner = originPartnerDays - delta;
  if (nextDays < 1) {
    nextPartner -= 1 - nextDays;
    nextDays = 1;
  }
  if (nextPartner < 1) {
    nextDays -= 1 - nextPartner;
    nextPartner = 1;
  }
  return stops.map((stop, i) => {
    if (i === index) return { ...stop, days: nextDays };
    if (i === partner) return { ...stop, days: nextPartner };
    return stop;
  });
}

function snapPair(stops: Stop[], index: number, partner: number): Stop[] {
  const a = stops[index];
  const b = stops[partner];
  if (!a || !b) return stops.map((stop) => ({ ...stop, days: clampDays(stop.days) }));
  const pair = Math.max(2, Math.round(a.days + b.days));
  const snapA = Math.max(1, Math.min(pair - 1, Math.round(a.days)));
  return stops.map((stop, i) => {
    if (i === index) return { ...stop, days: snapA };
    if (i === partner) return { ...stop, days: pair - snapA };
    return { ...stop, days: clampDays(stop.days) };
  });
}

function insertTaking(stops: Stop[], slot: number, city: string, want = 3): Stop[] {
  const safe = ensureNy(stops);
  if (safe.some((stop) => stop.city === city)) return safe;
  const donorIndex = Math.min(Math.max(slot, 0), Math.max(0, safe.length - 1));
  const donor = safe[donorIndex];
  const spare = donor ? Math.max(0, donor.days - 1) : 0;
  const take = Math.max(1, Math.min(want, spare || want));
  const next =
    donor && spare > 0
      ? safe.map((stop, i) => (i === donorIndex ? { ...stop, days: stop.days - Math.min(take, spare) } : stop))
      : safe;
  return insertAt(next, Math.min(slot, next.length), { city, days: Math.min(take, spare || take) });
}

function removeGiving(stops: Stop[], index: number): Stop[] {
  const safe = ensureNy(stops);
  const gone = safe[index];
  if (!gone) return safe;
  if (gone.city === "ny" && safe.filter((stop) => stop.city === "ny").length === 1) return safe;
  const dest = index > 0 ? index - 1 : 0;
  return safe
    .filter((_, i) => i !== index)
    .map((stop, i) => (i === dest ? { ...stop, days: stop.days + gone.days } : stop));
}

function insertAt<T>(list: T[], index: number, item: T): T[] {
  const next = list.slice();
  next.splice(index, 0, item);
  return next;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to > from ? to - 1 : to, 0, item);
  return next;
}

function slotAt(clientX: number, track: HTMLDivElement | null, stops: Stop[]): number {
  if (!track) return stops.length;
  const rect = track.getBoundingClientRect();
  const x = clientX - rect.left;
  const total = stops.reduce((sum, stop) => sum + stop.days, 0) || 1;
  let acc = 0;
  for (let i = 0; i < stops.length; i += 1) {
    const width = ((stops[i]?.days ?? 1) / total) * rect.width;
    if (x < acc + width / 2) return i;
    acc += width;
  }
  return stops.length;
}

function intlTo(cityId: string): Hop {
  const city = cityById(cityId);
  if (!city || city.id === "ny") return hop("vuelo", 15, 20, 0, 0, "notion", "Mendoza ↔ Nueva York");
  if (city.id === "pty") return hop("vuelo", 7, 10, 0, 0, "estimado", "Mendoza ↔ Panamá (Copa)");
  if (city.coast === "escala") return hop("vuelo", 8.5, 12, 0, 0, "estimado", "Mendoza ↔ Panamá + tramo interno");
  if (city.lon < -100) return hop("vuelo", 16.5, 22, 0, 0, "estimado", "Mendoza ↔ costa oeste");
  if (city.lat < 32 && city.lon < -93) return hop("vuelo", 15.5, 21, 0, 0, "estimado", "Mendoza ↔ Texas");
  if (city.lat < 31) return hop("vuelo", 15.5, 21, 0, 0, "estimado", "Mendoza ↔ sur / Florida");
  if (city.lon < -85) return hop("vuelo", 15.5, 21, 0, 0, "estimado", "Mendoza ↔ centro");
  return hop("vuelo", 15, 20.5, 0, 0, "estimado", "Mendoza ↔ Este");
}

const WEEKDAY = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function weekday(iso: string) {
  const { year, month, day } = parseISO(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isWeekend(iso: string) {
  const day = weekday(iso);
  return day === 0 || day === 6;
}

function formatDay(iso: string) {
  const { day, month } = parseISO(iso);
  const label = `${day} ${SHORT_MONTH[month - 1]}`;
  return isWeekend(iso) ? `${label} ${WEEKDAY[weekday(iso)]}` : label;
}

function formatSpan(start: string, end: string) {
  return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}

function formatHours(value: number) {
  const hours = Math.floor(value);
  const mins = Math.round((value - hours) * 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins}`;
}

function formatRange(low: number, high: number) {
  return low === high ? usd(low) : `${usd(low)}–${usd(high)}`;
}

function stayCostLabel(city: City | undefined, days: number) {
  if (!city) return "";
  return city.source === "notion"
    ? usd(city.low * days)
    : formatRange(city.low * days, city.high * days);
}

function rideCostLabel(ride: RideHop, stops: Stop[]) {
  if (ride.key === "in" || ride.key === "out") {
    const usStops = ensureNy(stops).filter((stop) => !isEscala(stop.city));
    const firstUs = usStops[0]?.city;
    const lastUs = usStops[usStops.length - 1]?.city;
    const openOut = Boolean(firstUs && firstUs !== "ny");
    const openIn = Boolean(lastUs && lastUs !== "ny");
    if (ride.key === "in") {
      return formatRange(
        FLIGHT + (openOut ? 120 : 0) + (openIn ? 120 : 0),
        FLIGHT + (openOut ? 220 : 0) + (openIn ? 220 : 0),
      );
    }
    return openIn ? formatRange(120, 220) : "incluido";
  }
  if (ride.hop.costLow === 0 && ride.hop.costHigh === 0) return "incluido";
  return formatRange(ride.hop.costLow, ride.hop.costHigh);
}

const usd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

function Glyph({
  kind,
  color,
  size = 16,
}: {
  kind: "plane" | "train" | "local" | "pin" | "home" | "plus" | "close" | "search" | "clock" | "filter";
  color: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: color,
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "plane") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    );
  }
  if (kind === "clock") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  }
  if (kind === "train") {
    return (
      <svg {...common}>
        <rect x="3.5" y="2.5" width="9" height="8" rx="2" />
        <path d="M3.5 7.5h9M6 13l-1.5-2.5h7L10 13M6.5 5h.01M9.5 5h.01" />
      </svg>
    );
  }
  if (kind === "local") {
    return (
      <svg {...common}>
        <circle cx="5" cy="11" r="1.4" />
        <circle cx="11" cy="11" r="1.4" />
        <path d="M3.5 11H2.5V6.5A2 2 0 0 1 4.5 4.5h7A2 2 0 0 1 13.5 6.5V11h-1" />
      </svg>
    );
  }
  if (kind === "home") {
    return (
      <svg {...common}>
        <path d="M2.5 7.5 8 3l5.5 4.5V13a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V7.5z" />
        <path d="M6.5 14V9h3v5" />
      </svg>
    );
  }
  if (kind === "plus") {
    return (
      <svg {...common}>
        <path d="M8 3.5v9M3.5 8h9" />
      </svg>
    );
  }
  if (kind === "close") {
    return (
      <svg {...common}>
        <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" />
      </svg>
    );
  }
  if (kind === "search") {
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="3.6" />
        <path d="M10 10.2L13.2 13.4" />
      </svg>
    );
  }
  if (kind === "filter") {
    return (
      <svg {...common}>
        <path d="M2.4 3.4h11.2L9.4 8.6v3.6L6.6 13.8V8.6L2.4 3.4z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 14s5-4.2 5-7.2A5 5 0 0 0 3 6.8C3 9.8 8 14 8 14z" />
      <circle cx="8" cy="6.8" r="1.4" />
    </svg>
  );
}

function hopKind(mode: Mode): "plane" | "train" | "local" {
  if (mode === "vuelo") return "plane";
  if (mode === "tren") return "train";
  return "local";
}

const REGION_OPTIONS: { id: Coast; label: string }[] = [
  { id: "este", label: "Este" },
  { id: "sur", label: "Sur" },
  { id: "oeste", label: "Oeste" },
  { id: "escala", label: "Escala" },
];

function regionId(filter: Filter): Coast {
  if (filter === "mexico") return "escala";
  if (filter === "ambas") return "este";
  return filter;
}

function RegionFilter({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (next: Coast) => void;
}) {
  const theme = useHostTheme();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = regionId(value);
  const label = REGION_OPTIONS.find((option) => option.id === selected)?.label ?? "Este";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className="ui-pill is-active is-inline"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filtrar por región"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          boxSizing: "border-box",
          minHeight: 22,
          height: 22,
          border: "none",
          borderRadius: theme.control.radius,
          padding: "0 8px 0 6px",
          color: theme.text.onAccent,
          font: "inherit",
          fontSize: theme.type.sm,
          cursor: "pointer",
        }}
      >
        <Glyph kind="filter" color={theme.text.onAccent} size={12} />
        {label}
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Región"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 30,
            minWidth: 120,
            padding: 4,
            background: theme.bg.elevated,
            border: `1px solid ${theme.stroke.primary}`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgb(0 0 0 / 10%)",
          }}
        >
          {REGION_OPTIONS.map((option) => {
            const active = option.id === selected;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                className={["region-option", active && "is-active"].filter(Boolean).join(" ")}
                aria-selected={active}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  height: 28,
                  padding: "0 10px",
                  border: "none",
                  borderRadius: 8,
                  background: active ? theme.accent.primary : "transparent",
                  color: active ? theme.text.onAccent : theme.text.primary,
                  font: "inherit",
                  fontSize: theme.type.sm,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const MARK = 28;
const MARK_GLYPH = 14;

function GroupedCard({ children }: { children: ReactNode }) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        background: theme.fill.primary,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Mark({
  kind,
  accent,
}: {
  kind: "plane" | "train" | "local" | "pin" | "home";
  accent?: boolean;
}) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        width: MARK,
        height: MARK,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: accent ? theme.accent.primary : theme.fill.tertiary,
      }}
    >
      <Glyph
        kind={kind}
        color={accent ? theme.text.onAccent : theme.text.secondary}
        size={MARK_GLYPH}
      />
    </div>
  );
}

function BillLine({
  label,
  amount,
  kind = "item",
}: {
  label: string;
  amount: string;
  kind?: "section" | "item" | "foot";
}) {
  const theme = useHostTheme();
  const item = kind === "item";
  const foot = kind === "foot";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 32,
        padding: foot ? "14px 0 0" : item ? "4px 0 4px 14px" : "12px 0 4px",
        borderTop: foot ? `1px solid ${theme.stroke.secondary}` : undefined,
      }}
    >
      <Text
        size={foot ? undefined : "small"}
        weight={item ? undefined : "semibold"}
        tone={item ? "tertiary" : "primary"}
      >
        {label}
      </Text>
      <Text
        size={foot ? undefined : "small"}
        weight={item ? undefined : "semibold"}
        tone={item ? "tertiary" : "primary"}
        style={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
      >
        {amount}
      </Text>
    </div>
  );
}

function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  last,
  strong,
  indent,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: string;
  last?: boolean;
  strong?: boolean;
  indent?: boolean;
}) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 52,
        padding: indent ? "10px 16px 10px 56px" : "10px 16px",
        borderBottom: last ? "none" : `1px solid ${theme.stroke.tertiary}`,
      }}
    >
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          size={indent ? "small" : undefined}
          weight={strong ? "semibold" : indent ? undefined : "medium"}
          tone={indent ? "secondary" : "primary"}
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            size="small"
            tone="tertiary"
            style={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </div>
      {trailing ? (
        <Text
          size="small"
          weight={strong ? "semibold" : undefined}
          tone={strong ? "primary" : "secondary"}
          style={{
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {trailing}
        </Text>
      ) : null}
    </div>
  );
}

function HopSep({
  title,
  subtitle,
  cost,
}: {
  title: string;
  subtitle: string;
  cost: string;
}) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px 8px 22px",
        background: "transparent",
      }}
    >
      <svg
        width={20}
        height={40}
        viewBox="0 0 20 40"
        fill="none"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        <path
          d="M6 1C6 10 16 13 16 20C16 27 6 30 6 39"
          stroke={theme.stroke.primary}
          strokeWidth="1.5"
          strokeDasharray="2.2 3.2"
          strokeLinecap="round"
        />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          size="small"
          tone="secondary"
          style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {title}
        </Text>
        <Text
          size="small"
          tone="tertiary"
          style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {subtitle}
        </Text>
      </div>
      <Text size="small" tone="tertiary" style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {cost}
      </Text>
    </div>
  );
}

function TrimHandle({
  edge,
  onAccent,
  onPointerDown,
}: {
  edge: "start" | "end";
  onAccent: boolean;
  onPointerDown: (event: Ptr) => void;
}) {
  const theme = useHostTheme();
  const bar = onAccent ? theme.text.onAccent : theme.text.tertiary;
  return (
    <div
      onPointerDown={onPointerDown}
      title={edge === "start" ? "Acortar o alargar el inicio" : "Acortar o alargar el final"}
      style={{
        width: 16,
        alignSelf: "stretch",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "ew-resize",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 8,
          height: 22,
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span style={{ width: 1, height: 12, background: bar, display: "block" }} />
        <span style={{ width: 1, height: 12, background: bar, display: "block" }} />
      </div>
    </div>
  );
}

type TrackSeg =
  | { kind: "stay"; index: number; stop: Stop; block: Block }
  | { kind: "ride"; key: string; from: string; to: string; hop: Hop };

function cityCode(id: string) {
  if (id === "mdz") return "MDZ";
  if (id === "ny") return "NYC";
  if (id === "dc") return "DC";
  if (id === "nwk") return "EWR";
  if (id === "buf") return "IAG";
  if (id === "hou") return "IAH";
  if (id === "pty") return "PTY";
  if (id === "boc") return "BOC";
  if (id === "bqt") return "DAV";
  return (cityById(id)?.id ?? id).toUpperCase();
}

function startGrab(
  eventPtr: Ptr,
  pill: HTMLElement | null,
  next: Omit<Grab, "width" | "height" | "grabX" | "grabY" | "x" | "y">,
): Grab | null {
  if (!pill) return null;
  const rect = pill.getBoundingClientRect();
  return {
    ...next,
    width: rect.width,
    height: rect.height,
    grabX: eventPtr.clientX - rect.left,
    grabY: eventPtr.clientY - rect.top,
    x: eventPtr.clientX,
    y: eventPtr.clientY,
  };
}

function CityFloat({ grab, lifted }: { grab: Grab; lifted: boolean }) {
  const theme = useHostTheme();
  const city = cityById(grab.city);
  return (
    <div
      style={{
        position: "fixed",
        left: grab.x - grab.grabX,
        top: grab.y - grab.grabY,
        width: grab.width,
        height: grab.height,
        zIndex: 80,
        pointerEvents: "none",
        transform: lifted
          ? "translateY(-12px) scale(1.08) rotate(-2.5deg)"
          : "translateY(0) scale(1) rotate(0deg)",
        transformOrigin: `${grab.grabX}px ${grab.grabY}px`,
        transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 6,
          background: grab.event ? theme.accent.primary : theme.fill.primary,
          color: grab.event ? theme.text.onAccent : theme.text.primary,
          border: `1px solid ${grab.event ? theme.accent.primary : theme.stroke.primary}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "6px 10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: theme.type.sm,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {city?.name ?? grab.city}
        </div>
        <div style={{ fontSize: theme.type.sm, opacity: 0.8, whiteSpace: "nowrap" }}>
          {Math.round(grab.days)}d
          {grab.event ? " · evento" : ""}
        </div>
        <div
          style={{
            fontSize: theme.type.sm,
            opacity: 0.7,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {stayCostLabel(city, grab.days)}
        </div>
      </div>
    </div>
  );
}

type StaySeg = Extract<TrackSeg, { kind: "stay" }>;
type RideHop = Extract<TrackSeg, { kind: "ride" }>;

type RideMark = {
  ride: RideHop;
  center: number;
  widthDays: number;
  total: number;
  title: string;
};

function rideTitle(ride: RideHop) {
  const from = cityCode(ride.from);
  const to = cityCode(ride.to);
  return `${from} → ${to} · ${formatHours(ride.hop.hours)} en viaje · ${formatHours(ride.hop.door)} puerta a puerta`;
}

function rideMarks(stays: StaySeg[], rides: RideHop[]): RideMark[] {
  const total = stays.reduce((sum, item) => sum + Math.max(1, item.stop.days), 0) || 1;
  let acc = 0;
  let stayAt = 0;
  return rides.map((ride, index) => {
    const widthDays = Math.max(ride.hop.door, 0) / 24;
    const last = index === rides.length - 1;
    let center = widthDays / 2 / total;
    if (index === 0) {
      center = widthDays / 2 / total;
    } else if (last) {
      center = 1 - widthDays / 2 / total;
    } else {
      acc += Math.max(1, stays[stayAt]?.stop.days ?? 1);
      stayAt += 1;
      center = acc / total;
    }
    return { ride, center, widthDays, total, title: rideTitle(ride) };
  });
}

function rideTint(theme: ReturnType<typeof useHostTheme>, amount: number) {
  return `color-mix(in srgb, ${theme.category.orange} ${amount}%, ${theme.fill.secondary})`;
}

function RideScale({ mark }: { mark: RideMark }) {
  const theme = useHostTheme();
  const widthPct = (mark.widthDays / mark.total) * 100;
  return (
    <div
      title={mark.title}
      style={{
        position: "absolute",
        top: 4,
        left: `${mark.center * 100}%`,
        width: `max(8px, ${widthPct}%)`,
        height: 8,
        borderRadius: 4,
        background: rideTint(theme, 55),
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    />
  );
}

function RideCard({ mark, stops }: { mark: RideMark; stops: Stop[] }) {
  const theme = useHostTheme();
  const from = cityCode(mark.ride.from);
  const to = cityCode(mark.ride.to);
  const hours = formatHours(mark.ride.hop.hours);
  const cost = rideCostLabel(mark.ride, stops);
  return (
    <div
      title={mark.title}
      style={{
        position: "absolute",
        top: 12,
        left: `${mark.center * 100}%`,
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 1,
          height: 14,
          background: rideTint(theme, 45),
        }}
      />
      <div
        style={{
          borderRadius: 6,
          background: `color-mix(in srgb, ${theme.category.orange} 10%, ${theme.bg.elevated})`,
          color: theme.text.primary,
          padding: "6px 8px",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: theme.type.sm, fontWeight: 600 }}>{from}</span>
          <Glyph kind={hopKind(mark.ride.hop.mode)} color={theme.text.secondary} size={14} />
          <span style={{ fontSize: theme.type.sm, fontWeight: 600 }}>{to}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            marginTop: 2,
          }}
        >
          <Glyph kind="clock" color={theme.text.secondary} size={16} />
          <span
            style={{
              fontSize: theme.type.sm,
              fontVariantNumeric: "tabular-nums",
              color: theme.text.secondary,
            }}
          >
            {hours}
          </span>
        </div>
        <div
          style={{
            fontSize: theme.type.sm,
            fontVariantNumeric: "tabular-nums",
            color: theme.text.secondary,
            textAlign: "center",
            marginTop: 2,
            whiteSpace: "nowrap",
          }}
        >
          {cost}
        </div>
      </div>
    </div>
  );
}

function trackSegs(stops: Stop[], start: string): TrackSeg[] {
  const safe = ensureNy(stops);
  const blocks = layout(safe, start);
  const segs: TrackSeg[] = [];
  const first = safe[0];
  if (first) {
    segs.push({ kind: "ride", key: "in", from: "mdz", to: first.city, hop: intlTo(first.city) });
  }
  safe.forEach((stop, index) => {
    const block = blocks[index];
    if (block) segs.push({ kind: "stay", index, stop, block });
    const next = safe[index + 1];
    if (next) {
      segs.push({
        kind: "ride",
        key: `${stop.city}-${next.city}-${index}`,
        from: stop.city,
        to: next.city,
        hop: hopBetween(stop.city, next.city, safe),
      });
    }
  });
  const last = safe[safe.length - 1];
  if (last) {
    segs.push({ kind: "ride", key: "out", from: last.city, to: "mdz", hop: intlTo(last.city) });
  }
  return segs;
}

function daysOf(blocks: Block[]) {
  const dates: string[] = [];
  for (const block of blocks) {
    const count = Math.max(1, Math.round(block.days));
    for (let i = 0; i < count; i += 1) dates.push(addDays(block.start, i));
  }
  return dates;
}

function pxPerDay(track: HTMLElement | null, stops: Stop[], start: string) {
  const days = daysOf(layout(stops, start)).length || 1;
  if (!track) return 36;
  return track.getBoundingClientRect().width / days;
}

function DateRuler({ dates }: { dates: string[] }) {
  const theme = useHostTheme();
  if (dates.length === 0) return null;
  const dense = dates.length > 16;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`,
        borderBottom: `1px solid ${theme.stroke.secondary}`,
        marginBottom: 8,
      }}
    >
      {dates.map((iso, index) => {
        const { day, month } = parseISO(iso);
        const prev = dates[index - 1];
        const monthStart = !prev || parseISO(prev).month !== month;
        const isEvent = iso === EVENT;
        const weekend = isWeekend(iso);
        const last = index === dates.length - 1;
        const show =
          !dense || monthStart || isEvent || weekend || last || day === 1 || day % 2 === 1;
        return (
          <div
            key={`${iso}-${index}`}
            style={{
              borderLeft: `1px solid ${isEvent ? theme.accent.primary : theme.stroke.secondary}`,
              background: weekend && !isEvent ? theme.fill.tertiary : undefined,
              paddingLeft: 3,
              minWidth: 0,
              height: 28,
            }}
          >
            {show ? (
              <Text
                size="small"
                tone={isEvent || weekend ? "primary" : "tertiary"}
                style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden" }}
              >
                {weekend
                  ? WEEKDAY[weekday(iso)]
                  : monthStart || isEvent
                    ? formatDay(iso)
                    : String(day)}
              </Text>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DateStep({
  label,
  value,
  canPrev,
  canNext,
  onStep,
}: {
  label: string;
  value: string;
  canPrev: boolean;
  canNext: boolean;
  onStep: (dir: -1 | 1) => void;
}) {
  const theme = useHostTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Text size="small" tone="tertiary">
        {label}
      </Text>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          height: theme.control.height,
          boxSizing: "border-box",
          background: theme.fill.secondary,
          borderRadius: theme.control.radius,
          padding: "0 6px",
        }}
      >
        <IconButton
          title="Un día antes"
          size="sm"
          disabled={!canPrev}
          onClick={() => onStep(-1)}
        >
          ‹
        </IconButton>
        <Text
          size="small"
          weight="semibold"
          style={{
            minWidth: 64,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatDay(value)}
        </Text>
        <IconButton
          title="Un día después"
          size="sm"
          disabled={!canNext}
          onClick={() => onStep(1)}
        >
          ›
        </IconButton>
      </div>
    </div>
  );
}

function RoadPills({
  stops,
  rulerStops,
  start,
  insert,
  holding,
  resizing,
  onGrab,
  onReorder,
  onResize,
  onRemove,
  dragRef,
}: {
  stops: Stop[];
  rulerStops: Stop[];
  start: string;
  insert: number | null;
  holding: number | null;
  resizing: boolean;
  onGrab: (grab: Grab) => void;
  onReorder: (from: number, to: number) => void;
  onResize: (index: number, days: number) => void;
  onRemove: (index: number) => void;
  dragRef: { current: Drag | null };
}) {
  const theme = useHostTheme();
  const trackRef = useRef<HTMLDivElement>(null);
  const segs = trackSegs(stops, start);
  const stays = segs.filter((seg): seg is StaySeg => seg.kind === "stay");
  const rides = segs.filter((seg): seg is RideHop => seg.kind === "ride");
  const marks = rideMarks(stays, rides);
  const dates = daysOf(layout(rulerStops, start));

  return (
    <div ref={trackRef}>
      <DateRuler dates={dates} />
      <div
        style={{
          display: "flex",
          minHeight: 66,
          gap: 6,
        }}
      >
        {stays.map((seg) => {
          const city = cityById(seg.stop.city);
          const event = covers(seg.block, EVENT);
          const live = Math.max(1, seg.stop.days);
          const snapped = Math.round(live);
          const dayLabel =
            resizing && Math.abs(live - snapped) >= 0.05 ? `${live.toFixed(1)}d` : `${snapped}d`;
          return (
            <div
              key={`stay-${seg.stop.city}-${seg.index}`}
              style={{
                flexGrow: live,
                flexShrink: 1,
                flexBasis: 0,
                display: "flex",
                minWidth: 0,
                opacity: holding === null ? 1 : holding === seg.index ? 1 : 0.55,
                transition: resizing
                  ? "opacity 160ms ease-out"
                  : "flex-grow 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease-out, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
                transform: holding !== null && holding !== seg.index ? "scale(0.98)" : "scale(1)",
              }}
            >
              {insert === seg.index && holding !== seg.index ? (
                <div
                  style={{
                    width: 3,
                    marginRight: 4,
                    borderRadius: 2,
                    background: theme.accent.primary,
                  }}
                />
              ) : null}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 6,
                  background:
                    holding === seg.index
                      ? "transparent"
                      : event
                        ? theme.accent.primary
                        : theme.fill.secondary,
                  color: event ? theme.text.onAccent : theme.text.primary,
                  border:
                    holding === seg.index
                      ? `1px dashed ${theme.stroke.primary}`
                      : "1px solid transparent",
                  display: "flex",
                  alignItems: "stretch",
                  userSelect: "none",
                  overflow: "hidden",
                  opacity: holding === seg.index ? 0.35 : 1,
                  transition: "opacity 160ms ease-out, background 160ms ease-out",
                }}
                title="Click derecho para sacar"
                onContextMenu={(event: { preventDefault: () => void }) => {
                  event.preventDefault();
                  const lastNy =
                    seg.stop.city === "ny" &&
                    stops.filter((item) => item.city === "ny").length === 1;
                  if (lastNy) return;
                  onRemove(seg.index);
                }}
              >
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "stretch",
                    minWidth: 0,
                    visibility: holding === seg.index ? "hidden" : "visible",
                  }}
                >
                    <TrimHandle
                      edge="start"
                      onAccent={event}
                      onPointerDown={(eventPtr: Ptr) => {
                        eventPtr.stopPropagation();
                        const partner = resizePartner(seg.index, "start", stops.length);
                        dragRef.current = {
                          kind: "resize",
                          index: seg.index,
                          partner,
                          edge: "start",
                          originX: eventPtr.clientX,
                          originDays: seg.stop.days,
                          originPartnerDays: partner === null ? 0 : (stops[partner]?.days ?? 1),
                          pxPerDay: pxPerDay(trackRef.current, stops, start),
                        };
                        eventPtr.currentTarget.setPointerCapture(eventPtr.pointerId);
                      }}
                    />
                    <div
                      onPointerDown={(eventPtr: Ptr) => {
                        eventPtr.stopPropagation();
                        const pill = eventPtr.currentTarget.parentElement?.parentElement ?? null;
                        const next = startGrab(eventPtr, pill, {
                          kind: "order",
                          city: seg.stop.city,
                          days: seg.stop.days,
                          event,
                          from: seg.index,
                        });
                        dragRef.current = { kind: "order", from: seg.index };
                        if (next) onGrab(next);
                        eventPtr.currentTarget.setPointerCapture(eventPtr.pointerId);
                      }}
                      style={{
                        minWidth: 0,
                        flex: 1,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        cursor: "grab",
                        padding: "6px 4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: theme.type.sm,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {city?.name ?? seg.stop.city}
                      </div>
                      <div style={{ fontSize: theme.type.sm, opacity: 0.8, whiteSpace: "nowrap" }}>
                        {dayLabel}
                        {event ? " · evento" : ""}
                      </div>
                      <div
                        style={{
                          fontSize: theme.type.sm,
                          opacity: 0.7,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {stayCostLabel(city, live)}
                      </div>
                    </div>
                    <TrimHandle
                      edge="end"
                      onAccent={event}
                      onPointerDown={(eventPtr: Ptr) => {
                        eventPtr.stopPropagation();
                        const partner = resizePartner(seg.index, "end", stops.length);
                        dragRef.current = {
                          kind: "resize",
                          index: seg.index,
                          partner,
                          edge: "end",
                          originX: eventPtr.clientX,
                          originDays: seg.stop.days,
                          originPartnerDays: partner === null ? 0 : (stops[partner]?.days ?? 1),
                          pxPerDay: pxPerDay(trackRef.current, stops, start),
                        };
                        eventPtr.currentTarget.setPointerCapture(eventPtr.pointerId);
                      }}
                    />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {insert === stops.length ? (
        <div
          style={{
            width: 3,
            height: 20,
            marginTop: 6,
            borderRadius: 2,
            background: theme.accent.primary,
          }}
        />
      ) : null}
      <div
        style={{
          position: "relative",
          minHeight: 96,
          marginTop: 2,
        }}
      >
        {marks.map((mark) => (
          <div key={`scale-${mark.ride.key}`}>
            <RideScale mark={mark} />
          </div>
        ))}
        {marks.map((mark) => (
          <div key={`card-${mark.ride.key}`}>
            <RideCard mark={mark} stops={stops} />
          </div>
        ))}
      </div>
    </div>
  );
}


function AddCityChip({
  city,
  used,
  days,
  canRemove,
  grabbing,
  onFocus,
  onBlur,
  onDragStart,
  onRemove,
}: {
  city: City;
  used: boolean;
  days: number;
  canRemove: boolean;
  grabbing: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onDragStart: (event: Ptr) => void;
  onRemove: () => void;
}) {
  const theme = useHostTheme();
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={used ? `${city.name}, ${days} días` : `Sumar ${city.name}`}
      onPointerEnter={onFocus}
      onPointerLeave={onBlur}
      onPointerDown={(event: Ptr) => {
        if (used) return;
        onDragStart(event);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      title={used ? `Ya está · ${days} días` : `Sumar ${city.name}`}
      className={`ui-chip${used ? " is-used" : ""}${grabbing ? " is-grabbing" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${theme.stroke.secondary}`,
        color: used ? theme.text.tertiary : theme.text.primary,
        height: theme.control.height,
        boxSizing: "border-box",
        borderRadius: theme.control.radius,
        padding: `0 ${theme.control.padX}px`,
        cursor: used ? "default" : grabbing ? "grabbing" : "grab",
        font: "inherit",
        opacity: grabbing ? 0.35 : 1,
        transition:
          "background-color 140ms ease-out, opacity 160ms ease-out, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        transform: grabbing ? "scale(0.96)" : "scale(1)",
        whiteSpace: "nowrap",
      }}
    >
      <Glyph kind="pin" color={used ? theme.text.tertiary : theme.text.secondary} size={12} />
      <span style={{ fontSize: theme.type.sm }}>{city.name}</span>
      {used ? (
        <span style={{ fontSize: theme.type.sm, color: theme.text.tertiary }}>{days}d</span>
      ) : (
        <Glyph kind="plus" color={theme.text.secondary} size={12} />
      )}
      {canRemove ? (
        <button
          type="button"
          title={`Sacar ${city.name}`}
          onPointerDown={(event: { stopPropagation: () => void }) => {
            event.stopPropagation();
          }}
          onClick={(event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            onRemove();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 2,
            padding: 0,
            border: "none",
            background: "transparent",
            color: theme.text.tertiary,
            cursor: "pointer",
            font: "inherit",
          }}
        >
          <Glyph kind="close" color={theme.text.tertiary} size={12} />
        </button>
      ) : null}
    </div>
  );
}

export default function RoadmapApp() {
  const theme = useHostTheme();
  const [filter, setFilter] = useCanvasState<Filter>("filter", "este");
  const [stops, setStops] = useCanvasState<Stop[]>("stops", PRESETS.A.stops);
  const [tripStart, setTripStart] = useCanvasState("tripStart", "");
  const [storedExtras, setExtras] = useCanvasState<Extra[]>("extras", DEFAULT_EXTRAS);
  const extras = storedExtras.filter((item) => item.id !== "macbook-air");

  useEffect(() => {
    if (storedExtras.some((item) => item.id === "macbook-air")) {
      setExtras(storedExtras.filter((item) => item.id !== "macbook-air"));
    }
  }, [storedExtras]);
  const [legacy] = useCanvasState<Block[]>("blocks", []);
  const dragRef = useRef<Drag | null>(null);
  const trackHost = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [insert, setInsert] = useState<number | null>(null);
  const [draft, setDraft] = useState<Stop[] | null>(null);
  const [grab, setGrab] = useState<Grab | null>(null);
  const [focusCity, setFocusCity] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pillPage, setPillPage] = useState(0);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    if (!grab) {
      setLifted(false);
      return;
    }
    const frame = requestAnimationFrame(() => setLifted(true));
    return () => cancelAnimationFrame(frame);
  }, [grab?.kind, grab?.city, grab?.from]);

  const rawStops =
    stops.length > 0
      ? stops
      : legacy.length > 0
        ? legacy.map((block) => ({ city: block.city, days: block.days }))
        : PRESETS.A.stops;
  const active = ensureNy(rawStops.filter((stop) => cityById(stop.city)));
  const preview = draft ?? active;
  const rawStart = tripStart || startForEvent(active);
  const start = holdsEvent(active, rawStart) ? rawStart : clampStart(rawStart, active);
  const blocks = layoutFrom(preview, start);
  const persist = (next: Stop[], nextStart?: string) => {
    const safe = ensureNy(next);
    const keep = nextStart ?? (tripStart || start);
    setStops(safe);
    setTripStart(holdsEvent(safe, keep) ? keep : clampStart(keep, safe));
  };

  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  const firstCity = first ? cityById(first.city) : undefined;
  const lastCity = last ? cityById(last.city) : undefined;
  const inbound = firstCity ? intlTo(firstCity.id) : intlTo("ny");
  const outbound = lastCity ? intlTo(lastCity.id) : intlTo("ny");
  const routeHops = blocks.slice(0, -1).map((block, index) => {
    const next = blocks[index + 1] as Block;
    return { from: block.city, to: next.city, hop: hopBetween(block.city, next.city, preview) };
  });
  const hopLow = routeHops.reduce((sum, item) => sum + item.hop.costLow, 0);
  const hopHigh = routeHops.reduce((sum, item) => sum + item.hop.costHigh, 0);
  const hopHours = routeHops.reduce((sum, item) => sum + item.hop.hours, 0);
  const usStops = preview.filter((stop) => !isEscala(stop.city));
  const firstUs = usStops[0]?.city;
  const lastUs = usStops[usStops.length - 1]?.city;
  const openOut = Boolean(firstUs && firstUs !== "ny");
  const openIn = Boolean(lastUs && lastUs !== "ny");
  const intlLow = FLIGHT + (openOut ? 120 : 0) + (openIn ? 120 : 0);
  const intlHigh = FLIGHT + (openOut ? 220 : 0) + (openIn ? 220 : 0);
  const ticketsLow = hopLow + intlLow;
  const ticketsHigh = hopHigh + intlHigh;
  const travelHours = inbound.hours + outbound.hours + hopHours;
  const stayLow = blocks.reduce((sum, block) => sum + (cityById(block.city)?.low ?? 0) * block.days, 0);
  const stayHigh = blocks.reduce((sum, block) => sum + (cityById(block.city)?.high ?? 0) * block.days, 0);
  const extrasTotal = extras.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
  const tripLow = stayLow + ticketsLow + extrasTotal;
  const tripHigh = stayHigh + ticketsHigh + extrasTotal;
  const pocketLow = tripLow - CURSOR;
  const pocketHigh = tripHigh - CURSOR;
  const looking = query.trim().length > 0;
  const pool = CITIES.filter((city) => {
    if (looking) return cityMatches(city, query);
    const group = filter === "mexico" ? "escala" : filter;
    if (group !== "ambas" && city.coast !== group) return false;
    return !active.some((stop) => stop.city === city.id);
  });
  const pillPages = Math.max(1, Math.ceil(pool.length / PILL_PAGE));
  const safePage = Math.min(pillPage, pillPages - 1);
  const visible = pool.slice(safePage * PILL_PAGE, safePage * PILL_PAGE + PILL_PAGE);

  const slotFromEvent = (clientX: number) => slotAt(clientX, trackHost.current, active);

  const endDrag = (clientX: number) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setInsert(null);
    setGrab(null);
    setLifted(false);
    if (drag?.kind === "resize") {
      const live = draft ?? active;
      if (drag.partner === null) {
        const days = clampDays(live[drag.index]?.days ?? drag.originDays);
        const next = active.map((stop, i) => (i === drag.index ? { ...stop, days } : stop));
        if (drag.edge === "start") {
          persist(next, addDays(start, drag.originDays - days));
        } else {
          persist(next);
        }
      } else {
        const snapped = snapPair(live, drag.index, drag.partner);
        persist(holdsEvent(snapped, start) ? snapped : live.map((stop) => ({ ...stop, days: clampDays(stop.days) })));
      }
      setDraft(null);
      return;
    }
    setDraft(null);
    if (!drag) return;
    if (drag.kind === "add") {
      if (active.some((stop) => stop.city === drag.city)) return;
      const track = trackHost.current;
      const rect = track?.getBoundingClientRect();
      const over = rect && clientX >= rect.left && clientX <= rect.right;
      persist(insertTaking(active, over ? slotFromEvent(clientX) : active.length, drag.city));
    }
    if (drag.kind === "order") persist(moveItem(active, drag.from, slotFromEvent(clientX)));
  };

  return (
    <div
      onPointerMove={(event: Ptr) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (drag.kind === "resize") {
          const raw = (event.clientX - drag.originX) / Math.max(drag.pxPerDay, 8);
          const delta = drag.edge === "start" ? -raw : raw;
          if (drag.partner === null) {
            setDraft(
              active.map((stop, i) =>
                i === drag.index
                  ? { ...stop, days: clampLiveDays(drag.originDays + delta) }
                  : stop,
              ),
            );
            return;
          }
          const next = shiftDays(
            active,
            drag.index,
            drag.partner,
            drag.originDays,
            drag.originPartnerDays,
            delta,
          );
          if (holdsEvent(next, start)) {
            setDraft(next);
            return;
          }
          let low = 0;
          let high = delta;
          let best = active;
          for (let i = 0; i < 14; i += 1) {
            const mid = (low + high) / 2;
            const cand = shiftDays(
              active,
              drag.index,
              drag.partner,
              drag.originDays,
              drag.originPartnerDays,
              mid,
            );
            if (holdsEvent(cand, start)) {
              best = cand;
              low = mid;
            } else {
              high = mid;
            }
          }
          setDraft(best);
          return;
        }
        setInsert(slotFromEvent(event.clientX));
        setGrab((current) =>
          current ? { ...current, x: event.clientX, y: event.clientY } : current,
        );
      }}
      onPointerUp={(event: Ptr) => endDrag(event.clientX)}
      onPointerCancel={() => {
        dragRef.current = null;
        setInsert(null);
        setDraft(null);
        setGrab(null);
        setLifted(false);
      }}
      style={{ cursor: grab ? "grabbing" : undefined }}
    >
      {grab ? <CityFloat grab={grab} lifted={lifted} /> : null}
    <Stack
      gap={36}
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "36px 28px 56px",
        background: theme.bg.editor,
        color: theme.text.primary,
      }}
    >
      <div>
        <Text size="small" tone="tertiary">
          Octubre – noviembre 2026
        </Text>
        <H1>Roadmap</H1>
      </div>

      <UsaMap stops={active} cities={CITIES} focusId={focusCity} />

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            className="search-bar"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: "1 1 420px",
              minWidth: 260,
              maxWidth: 560,
              height: theme.control.height,
              border: `1px solid ${theme.stroke.primary}`,
              borderRadius: theme.control.radius,
              background: theme.bg.elevated,
              padding: "0 6px 0 10px",
            }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button")) return;
              searchRef.current?.focus();
            }}
          >
            <span style={{ display: "flex", flexShrink: 0, pointerEvents: "none" }}>
              <Glyph kind="search" color={theme.text.tertiary} size={14} />
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Buscar ciudad"
              aria-label="Buscar ciudad"
              onChange={(event) => {
                setQuery(event.target.value);
                setPillPage(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  return;
                }
                if (event.key !== "Enter") return;
                const first = pool.find((city) => !active.some((stop) => stop.city === city.id));
                if (!first) return;
                persist(insertTaking(active, active.length, first.id));
                setQuery("");
                setPillPage(0);
              }}
              style={{
                flex: 1,
                minWidth: 72,
                height: "100%",
                border: "none",
                background: "transparent",
                color: theme.text.primary,
                padding: 0,
                font: "inherit",
                fontSize: theme.type.sm,
                outline: "none",
              }}
            />
            <div
              aria-hidden
              style={{
                width: 1,
                height: 16,
                background: theme.stroke.secondary,
                flexShrink: 0,
              }}
            />
            <RegionFilter
              value={filter}
              onChange={(next) => {
                setFilter(next);
                setPillPage(0);
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              alignItems: "center",
              gap: 8,
              flex: "1 1 240px",
              justifyContent: "flex-end",
              minWidth: 0,
            }}
          >
            {visible.length === 0 ? (
              <Text size="small" tone="tertiary">
                {looking ? "Ninguna ciudad coincide." : "No quedan sugerencias en este grupo."}
              </Text>
            ) : (
              visible.map((city, index) => {
                const used = active.some((stop) => stop.city === city.id);
                const days = active
                  .filter((stop) => stop.city === city.id)
                  .reduce((sum, stop) => sum + Math.max(1, Math.round(stop.days)), 0);
                const lastNy =
                  city.id === "ny" && active.filter((stop) => stop.city === "ny").length === 1;
                return (
                  <ViewTransition
                    key={city.id}
                    name={`pill-slot-${index}`}
                    share="pill-morph"
                    default="none"
                  >
                    <AddCityChip
                      city={city}
                      used={used}
                      days={days}
                      canRemove={used && !lastNy}
                      grabbing={grab?.kind === "add" && grab.city === city.id}
                      onFocus={() => setFocusCity(city.id)}
                      onBlur={() => setFocusCity(null)}
                      onDragStart={(event) => {
                        dragRef.current = { kind: "add", city: city.id };
                        const next = startGrab(event, event.currentTarget, {
                          kind: "add",
                          city: city.id,
                          days: 3,
                          event: false,
                          from: null,
                        });
                        if (next) setGrab(next);
                      }}
                      onRemove={() => {
                        let index = -1;
                        for (let i = active.length - 1; i >= 0; i -= 1) {
                          if (active[i]?.city === city.id) {
                            index = i;
                            break;
                          }
                        }
                        if (index >= 0) persist(removeGiving(active, index));
                      }}
                    />
                  </ViewTransition>
                );
              })
            )}
            {pool.length > PILL_PAGE ? (
              <IconButton
                title="Más ciudades"
                size="sm"
                onClick={() => {
                  startTransition(() => {
                    setPillPage((safePage + 1) % pillPages);
                  });
                }}
              >
                ›
              </IconButton>
            ) : null}
          </div>
        </div>
      </div>

      <div ref={trackHost}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "end",
            marginBottom: 12,
          }}
        >
          <DateStep
            label="Salís"
            value={start}
            canPrev={applyStart(active, start, addDays(start, -1)).start < start}
            canNext={applyStart(active, start, addDays(start, 1)).start > start}
            onStep={(dir) => {
              const next = applyStart(active, start, addDays(start, dir));
              persist(next.stops, next.start);
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "0 16px",
              textAlign: "center",
            }}
          >
            <Text size="small" tone="tertiary">
              Estimado
            </Text>
            <Text
              weight="semibold"
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: theme.control.height,
                fontSize: theme.type.lg,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatRange(tripLow, tripHigh)}
            </Text>
          </div>
          <div style={{ justifySelf: "end" }}>
            <DateStep
              label="Llegás"
              value={last ? endOf(last) : EVENT}
              canPrev={
                !!last &&
                tripEnd(applyEnd(active, start, addDays(endOf(last), -1)), start) < endOf(last)
              }
              canNext={
                !!last &&
                tripEnd(applyEnd(active, start, addDays(endOf(last), 1)), start) > endOf(last)
              }
              onStep={(dir) => {
                if (!last) return;
                persist(applyEnd(active, start, addDays(endOf(last), dir)));
              }}
            />
          </div>
        </div>
        <RoadPills
          stops={preview}
          rulerStops={draft ? active : preview}
          resizing={draft !== null}
          start={start}
          insert={insert}
          holding={grab?.kind === "order" ? grab.from : null}
          onGrab={setGrab}
          dragRef={dragRef}
          onReorder={(from, to) => persist(moveItem(active, from, to))}
          onResize={(index, days) =>
            persist(active.map((stop, i) => (i === index ? { ...stop, days } : stop)))
          }
          onRemove={(index) => persist(removeGiving(active, index))}
        />
      </div>

      <div>
        <H2>Itinerario</H2>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
          {(() => {
            const rows: Array<{
              key: string;
              hop: boolean;
              kind: "plane" | "train" | "local" | "pin";
              title: string;
              subtitle: string;
              cost: string;
              accent?: boolean;
            }> = [];
            if (firstCity && first) {
              rows.push({
                key: "in",
                hop: true,
                kind: "plane",
                title: `MDZ → ${cityCode(firstCity.id)}`,
                subtitle: `${formatDay(first.start)} · ${formatHours(inbound.hours)} · ${firstCity.name}`,
                cost: formatRange(intlLow, intlHigh),
              });
            }
            blocks.forEach((block, index) => {
              const city = cityById(block.city);
              if (!city) return;
              const incoming = index > 0 ? routeHops[index - 1] : null;
              if (incoming) {
                rows.push({
                  key: `hop-${incoming.from}-${incoming.to}`,
                  hop: true,
                  kind: hopKind(incoming.hop.mode),
                  title: `${cityCode(incoming.from)} → ${cityCode(incoming.to)}`,
                  subtitle: `${formatDay(block.start)} · ${formatHours(incoming.hop.hours)} · ${city.name}`,
                  cost: formatRange(incoming.hop.costLow, incoming.hop.costHigh),
                });
              }
              const stay =
                city.source === "notion"
                  ? usd(city.low * block.days)
                  : formatRange(city.low * block.days, city.high * block.days);
              const event = covers(block, EVENT);
              rows.push({
                key: `stay-${block.city}-${block.start}`,
                hop: false,
                kind: "pin",
                title: city.name,
                subtitle: `${formatSpan(block.start, endOf(block))}${event ? " · evento" : ""}`,
                cost: stay,
                accent: event,
              });
            });
            if (lastCity && last) {
              rows.push({
                key: "out",
                hop: true,
                kind: "plane",
                title: `${cityCode(lastCity.id)} → MDZ`,
                subtitle: `${formatDay(endOf(last))} · ${formatHours(outbound.hours)} · Mendoza`,
                cost: openIn ? formatRange(120, 220) : "incluido",
              });
            }
            return rows.map((row) =>
              row.hop ? (
                <HopSep
                  key={row.key}
                  title={row.title}
                  subtitle={row.subtitle}
                  cost={row.cost}
                />
              ) : (
                <GroupedCard key={row.key}>
                  <ListRow
                    icon={<Mark kind="pin" accent={row.accent} />}
                    title={row.title}
                    subtitle={row.subtitle}
                    trailing={row.cost}
                    last
                  />
                </GroupedCard>
              ),
            );
          })()}
        </div>
      </div>

      <div>
        <H2>Cuentas</H2>
        <div style={{ maxWidth: 420, marginTop: 8 }}>
          <BillLine
            kind="section"
            label="Dormir y comer"
            amount={formatRange(stayLow, stayHigh)}
          />
          {blocks.map((block) => {
            const city = cityById(block.city);
            if (!city) return null;
            const stay =
              city.source === "notion"
                ? usd(city.low * block.days)
                : formatRange(city.low * block.days, city.high * block.days);
            return (
              <BillLine
                key={`${block.city}-${block.start}-stay`}
                label={`${city.name} · ${block.days}d`}
                amount={stay}
              />
            );
          })}
          <BillLine
            kind="section"
            label={`Viaje · ${formatHours(travelHours)}`}
            amount={formatRange(ticketsLow, ticketsHigh)}
          />
          <BillLine
            label={`MDZ → ${cityCode(firstCity?.id ?? "ny")}`}
            amount={formatRange(intlLow, intlHigh)}
          />
          {routeHops.map((item) => (
            <BillLine
              key={`${item.from}-${item.to}`}
              label={`${cityCode(item.from)} → ${cityCode(item.to)}`}
              amount={formatRange(item.hop.costLow, item.hop.costHigh)}
            />
          ))}
          <BillLine
            label={`${cityCode(lastCity?.id ?? "ny")} → MDZ`}
            amount={openIn ? formatRange(120, 220) : "incluido"}
          />
          {extras.some((item) => item.name || item.amount) ? (
            <>
              <BillLine kind="section" label="Gastos extra" amount={usd(extrasTotal)} />
              {extras
                .filter((item) => item.name || item.amount)
                .map((item) => (
                  <BillLine
                    key={item.id}
                    label={item.name || "Sin nombre"}
                    amount={usd(item.amount)}
                  />
                ))}
            </>
          ) : null}
          <BillLine kind="section" label="Cursor cubre" amount={`− ${usd(CURSOR)}`} />
          <BillLine
            kind="foot"
            label="Tu parte"
            amount={formatRange(Math.max(0, pocketLow), Math.max(0, pocketHigh))}
          />
        </div>
      </div>

      <div>
        <H2>Gastos extra</H2>
        <Text size="small" tone="tertiary" style={{ marginTop: 4 }}>
          Compras que no son del viaje. Sumá renglones cuando sepas qué más.
        </Text>
        <Stack gap={8} style={{ maxWidth: 480, marginTop: 14 }}>
          {extras.map((item) => (
            <div key={item.id}>
              <Row gap={8} align="center">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TextInput
                    value={item.name}
                    onChange={(name) =>
                      setExtras((prev) =>
                        prev.map((row) => (row.id === item.id ? { ...row, name } : row)),
                      )
                    }
                    placeholder="Qué es"
                  />
                </div>
                <div style={{ width: 110 }}>
                  <TextInput
                    type="number"
                    value={item.amount === 0 ? "" : String(item.amount)}
                    onChange={(raw) => {
                      const amount = raw === "" ? 0 : Number(raw);
                      setExtras((prev) =>
                        prev.map((row) =>
                          row.id === item.id
                            ? { ...row, amount: Number.isFinite(amount) ? amount : 0 }
                            : row,
                        ),
                      );
                    }}
                    placeholder="USD"
                  />
                </div>
                <IconButton
                  title="Sacar"
                  onClick={() =>
                    setExtras((prev) => prev.filter((row) => row.id !== item.id))
                  }
                >
                  <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                    />
                  </svg>
                </IconButton>
              </Row>
            </div>
          ))}
          <Row>
            <Button
              variant="secondary"
              onClick={() =>
                setExtras((prev) => [
                  ...prev,
                  {
                    id: `x-${Date.now().toString(36)}`,
                    name: "",
                    amount: 0,
                  },
                ])
              }
            >
              Sumar otra cosa
            </Button>
          </Row>
        </Stack>
      </div>

      <Card collapsible defaultOpen={false}>
        <CardHeader>Desglose</CardHeader>
        <CardBody>
          <Table
            headers={["Tramo", "Horas", "Puerta", "Pasaje"]}
            rows={[
              [
                `MDZ → ${cityCode(firstCity?.id ?? "ny")}`,
                formatHours(inbound.hours),
                formatHours(inbound.door),
                openOut ? `${formatRange(120, 220)} extra` : "incluido",
              ],
              ...routeHops.map((item) => [
                `${cityCode(item.from)} → ${cityCode(item.to)}`,
                formatHours(item.hop.hours),
                formatHours(item.hop.door),
                `${formatRange(item.hop.costLow, item.hop.costHigh)}${item.hop.source === "estimado" ? " · est." : ""}`,
              ]),
              [
                `${cityCode(lastCity?.id ?? "ny")} → MDZ`,
                formatHours(outbound.hours),
                formatHours(outbound.door),
                openIn ? `${formatRange(120, 220)} extra` : formatRange(intlLow, intlHigh),
              ],
            ]}
            columnAlign={["left", "right", "right", "right"]}
          />
          <Text size="small" tone="tertiary" style={{ marginTop: 12 }}>
            <Link href="https://www.notion.so/Viaje-Costa-Este-noviembre-2026-3ca495db47e581a39345e9e98887389c">
              Notion
            </Link>
            {" · "}
            El ancho de cada pill fija los días. Los vuelos salen del orden
            de las pills. La última es de dónde volvés.
          </Text>
        </CardBody>
      </Card>
    </Stack>
    </div>
  );
}
