"use client";

import { useEffect, useState, type Ref } from "react";
import Image from "next/image";

export type PlacePick = {
  state: string;
  title: string;
  subtitle: string;
  wiki: string;
  cityId?: string;
};

const STATE_ES: Record<string, string> = {
  Alabama: "Alabama",
  Arizona: "Arizona",
  Arkansas: "Arkansas",
  California: "California",
  Colorado: "Colorado",
  Connecticut: "Connecticut",
  Delaware: "Delaware",
  "District of Columbia": "Washington D. C.",
  Florida: "Florida",
  Georgia: "Georgia",
  Idaho: "Idaho",
  Illinois: "Illinois",
  Indiana: "Indiana",
  Iowa: "Iowa",
  Kansas: "Kansas",
  Kentucky: "Kentucky",
  Louisiana: "Luisiana",
  Maine: "Maine",
  Maryland: "Maryland",
  Massachusetts: "Massachusetts",
  Michigan: "Michigan",
  Minnesota: "Minnesota",
  Mississippi: "Misisipi",
  Missouri: "Misuri",
  Montana: "Montana",
  Nebraska: "Nebraska",
  Nevada: "Nevada",
  "New Hampshire": "Nuevo Hampshire",
  "New Jersey": "Nueva Jersey",
  "New Mexico": "Nuevo México",
  "New York": "Nueva York",
  "North Carolina": "Carolina del Norte",
  "North Dakota": "Dakota del Norte",
  Ohio: "Ohio",
  Oklahoma: "Oklahoma",
  Oregon: "Oregón",
  Panama: "Panamá",
  Pennsylvania: "Pensilvania",
  "Rhode Island": "Rhode Island",
  "South Carolina": "Carolina del Sur",
  "South Dakota": "Dakota del Sur",
  Tennessee: "Tennessee",
  Texas: "Texas",
  Utah: "Utah",
  Vermont: "Vermont",
  Virginia: "Virginia",
  Washington: "Washington",
  "West Virginia": "Virginia Occidental",
  Wisconsin: "Wisconsin",
  Wyoming: "Wyoming",
};

const STATE_WIKI: Record<string, string> = {
  Georgia: "Georgia_(U.S._state)",
  Washington: "Washington_(state)",
  "New York": "New_York_(state)",
  Panama: "Panama",
};

const CITY_WIKI: Record<string, string> = {
  ny: "New_York_City",
  dc: "Washington,_D.C.",
  phl: "Philadelphia",
  bos: "Boston",
  chi: "Chicago",
  bal: "Baltimore",
  nwk: "Newark,_New_Jersey",
  wil: "Wilmington,_Delaware",
  pvd: "Providence,_Rhode_Island",
  pwm: "Portland,_Maine",
  buf: "Niagara_Falls",
  pit: "Pittsburgh",
  ric: "Richmond,_Virginia",
  rdu: "Raleigh,_North_Carolina",
  clt: "Charlotte,_North_Carolina",
  chs: "Charleston,_South_Carolina",
  sav: "Savannah,_Georgia",
  atl: "Atlanta",
  mia: "Miami",
  orl: "Orlando,_Florida",
  tpa: "Tampa,_Florida",
  jax: "Jacksonville,_Florida",
  fll: "Fort_Lauderdale,_Florida",
  eyw: "Key_West",
  ust: "St._Augustine,_Florida",
  msy: "New_Orleans",
  bna: "Nashville,_Tennessee",
  mem: "Memphis,_Tennessee",
  aus: "Austin,_Texas",
  hou: "Houston",
  sat: "San_Antonio",
  pty: "Panama_City",
  boc: "Bocas_del_Toro",
  bqt: "Boquete,_Panama",
  sfo: "San_Francisco",
  lax: "Los_Angeles",
  san: "San_Diego",
  pdx: "Portland,_Oregon",
  sea: "Seattle",
  las: "Las_Vegas",
  phx: "Phoenix,_Arizona",
};

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
];

export function stateLabel(name: string) {
  return STATE_ES[name] ?? name;
}

export function wikiTitleForState(name: string) {
  return STATE_WIKI[name] ?? name.replaceAll(" ", "_");
}

export function wikiTitleForCity(id: string, state: string) {
  return CITY_WIKI[id] ?? wikiTitleForState(state);
}

type WikiMediaItem = {
  type?: string;
  title?: string;
  caption?: { text?: string };
  srcset?: { src?: string } | Array<{ src?: string; scale?: string }>;
};

type WikiMedia = { items?: WikiMediaItem[] };

type WikiSummary = {
  extract?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

const SKIP_IMAGE =
  /\bflags?\b|[_ ]flags?\b|flag_of|seal_of|\bseals?\b|coat[_ ]of[_ ]arms|state[_ ]arms|locator|map_of|geo[_ ]map|diagram|population|census|gdp|income|ethnic|koppen|climate|wordmark|\blogos?\b|signature|state[_ ]quarter|\bcoins?\b|postage|proof\.png|banner[_ ]of|municipalities|counties[_ ]by|density|demograph|election|\bvote\b|governor|portrait|headshot|3x4|mugshot|crash|wreck|disaster|9-11|9_11|flight_93|flight_175|ambox|padlock|pictogram|commons-logo/i;

const PLACE_IMAGE =
  /skyline|downtown|park|beach|capitol|bridge|canyon|falls|waterfall|mountain|river|harbor|harbour|coast|island|desert|lake|cityscape|lighthouse|cathedral|basilica|mission|alamo|statue|tower|plaza|square|boardwalk|pier|valley|monument|memorial|waterfront|national[_ ]park|state[_ ]park|hill[_ ]country|everglades|yosemite|liberty|golden[_ ]gate|times[_ ]square|french[_ ]quarter|south[_ ]beach|river[_ ]walk/i;

function absUrl(src?: string) {
  if (!src) return null;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("http")) return src;
  return null;
}

