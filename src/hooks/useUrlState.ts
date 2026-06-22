import { useEffect, useRef } from "react";
import { buildAppQuery, channelMeta } from "../lib/url";
import type { Filters, StreamRecord } from "../types/iptv";

interface Args {
  // Selection requested by the URL on first load (parsed once by the caller).
  pending: { channelId: string | null; streamUrl: string | null };
  records: StreamRecord[];
  filters: Filters;
  current: StreamRecord | null;
  onSelect: (record: StreamRecord) => void;
}

interface HeadDefaults {
  title: string;
  description: string;
  canonical: string;
  baseOrigin: string;
}

// Two-way sync between shareable app state and the URL + document head.
// Read side resolves a shared ?ch=/?u= once data lands; write side mirrors
// filters + selection back. The write side stays gated until the read side has
// run, so the shared param is never stripped during the initial data fetch.
export function useUrlState({ pending, records, filters, current, onSelect }: Args) {
  const hydratedRef = useRef(false);
  const pendingRef = useRef(pending);
  const defaultsRef = useRef<HeadDefaults | null>(null);
  if (defaultsRef.current === null) defaultsRef.current = captureDefaults();

  useEffect(() => {
    if (hydratedRef.current || records.length === 0) return;
    const { channelId, streamUrl } = pendingRef.current;
    const hit = channelId
      ? records.find((r) => r.ch === channelId)
      : streamUrl
        ? records.find((r) => r.url === streamUrl)
        : undefined;
    if (hit) onSelect(hit);
    hydratedRef.current = true; // resolved or confirmed-absent — unblock writes
  }, [records, onSelect]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const query = buildAppQuery(filters, current);
    history.replaceState(null, "", query || location.pathname);
    applyHead(current, defaultsRef.current!);
  }, [filters, current]);
}

function captureDefaults(): HeadDefaults {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
    || `${location.origin}/`;
  return {
    title: document.title,
    description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "",
    canonical,
    baseOrigin: new URL(canonical).origin,
  };
}

function applyHead(current: StreamRecord | null, defaults: HeadDefaults) {
  const meta = current
    ? channelMeta(current, defaults.baseOrigin)
    : { title: defaults.title, description: defaults.description, canonical: defaults.canonical };
  document.title = meta.title;
  setMeta('meta[name="description"]', "name", "description", meta.description);
  setMeta('meta[property="og:title"]', "property", "og:title", meta.title);
  setMeta('meta[property="og:description"]', "property", "og:description", meta.description);
  setMeta('meta[property="og:url"]', "property", "og:url", meta.canonical);
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = meta.canonical;
}

function setMeta(selector: string, attr: string, key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}
