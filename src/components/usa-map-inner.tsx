"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import statesTopo from "us-atlas/states-10m.json";
import panamaLand from "@/data/panama.json";
import {
  PlacePeek,
  type PlacePick,
  stateLabel,
  wikiTitleForCity,
  wikiTitleForState,
} from "@/components/place-peek";
import { theme } from "@/lib/theme";
import "leaflet/dist/leaflet.css";

export type MapPlace = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
};

export type MapStop = { city: string };

const US_BOUNDS: [[number, number], [number, number]] = [
  [24.5, -125],
  [49.4, -66.9],
];

const CITY_FOCUS: Record<string, [[number, number], [number, number]]> = {
  pty: [
    [8.7, -80],
    [9.3, -79.1],
  ],
  boc: [
    [9.15, -82.45],
    [9.5, -82.1],
  ],
  bqt: [
    [8.65, -82.55],
    [8.9, -82.3],
  ],
};

const SKIP = new Set(["02", "15", "60", "66", "69", "72", "78"]);

const STATE_BY_CITY: Record<string, string> = {
  ny: "New York",
  dc: "District of Columbia",
  phl: "Pennsylvania",
  bos: "Massachusetts",
  chi: "Illinois",
  bal: "Maryland",
  nwk: "New Jersey",
  wil: "Delaware",
  pvd: "Rhode Island",
  pwm: "Maine",
  buf: "New York",
  pit: "Pennsylvania",
  ric: "Virginia",
  rdu: "North Carolina",
  clt: "North Carolina",
  chs: "South Carolina",
  sav: "Georgia",
  atl: "Georgia",
  mia: "Florida",
  orl: "Florida",
  tpa: "Florida",
  jax: "Florida",
  fll: "Florida",
  eyw: "Florida",
  ust: "Florida",
  msy: "Louisiana",
  bna: "Tennessee",
  mem: "Tennessee",
  aus: "Texas",
  hou: "Texas",
  sat: "Texas",
  pty: "Panama",
  boc: "Panama",
  bqt: "Panama",
  sfo: "California",
  lax: "California",
  san: "California",
  pdx: "Oregon",
  sea: "Washington",
  las: "Nevada",
  phx: "Arizona",
};

const states = (() => {
  const topo = statesTopo as unknown as Topology<{
    states: GeometryCollection<{ name: string }>;
  }>;
  const raw = feature(topo, topo.objects.states) as FeatureCollection<
    Geometry,
    { name: string }
  >;
  const panama = panamaLand as FeatureCollection<Geometry, { name: string }>;
  return {
    ...raw,
    features: [
      ...raw.features.filter((item) => !SKIP.has(String(item.id))),
      ...panama.features,
    ],
  };
})();

function namesFor(ids: Iterable<string>) {
  const names = new Set<string>();
  for (const id of ids) {
    const name = STATE_BY_CITY[id];
    if (name) names.add(name);
  }
  return names;
}

function boundsFor(names: Set<string>, ids: string[] = [], focusId?: string | null) {
  const focus = focusId ? CITY_FOCUS[focusId] : null;
  if (focus) return L.latLngBounds(focus).pad(0.18);

  const usFeatures = states.features.filter(
    (item) => names.has(item.properties.name) && item.properties.name !== "Panama",
  );
  const overlayOnly = names.has("Panama") && usFeatures.length === 0;
  if (overlayOnly) {
    const overlay = states.features.filter((item) => item.properties.name === "Panama");
    return L.geoJSON({
      type: "FeatureCollection",
      features: overlay,
    } as FeatureCollection<Geometry, { name: string }>).getBounds().pad(0.2);
  }

  let bounds = usFeatures.length
    ? L.geoJSON({
        type: "FeatureCollection",
        features: usFeatures,
      } as FeatureCollection<Geometry, { name: string }>).getBounds()
    : null;

  if (names.has("Panama")) {
    bounds = bounds ?? L.latLngBounds(US_BOUNDS);
    for (const id of ids) {
      const box = CITY_FOCUS[id];
      if (!box) continue;
      bounds.extend(box[0]);
      bounds.extend(box[1]);
    }
  }

  return (bounds ?? L.latLngBounds(US_BOUNDS)).pad(0.12);
}

