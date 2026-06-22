// Pure (de)serialization between the app's shareable state and the URL query.
// The URL is a trust boundary — union-typed params are validated, not assumed.
import {
  SORT_VALUES,
  STATUS_VALUES,
  type Filters,
  type SortKey,
  type StatusFilter,
  type StreamRecord,
} from "../types/iptv";

export interface ParsedUrl {
  filters: Filters;
  channelId: string | null;
  streamUrl: string | null;
}

export interface ChannelMeta {
  title: string;
  description: string;
  canonical: string;
}

export function parseAppUrl(search: string): ParsedUrl {
  const p = new URLSearchParams(search);
  const status = p.get("status") as StatusFilter;
  const sort = p.get("sort") as SortKey;
  return {
    filters: {
      q: p.get("q") ?? "",
      cat: p.get("cat") ?? "",
      country: p.get("country") ?? "",
      lang: p.get("lang") ?? "",
      qual: p.get("qual") ?? "",
      status: STATUS_VALUES.includes(status) ? status : "",
      sort: SORT_VALUES.includes(sort) ? sort : "name",
    },
    channelId: p.get("ch") || null,
    streamUrl: p.get("u") || null,
  };
}

// Query string ("?…" or "") mirroring the current filters + selection. Defaults
// are omitted so a pristine app produces a bare URL.
export function buildAppQuery(filters: Filters, current: StreamRecord | null): string {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.cat) p.set("cat", filters.cat);
  if (filters.country) p.set("country", filters.country);
  if (filters.lang) p.set("lang", filters.lang);
  if (filters.qual) p.set("qual", filters.qual);
  if (filters.status) p.set("status", filters.status);
  if (filters.sort !== "name") p.set("sort", filters.sort);
  if (current) addSelection(p, current);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// A clean, filter-free deep link to one channel — what the Share button copies.
export function shareUrl(origin: string, record: StreamRecord): string {
  const p = new URLSearchParams();
  addSelection(p, record);
  return `${origin}/?${p.toString()}`;
}

export function channelMeta(record: StreamRecord, baseOrigin: string): ChannelMeta {
  const where = [record.country, record.catName].filter(Boolean).join(", ");
  return {
    title: `${record.name} — Watch Live Online · Orbit IPTV`,
    description: `Watch ${record.name} live${where ? ` (${where})` : ""} free in your browser on Orbit IPTV — no signup, nothing to install.`,
    canonical: shareUrl(baseOrigin, record),
  };
}

function addSelection(p: URLSearchParams, record: StreamRecord): void {
  if (record.ch) p.set("ch", record.ch);
  else p.set("u", record.url);
}
