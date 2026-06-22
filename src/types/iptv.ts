// Shapes mirror the iptv-org public API (https://iptv-org.github.io/api/*.json),
// confirmed against a live sample. Only fields the app reads are typed strictly;
// the rest are kept loose to tolerate upstream additions.

export interface Stream {
  channel: string | null;
  feed: string | null;
  title: string | null;
  url: string;
  quality: string | null;
  label: string | null;
  user_agent: string | null;
  referrer: string | null;
}

export interface Channel {
  id: string;
  name: string;
  alt_names?: string[];
  country: string | null;
  categories?: string[];
  is_nsfw?: boolean;
  website?: string | null;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Country {
  name: string;
  code: string;
  languages?: string[];
  flag: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface Feed {
  channel: string;
  id: string;
  name: string;
  is_main: boolean;
  languages?: string[];
}

export interface Logo {
  channel: string | null;
  feed: string | null;
  in_use: boolean;
  url: string;
}

// Runtime playback verdict for a stream URL.
export type Status =
  | "ok"
  | "proxied"
  | "geo"
  | "restricted"
  | "cors"
  | "offline"
  | "fail";

export interface StatusEntry {
  status: Status;
  ts: number;
}

export interface Lang {
  code: string;
  name: string;
}

// Immutable, derived once from streams⋈channels. Enrichment (logos, languages)
// lives in separate maps merged at read time — records are never mutated.
export interface StreamRecord {
  i: number;
  url: string;
  ch: string | null;
  feed: string | null;
  name: string;
  nameL: string;
  title: string;
  quality: string | null;
  cc: string | null;
  country: string;
  flag: string;
  countryL: string;
  cats: string[];
  catName: string;
  catNameL: string;
  label: string | null;
  geo: boolean;
  restricted: boolean;
  referrer: string | null;
  userAgent: string | null;
}

export interface BuildResult {
  records: StreamRecord[];
  catCounts: Map<string, number>;
  countryCounts: Map<string, number>;
  qualities: string[];
}

// Side maps produced by enrichment — keyed so records stay untouched.
export interface Enrichment {
  logosByCh: Map<string, string>;
  langById: Map<number, Lang>;
  langCounts: Map<string, number>;
}

export type StatusFilter =
  | ""
  | "playable"
  | "geo"
  | "restricted"
  | "fav"
  | "recent";

export type SortKey = "name" | "country" | "quality" | "status";

export interface Filters {
  q: string;
  cat: string;
  country: string;
  lang: string;
  qual: string;
  status: StatusFilter;
  sort: SortKey;
}

// Everything filterAndSort needs that lives outside the immutable records.
export interface FilterContext {
  langById: Map<number, Lang>;
  statusByUrl: Map<string, StatusEntry>;
  favorites: Set<string>;
  recent: string[];
}