const STATE_STYLE = {
  color: theme.fill.secondary,
  weight: 1,
  fillColor: theme.fill.secondary,
  fillOpacity: 0.9,
};

const STATE_BORDER = {
  stroke: true,
  fill: false,
  color: theme.text.quaternary,
  weight: 1,
  opacity: 0.65,
  lineJoin: "round" as const,
};

const STATE_ACTIVE = {
  color: theme.accent.primary,
  weight: 1,
  opacity: 0.9,
  fillColor: theme.accent.primary,
  fillOpacity: 0.35,
};

function styleForState(name?: string, picked?: string | null) {
  if (name && picked === name) return STATE_ACTIVE;
  return STATE_STYLE;
}

function featureName(layer: L.Layer) {
  const feature = (layer as L.GeoJSON).feature as { properties?: { name?: string } } | undefined;
  return feature?.properties?.name;
}

type MapPoint = { x: number; y: number };

function pointFrom(event: L.LeafletMouseEvent): MapPoint {
  return { x: event.containerPoint.x, y: event.containerPoint.y };
}

function StatesLayer({
  hovered,
  onHover,
  onLeave,
}: {
  hovered: string | null;
  onHover: (name: string, point: MapPoint) => void;
  onLeave: () => void;
}) {
  const ref = useRef<L.GeoJSON | null>(null);
  const hoveredRef = useRef(hovered);
  hoveredRef.current = hovered;

  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    layer.eachLayer((child) => {
      if (child instanceof L.Path) child.setStyle(styleForState(featureName(child), hovered));
    });
  }, [hovered]);

  return (
    <GeoJSON
      ref={ref}
      data={states}
      bubblingMouseEvents={false}
      style={(feature) => styleForState(feature?.properties?.name, hovered)}
      onEachFeature={(feature, layer) => {
        const name = feature.properties.name;
        const label = () => {
          const el = layer instanceof L.Path ? layer.getElement() : null;
          if (!el) return;
          el.setAttribute("aria-label", stateLabel(name));
        };
        layer.on({
          add: label,
          mouseover: (event) => {
            if (layer instanceof L.Path && hoveredRef.current !== name) {
              layer.setStyle(STATE_ACTIVE);
              layer.bringToFront();
            }
            onHover(name, pointFrom(event));
          },
          mousemove: (event) => onHover(name, pointFrom(event)),
          mouseout: () => {
            if (layer instanceof L.Path) {
              layer.setStyle(styleForState(name, hoveredRef.current));
            }
            onLeave();
          },
        });
        label();
      }}
    />
  );
}

type LatLon = [number, number];

const LABEL_CENTER: Record<string, LatLon> = {
  Florida: [28.3, -81.7],
  Michigan: [44.35, -85.4],
  Louisiana: [31.05, -92.5],
  "New York": [42.95, -75.8],
  California: [37.2, -119.7],
  Idaho: [44.3, -114.5],
  Virginia: [37.5, -78.6],
  Maryland: [39.05, -76.7],
  Massachusetts: [42.3, -72.05],
  "New Jersey": [40.15, -74.72],
  Washington: [47.4, -120.3],
  Nevada: [39.6, -116.8],
  Texas: [31.5, -99.4],
  "West Virginia": [38.6, -80.6],
};

function ringCentroid(ring: number[][]): { area: number; center: LatLon } {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const x0 = ring[j]?.[0] ?? 0;
    const y0 = ring[j]?.[1] ?? 0;
    const x1 = ring[i]?.[0] ?? 0;
    const y1 = ring[i]?.[1] ?? 0;
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(twiceArea) < 1e-12) {
    let lat = 0;
    let lon = 0;
    for (const point of ring) {
      lon += point[0] ?? 0;
      lat += point[1] ?? 0;
    }
    const count = ring.length || 1;
    return { area: 0, center: [lat / count, lon / count] };
  }
  return {
    area: Math.abs(twiceArea) / 2,
    center: [cy / (3 * twiceArea), cx / (3 * twiceArea)],
  };
}

