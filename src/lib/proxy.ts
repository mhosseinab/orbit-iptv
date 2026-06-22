import type { StreamRecord } from "../types/iptv";

// Same-origin Cloudflare Pages Function fallback for streams that won't play
// directly (CORS-blocked, geo-via-IP, header-restricted, or http on https).
export const PROXY_BASE = "/proxy";

export function proxiedUrl(
  url: string,
  ref?: string | null,
  ua?: string | null,
): string {
  let q = `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
  if (ref) q += `&ref=${encodeURIComponent(ref)}`;
  if (ua) q += `&ua=${encodeURIComponent(ua)}`;
  return q;
}

// Streams we know browsers can't play directly should go straight to the proxy
// (when one is available): header-restricted sources, or http on an https page.
export function needsProxyFirst(r: StreamRecord, proxyOk: boolean): boolean {
  if (!proxyOk) return false;
  const mixed =
    typeof location !== "undefined" &&
    location.protocol === "https:" &&
    /^http:\/\//i.test(r.url);
  return r.restricted || mixed;
}

export async function pingProxy(): Promise<boolean> {
  try {
    const r = await fetch(`${PROXY_BASE}?ping=1`, { cache: "no-store" });
    return r.ok && (await r.text()).trim() === "orbit-proxy-ok";
  } catch {
    return false;
  }
}