function srcsetUrl(srcset?: { src?: string } | Array<{ src?: string }>) {
  if (!srcset) return null;
  if (Array.isArray(srcset)) {
    const best = [...srcset].reverse().find((item) => item.src) ?? srcset[0];
    return absUrl(best?.src);
  }
  return absUrl(srcset.src);
}

function imageHaystack(item: WikiMediaItem) {
  return `${item.title ?? ""} ${item.caption?.text ?? ""}`;
}

function scoreScenicPhoto(item: WikiMediaItem, url: string) {
  const hay = imageHaystack(item);
  if (SKIP_IMAGE.test(hay) || /\.svg/i.test(`${item.title ?? ""} ${url}`)) return null;
  if (/\b1[6-9]\d{2}\b/.test(item.title ?? "")) return null;
  let score = 1;
  if (PLACE_IMAGE.test(hay)) score += 6;
  if (/\.jpe?g/i.test(`${item.title ?? ""} ${url}`)) score += 2;
  if (/popular tourist|most recognized|iconic|skyline|national park/i.test(hay)) score += 3;
  if (/stadium|arena|casino|airport|terminal|ship_channel|oil_well/i.test(hay)) score -= 3;
  return score;
}

function pickScenicPhotos(items: WikiMediaItem[]) {
  const ranked: Array<{ score: number; url: string }> = [];
  for (const item of items) {
    if (item.type !== "image") continue;
    const url = srcsetUrl(item.srcset);
    if (!url) continue;
    const score = scoreScenicPhoto(item, url);
    if (score == null) continue;
    if (ranked.some((entry) => entry.url === url)) continue;
    ranked.push({ score, url });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, 4).map((entry) => entry.url);
}

const mediaCache = new Map<string, { photos: string[]; blurb: string }>();

async function wikiJson<T>(path: string, signal: AbortSignal): Promise<T | null> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/${path}`, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

function tourismWiki(wiki: string) {
  return `Tourism_in_${wiki.replace(/_\([^)]*\)$/, "")}`;
}

async function loadPlaceMedia(wiki: string, signal: AbortSignal) {
  const cached = mediaCache.get(wiki);
  if (cached) return cached;

  const title = encodeURIComponent(wiki);
  const [summary, media] = await Promise.all([
    wikiJson<WikiSummary>(`page/summary/${title}`, signal),
    wikiJson<WikiMedia>(`page/media-list/${title}`, signal),
  ]);
  const blurb = summary?.extract ?? "";
  let photos = pickScenicPhotos(media?.items ?? []);

  if (!photos.length) {
    const extra = await wikiJson<WikiMedia>(
      `page/media-list/${encodeURIComponent(tourismWiki(wiki))}`,
      signal,
    );
    photos = pickScenicPhotos(extra?.items ?? []);
  }

  const next = {
    photos: photos.length ? photos : FALLBACK_PHOTOS,
    blurb,
  };
  mediaCache.set(wiki, next);
  return next;
}

export function youtubeSearchUrl(place: PlacePick) {
  const query = place.cityId
    ? `${place.title} ${stateLabel(place.state)}`
    : `${stateLabel(place.state)} viaje`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function PlacePeek({
  place,
  tipRef,
  canAdd,
  added,
  onAdd,
  onEnter,
  onLeave,
}: {
  place: PlacePick;
  tipRef?: Ref<HTMLElement>;
  canAdd?: boolean;
  added?: boolean;
  onAdd?: () => void;
  onEnter?: () => void;
  onLeave?: () => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    const cached = mediaCache.get(place.wiki);
    setPhotos(cached?.photos ?? []);
    if (cached) return () => ac.abort();
    loadPlaceMedia(place.wiki, ac.signal)
      .then((next) => {
        if (ac.signal.aborted) return;
        setPhotos(next.photos);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [place.wiki]);

  const hero = photos[0];

  return (
    <aside
      ref={tipRef}
      className="place-peek"
      aria-label={place.title}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="place-peek-hero">
        {hero ? (
          <Image
            src={hero}
            alt=""
            fill
            sizes="280px"
            className="place-peek-photo"
            referrerPolicy="no-referrer"
            priority
          />
        ) : null}
      </div>
      <div className="place-peek-copy">
        {stateLabel(place.state) !== place.title ? (
          <p className="place-peek-kicker">{stateLabel(place.state)}</p>
        ) : null}
        <h3 className="place-peek-title">{place.title}</h3>
        {place.subtitle && place.subtitle !== place.title && place.subtitle !== stateLabel(place.state) ? (
          <p className="place-peek-sub">{place.subtitle}</p>
        ) : null}
        <div className="place-peek-actions">
          {canAdd ? (
            <button
              type="button"
              className="place-peek-cta is-add"
              disabled={added}
              onClick={onAdd}
            >
              {added ? "Ya está en el viaje" : "Agregar al viaje"}
            </button>
          ) : null}
          <a
            className="place-peek-cta is-info"
            href={youtubeSearchUrl(place)}
            target="_blank"
            rel="noreferrer"
          >
            Ver más info
          </a>
        </div>
      </div>
    </aside>
  );
}