function featureCentroid(geometry: Geometry): LatLon {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  let area = -1;
  let center: LatLon = [39, -98];
  for (const polygon of polygons) {
    const ring = polygon[0];
    if (!ring?.length) continue;
    const next = ringCentroid(ring);
    if (next.area > area) {
      area = next.area;
      center = next.center;
    }
  }
  return center;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function stateNameIcon(label: string) {
  return L.divIcon({
    className: "usa-state-name",
    html: `<span>${escapeHtml(label)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const STATE_LABELS = states.features.map((item) => {
  const name = item.properties.name;
  const bounds = L.geoJSON(item).getBounds();
  const km = bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 1000;
  return {
    name,
    center: LABEL_CENTER[name] ?? featureCentroid(item.geometry),
    icon: stateNameIcon(stateLabel(name)),
    minZoom: km < 250 ? 6 : km < 450 ? 5 : km < 800 ? 4 : 3,
  };
});

function StateNameMark({
  item,
  active,
}: {
  item: (typeof STATE_LABELS)[number];
  active: boolean;
}) {
  const ref = useRef<L.Marker | null>(null);
  const apply = () => {
    const el = ref.current?.getElement();
    if (!el) return;
    el.classList.toggle("is-active", active);
    el.dataset.minZoom = String(item.minZoom);
  };
  useLayoutEffect(apply, [active, item.minZoom]);
  return (
    <Marker
      ref={ref}
      pane="state-labels"
      position={item.center}
      icon={item.icon}
      interactive={false}
      keyboard={false}
      zIndexOffset={active ? 20 : 0}
      eventHandlers={{ add: apply }}
    />
  );
}

function StateNames({
  picked,
  allow,
}: {
  picked: string | null;
  allow: Set<string>;
}) {
  return (
    <>
      {STATE_LABELS.filter((item) => allow.has(item.name)).map((item) => (
        <StateNameMark key={item.name} item={item} active={picked === item.name} />
      ))}
    </>
  );
}

function MapChrome({ onLeave }: { onLeave: () => void }) {
  const map = useMap();
  const syncZoom = () => {
    const root = map.getContainer().closest(".usa-map");
    if (root instanceof HTMLElement) root.dataset.zoom = String(Math.floor(map.getZoom()));
  };
  useEffect(() => {
    map.scrollWheelZoom.enable();
    syncZoom();
    const root = map.getContainer().closest(".usa-map");
    if (!(root instanceof HTMLElement)) return;
    root.addEventListener("mouseleave", onLeave);
    return () => root.removeEventListener("mouseleave", onLeave);
  }, [map, onLeave]);
  useMapEvents({
    zoom: syncZoom,
    zoomend: syncZoom,
  });
  return null;
}

function distToSeg(point: LatLon, from: LatLon, to: LatLon) {
  const vx = to[0] - from[0];
  const vy = to[1] - from[1];
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((point[0] - from[0]) * vx + (point[1] - from[1]) * vy) / len2));
  return Math.hypot(from[0] + vx * t - point[0], from[1] + vy * t - point[1]);
}

function hopArc(from: LatLon, to: LatLon, avoid: LatLon[] = [], steps = 28): LatLon[] {
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const len = Math.hypot(dLat, dLon) || 1;
  let pLat = -dLon / len;
  let pLon = dLat / len;
  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;
  if (pLat * (midLat - 39) + pLon * (midLon + 98) < 0) {
    pLat *= -1;
    pLon *= -1;
  }
  let bow = Math.max(0.7, Math.min(1.6, len * 0.36));
  for (const point of avoid) {
    if (distToSeg(point, from, to) < 1.2) bow = Math.max(bow, 2);
  }
  const cLat = midLat + pLat * bow;
  const cLon = midLon + pLon * bow;
  const pts: LatLon[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * lat1 + 2 * u * t * cLat + t * t * lat2,
      u * u * lon1 + 2 * u * t * cLon + t * t * lon2,
    ]);
  }
  return pts;
}

function hopAngle(map: L.Map, prev: LatLon, tip: LatLon) {
  const a = map.latLngToLayerPoint(L.latLng(prev[0], prev[1]));
  const b = map.latLngToLayerPoint(L.latLng(tip[0], tip[1]));
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function HopLine({
  from,
  to,
  avoid,
}: {
  from: MapPlace;
  to: MapPlace;
  avoid: LatLon[];
}) {
  const map = useMap();
  const [, setTick] = useState(0);
  useMapEvents({
    zoomend: () => setTick((n) => n + 1),
  });
  const curve = hopArc([from.lat, from.lon], [to.lat, to.lon], avoid);
  const tipAt = Math.floor(curve.length * 0.66);
  const tip = curve[tipAt] ?? curve[curve.length - 1];
  const prev = curve[Math.max(0, tipAt - 2)] ?? curve[0];
  const icon = L.divIcon({
    className: "usa-route-arrow",
    html: `<div class="usa-route-arrow-inner" style="transform:rotate(${hopAngle(map, prev, tip)}deg)"><svg width="22" height="22" viewBox="0 0 22 22"><polygon points="3,3 20,11 3,19" fill="${theme.category.orange}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  return (
    <>
      <Polyline
        interactive={false}
        positions={curve}
        pathOptions={{
          color: "#ffffff",
          weight: 10,
          opacity: 1,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Polyline
        interactive={false}
        positions={curve}
        pathOptions={{
          color: theme.category.orange,
          weight: 6,
          opacity: 1,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Marker position={tip} icon={icon} interactive={false} />
    </>
  );
}

const AIRPORT: Record<string, string> = {
  ny: "JFK",
  nwk: "EWR",
  dc: "IAD",
  phl: "PHL",
  bos: "BOS",
  chi: "ORD",
  bal: "BWI",
  mia: "MIA",
  orl: "MCO",
  tpa: "TPA",
  jax: "JAX",
  fll: "FLL",
  eyw: "EYW",
  atl: "ATL",
  msy: "MSY",
  mem: "MEM",
  aus: "AUS",
  hou: "IAH",
  sat: "SAT",
  pty: "PTY",
  boc: "BOC",
  bqt: "DAV",
  sfo: "SFO",
  lax: "LAX",
  san: "SAN",
  sea: "SEA",
  pdx: "PDX",
  las: "LAS",
  phx: "PHX",
};

const PLANE_SVG = `<svg class="usa-city-plane" width="12" height="12" viewBox="0 0 24 24" fill="${theme.category.orange}"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

function cityIcon(order: number, name: string, airport?: string) {
  const label = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const extra = airport
    ? `${PLANE_SVG}<span class="usa-city-iata">${airport}</span>`
    : "";
  return L.divIcon({
    className: "usa-city-mark",
    html: `<span class="usa-city-badge">${order}</span><span class="usa-city-name">${label}${extra}</span>`,
    iconSize: [200, 28],
    iconAnchor: [14, 14],
  });
}

function idleIcon(name: string) {
  const label = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return L.divIcon({
    className: "usa-city-mark is-idle",
    html: `<span class="usa-city-dot"></span><span class="usa-city-name">${label}</span>`,
    iconSize: [160, 22],
    iconAnchor: [5, 11],
  });
}

function HotMarker({
  hot,
  icon,
  position,
  pane,
  zIndexOffset,
  interactive = false,
  onHover,
  onLeave,
}: {
  hot: boolean;
  icon: L.DivIcon;
  position: LatLon;
  pane?: string;
  zIndexOffset?: number;
  interactive?: boolean;
  onHover?: (point: MapPoint) => void;
  onLeave?: () => void;
}) {
  const ref = useRef<L.Marker | null>(null);
  const apply = () => {
    const el = ref.current?.getElement();
    if (!el) return;
    el.classList.toggle("is-hot", hot);
  };
  useLayoutEffect(apply, [hot]);
  return (
    <Marker
      ref={ref}
      pane={pane}
      position={position}
      icon={icon}
      zIndexOffset={hot ? (zIndexOffset ?? 0) + 80 : zIndexOffset}
      interactive={interactive || Boolean(onHover)}
      eventHandlers={{
        add: apply,
        mouseover: onHover
          ? (event) => {
              L.DomEvent.stop(event);
              onHover(pointFrom(event));
            }
          : undefined,
        mousemove: onHover ? (event) => onHover(pointFrom(event)) : undefined,
        mouseout: onLeave,
      }}
    />
  );
}

function MapPanes() {
  const map = useMap();
  const cities = map.getPane("cities") ?? map.createPane("cities");
  cities.style.zIndex = "650";
  const labels = map.getPane("state-labels") ?? map.createPane("state-labels");
  labels.style.zIndex = "430";
  return null;
}

function Camera({
  tripKey,
  focusId,
}: {
  tripKey: string;
  focusId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const ids = tripKey.split(",").filter(Boolean);
    const focusState = focusId ? STATE_BY_CITY[focusId] ?? null : null;
    const names = focusState
      ? new Set([focusState])
      : namesFor(ids);
    const cityFocus = Boolean(focusId && CITY_FOCUS[focusId]);
    map.stop();
    map.fitBounds(boundsFor(names, ids, focusId), {
      padding: focusId ? [56, 56] : [32, 32],
      maxZoom: cityFocus ? 5 : focusId ? 4 : 6,
      animate: true,
      duration: focusId ? 0.4 : 0.3,
    });
  }, [focusId, map, tripKey]);

  return null;
}

function firstCityInState(state: string, cities: MapPlace[], chosen: Set<string>) {
  const matches = cities.filter((city) => STATE_BY_CITY[city.id] === state);
  return matches.find((city) => !chosen.has(city.id)) ?? matches[0];
}

export default function UsaMapInner({
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
  const tripKey = stops.map((stop) => stop.city).join(",");
  const tripStates = useMemo(() => namesFor(stops.map((stop) => stop.city)), [tripKey]);
  const labeledStates = useMemo(() => namesFor(cities.map((city) => city.id)), [cities]);
  const chosen = new Set(stops.map((stop) => stop.city));
  const idleIcons = useMemo(() => {
    const icons = new Map<string, L.DivIcon>();
    for (const city of cities) {
      icons.set(city.id, idleIcon(city.name));
    }
    return icons;
  }, [cities]);

  const stopsOnMap = stops
    .map((stop) => cities.find((city) => city.id === stop.city))
    .filter((city): city is MapPlace => Boolean(city));
  const hops = stopsOnMap.slice(0, -1).map((from, index) => ({
    from,
    to: stopsOnMap[index + 1] as MapPlace,
  }));

  const startBounds = boundsFor(
    tripStates,
    stops.map((stop) => stop.city),
  );

  const [hovered, setHovered] = useState<PlacePick | null>(null);
  const tipRef = useRef<HTMLElement>(null);
  const tipPoint = useRef<MapPoint>({ x: 16, y: 16 });
  const hideTimer = useRef<number | null>(null);

  const placeTip = useCallback((point: MapPoint) => {
    tipPoint.current = point;
    const el = tipRef.current;
    const parent = el?.offsetParent;
    if (!el || !(parent instanceof HTMLElement)) return;
    const left = Math.max(10, Math.min(point.x + 16, parent.clientWidth - el.offsetWidth - 10));
    const top = Math.max(10, Math.min(point.y + 16, parent.clientHeight - el.offsetHeight - 10));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, []);

  const hoverPlace = useCallback(
    (place: PlacePick, point: MapPoint) => {
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      setHovered((prev) => {
        if (prev && prev.state === place.state && prev.wiki === place.wiki && prev.cityId === place.cityId) {
          return prev;
        }
        tipPoint.current = point;
        return place;
      });
    },
    [],
  );

  const stayPlace = useCallback(() => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const leavePlace = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      setHovered(null);
    }, 180);
  }, []);

  const hoverState = useCallback(
    (name: string, point: MapPoint) => {
      const city = firstCityInState(name, cities, chosen);
      hoverPlace(
        {
          state: name,
          title: stateLabel(name),
          subtitle: name === "Panama" ? "Centroamérica" : "Estados Unidos",
          wiki: wikiTitleForState(name),
          cityId: city?.id,
        },
        point,
      );
    },
    [cities, chosen, hoverPlace],
  );

  const hoverCity = useCallback(
    (city: MapPlace, point: MapPoint) => {
      const state = STATE_BY_CITY[city.id] ?? city.state;
      hoverPlace(
        {
          state,
          title: city.name,
          subtitle: stateLabel(state) === city.name ? "En el itinerario" : stateLabel(state),
          wiki: wikiTitleForCity(city.id, state),
          cityId: city.id,
        },
        point,
      );
    },
    [hoverPlace],
  );

  useLayoutEffect(() => {
    if (hovered) placeTip(tipPoint.current);
  }, [hovered, placeTip]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      className="usa-map"
      style={{
        height: 420,
        width: "100%",
        overflow: "hidden",
        border: "none",
        borderRadius: 12,
      }}
    >
      <MapContainer
        bounds={startBounds}
        scrollWheelZoom
        attributionControl={false}
        zoomSnap={0.5}
        zoomDelta={0.5}
        style={{ height: "100%", width: "100%", background: theme.bg.editor }}
        minZoom={3}
        maxZoom={8}
      >
        <MapPanes />
        <MapChrome onLeave={leavePlace} />
        <StatesLayer
          hovered={hovered?.state ?? null}
          onHover={hoverState}
          onLeave={leavePlace}
        />
        <GeoJSON data={states} interactive={false} style={STATE_BORDER} />
        <StateNames picked={hovered?.state ?? null} allow={labeledStates} />
        <Camera tripKey={tripKey} focusId={focusId} />
        {hops.map((hop, index) => (
          <HopLine
            key={`${index}-${hop.from.id}-${hop.to.id}`}
            from={hop.from}
            to={hop.to}
            avoid={stopsOnMap
              .filter((city) => city.id !== hop.from.id && city.id !== hop.to.id)
              .map((city) => [city.lat, city.lon] as LatLon)}
          />
        ))}
        {cities.map((city) => {
          if (chosen.has(city.id)) return null;
          return (
            <HotMarker
              key={city.id}
              pane="cities"
              position={[city.lat, city.lon]}
              icon={idleIcons.get(city.id) ?? idleIcon(city.name)}
              hot={focusId === city.id}
              zIndexOffset={0}
              onHover={(point) => hoverCity(city, point)}
              onLeave={leavePlace}
            />
          );
        })}
        {stopsOnMap.map((city, index) => {
          const gateway = index === 0 || index === stopsOnMap.length - 1;
          return (
            <HotMarker
              key={`${city.id}-${index}`}
              pane="cities"
              position={[city.lat, city.lon]}
              icon={cityIcon(index + 1, city.name, gateway ? AIRPORT[city.id] : undefined)}
              hot={focusId === city.id}
              zIndexOffset={200 + index * 10}
              onHover={(point) => hoverCity(city, point)}
              onLeave={leavePlace}
            />
          );
        })}
      </MapContainer>
      {hovered ? (
        <PlacePeek
          place={hovered}
          tipRef={tipRef}
          canAdd={Boolean(hovered.cityId && onAddCity)}
          added={Boolean(hovered.cityId && chosen.has(hovered.cityId))}
          onAdd={hovered.cityId && onAddCity ? () => onAddCity(hovered.cityId as string) : undefined}
          onEnter={stayPlace}
          onLeave={leavePlace}
        />
      ) : null}
    </div>
  );
}
