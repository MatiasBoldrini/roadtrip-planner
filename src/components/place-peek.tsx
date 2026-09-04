"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type PlacePick = {
  state: string;
  title: string;
  subtitle: string;
  wiki: string;
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

type WikiMedia = {
  items?: Array<{
    type?: string;
    srcset?: { src?: string } | Array<{ src?: string; scale?: string }>;
  }>;
};

type WikiSummary = {
  extract?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

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

async function loadPlaceMedia(wiki: string, signal: AbortSignal) {
  const title = encodeURIComponent(wiki);
  const headers = { accept: "application/json" };
  const [summaryRes, mediaRes] = await Promise.all([
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, { signal, headers }),
    fetch(`https://en.wikipedia.org/api/rest_v1/page/media-list/${title}`, { signal, headers }),
  ]);
  const photos: string[] = [];
  let blurb = "";
  if (summaryRes.ok) {
    const summary = (await summaryRes.json()) as WikiSummary;
    blurb = summary.extract ?? "";
    const hero = absUrl(summary.originalimage?.source) ?? absUrl(summary.thumbnail?.source);
    if (hero) photos.push(hero);
  }
  if (mediaRes.ok) {
    const media = (await mediaRes.json()) as WikiMedia;
    for (const item of media.items ?? []) {
      if (item.type !== "image") continue;
      const url = srcsetUrl(item.srcset);
      if (url && !photos.includes(url)) photos.push(url);
      if (photos.length >= 4) break;
    }
  }
  const scenic = photos.filter((url) => !/seal|coat_of_arms|locator_map|flag_of|svg\.png/i.test(url));
  const chosen = (scenic.length ? scenic : photos).slice(0, 4);
  return {
    photos: chosen.length ? chosen : FALLBACK_PHOTOS,
    blurb,
  };
}

export function PlacePeek({
  place,
  onClose,
}: {
  place: PlacePick;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<string[]>(FALLBACK_PHOTOS);
  const [blurb, setBlurb] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setReady(false);
    setBlurb("");
    setPhotos(FALLBACK_PHOTOS);
    loadPlaceMedia(place.wiki, ac.signal)
      .then((next) => {
        if (ac.signal.aborted) return;
        setPhotos(next.photos);
        setBlurb(next.blurb);
        setReady(true);
      })
      .catch(() => {
        if (!ac.signal.aborted) setReady(true);
      });
    return () => ac.abort();
  }, [place.wiki]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hero = photos[0];
  const thumbs = photos.slice(1, 4);

  return (
    <aside className="place-peek" aria-label={place.title}>
      <button type="button" className="place-peek-close" onClick={onClose} aria-label="Cerrar">
        <span aria-hidden>×</span>
      </button>
      {hero ? (
        <div className="place-peek-hero">
          <Image
            src={hero}
            alt={place.title}
            fill
            sizes="320px"
            className="place-peek-photo"
            referrerPolicy="no-referrer"
            priority
          />
        </div>
      ) : null}
      {thumbs.length ? (
        <div className="place-peek-thumbs">
          {thumbs.map((src) => (
            <div key={src} className="place-peek-thumb">
              <Image src={src} alt="" fill sizes="96px" className="place-peek-photo" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="place-peek-copy">
        {stateLabel(place.state) !== place.title ? (
          <p className="place-peek-kicker">{stateLabel(place.state)}</p>
        ) : null}
        <h3 className="place-peek-title">{place.title}</h3>
        {place.subtitle && place.subtitle !== place.title && place.subtitle !== stateLabel(place.state) ? (
          <p className="place-peek-sub">{place.subtitle}</p>
        ) : null}
        {ready && blurb ? <p className="place-peek-blurb">{blurb}</p> : null}
      </div>
    </aside>
  );
}
