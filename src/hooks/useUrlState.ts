import { useEffect, useRef, useState } from "react";
import { buildAppQuery, channelMeta, navAction, parseAppUrl, type ParsedUrl } from "../lib/url";
import type { Filters, StreamRecord } from "../types/iptv";

interface Args {
  // Selection requested by the URL on first load (parsed once by the caller).
  pending: { channelId: string | null; streamUrl: string | null };
  records: StreamRecord[];
  filters: Filters;
  current: StreamRecord | null;
  onSelect: (record: StreamRecord) => void;
  // Re-apply full app state when the user navigates history (Back/Forward).
  onRestore: (parsed: ParsedUrl) => void;
}

interface HeadDefaults {
  title: string;
  description: string;
  canonical: string;
  baseOrigin: string;
}

// Two-way sync between shareable app state and the URL + document head.
// Read side resolves a shared ?ch=/?u= once data lands; write side mirrors
// filters + selection back, pushing a history entry per change so Back undoes
// it; a popstate listener re-applies state on history navigation. The write
// side stays gated until the read side has run, so the shared param is never
// stripped during the initial data fetch.
//
// `hydrated` is state (not a ref) so the first write pass runs at load on both
// paths — clean and shared-link — consuming `firstWrite` to establish a
// back-able baseline before any user action pushes.
export function useUrlState({ pending, records, filters, current, onSelect, onRestore }: Args) {
  const [hydrated, setHydrated] = useState(false);
  const firstWriteRef = useRef(true);
  const pendingRef = useRef(pending);
  const defaultsRef = useRef<HeadDefaults | null>(null);
  if (defaultsRef.current === null) defaultsRef.current = captureDefaults();

  useEffect(() => {
    if (hydrated || records.length === 0) return;
    const { channelId, streamUrl } = pendingRef.current;
    const hit = channelId
      ? records.find((r) => r.ch === channelId)
      : streamUrl
        ? records.find((r) => r.url === streamUrl)
        : undefined;
    if (hit) onSelect(hit);
    setHydrated(true); // resolved or confirmed-absent — unblock writes
  }, [hydrated, records, onSelect]);

  useEffect(() => {
    if (!hydrated) return;
    applyHead(current, defaultsRef.current!);
    const query = buildAppQuery(filters, current);
    const action = navAction(query, location.search, firstWriteRef.current);
    firstWriteRef.current = false;
    if (action === "skip") return;
    const url = query || location.pathname;
    if (action === "replace") history.replaceState(null, "", url);
    else history.pushState(null, "", url);
  }, [hydrated, filters, current]);

  useEffect(() => {
    const onPop = () => onRestore(parseAppUrl(location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onRestore]);
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
