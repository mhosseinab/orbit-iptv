import { idbGet, idbSet } from "./idb";

export const API_HOSTS = [
  "https://iptv-org.github.io/api",
  "https://cdn.jsdelivr.net/gh/iptv-org/api@gh-pages",
  "https://cdn.statically.io/gh/iptv-org/api/gh-pages",
];

// Fetch an iptv-org JSON file, served from the IndexedDB cache when fresh and
// falling back across mirror hosts on failure.
export async function fetchJSON<T>(
  file: string,
  { cache = true }: { cache?: boolean } = {},
): Promise<T> {
  if (cache) {
    const cached = await idbGet<T>(file);
    if (cached) return cached;
  }
  let lastErr: unknown;
  for (const host of API_HOSTS) {
    try {
      const r = await fetch(`${host}/${file}`, { mode: "cors" });
      if (!r.ok) {
        lastErr = new Error(`${host} → HTTP ${r.status}`);
        continue;
      }
      const json = (await r.json()) as T;
      if (cache) idbSet(file, json);
      return json;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`All hosts failed for ${file}`);
}
