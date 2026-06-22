import type {
  StreamRecord,
  Filters,
  FilterContext,
  Status,
} from "../types/iptv";
import { QUALITY_ORDER } from "./records";

const STATUS_RANK: Record<string, number> = {
  ok: 0,
  proxied: 0,
  geo: 1,
  restricted: 2,
  fail: 3,
  offline: 3,
  cors: 3,
};

const statusOf = (r: StreamRecord, ctx: FilterContext): Status | null =>
  ctx.statusByUrl.get(r.url)?.status ?? null;

// Port of the original applyFilters: filter by the active facets + search,
// then sort. Enrichment-derived language lives in ctx.langById (merged at read
// time), so this stays correct both before and after enrichment loads.
export function filterAndSort(
  records: StreamRecord[],
  f: Filters,
  ctx: FilterContext,
): StreamRecord[] {
  const q = f.q.trim().toLowerCase();
  const terms = q ? q.split(/\s+/) : [];

  const out = records.filter((r) => {
    if (f.cat) {
      if (f.cat === "__none") {
        if (r.cats.length) return false;
      } else if (!r.cats.includes(f.cat)) return false;
    }
    if (f.country && r.cc !== f.country) return false;

    const lang = ctx.langById.get(r.i);
    if (f.lang && (!lang || lang.code !== f.lang)) return false;
    if (f.qual && r.quality !== f.qual) return false;

    if (f.status) {
      const st = statusOf(r, ctx);
      if (f.status === "geo" && !r.geo) return false;
      if (f.status === "restricted" && !r.restricted) return false;
      if (
        f.status === "playable" &&
        (r.geo ||
          r.restricted ||
          st === "fail" ||
          st === "offline" ||
          st === "cors")
      )
        return false;
      if (f.status === "fav" && !ctx.favorites.has(r.url)) return false;
      if (f.status === "recent" && !ctx.recent.includes(r.url)) return false;
    }

    if (terms.length) {
      const langName = ctx.langById.get(r.i)?.name.toLowerCase() ?? "";
      const hay = `${r.nameL} ${r.countryL} ${r.catNameL} ${langName}`;
      for (const t of terms) if (hay.indexOf(t) < 0) return false;
    }
    return true;
  });

  out.sort((a, b) => {
    switch (f.sort) {
      case "country":
        return a.country.localeCompare(b.country) || a.nameL.localeCompare(b.nameL);
      case "quality": {
        const ia = QUALITY_ORDER.indexOf(a.quality ?? "");
        const ib = QUALITY_ORDER.indexOf(b.quality ?? "");
        return (
          (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.nameL.localeCompare(b.nameL)
        );
      }
      case "status": {
        const ra = STATUS_RANK[statusOf(a, ctx) ?? ""] ?? 0;
        const rb = STATUS_RANK[statusOf(b, ctx) ?? ""] ?? 0;
        return (
          ra - rb ||
          Number(a.geo) - Number(b.geo) ||
          a.nameL.localeCompare(b.nameL)
        );
      }
      default:
        return a.nameL.localeCompare(b.nameL);
    }
  });

  // Favorites float to the top within the default name sort (stable).
  if (f.sort === "name") {
    out.sort((a, b) => {
      const fa = ctx.favorites.has(a.url) ? 1 : 0;
      const fb = ctx.favorites.has(b.url) ? 1 : 0;
      return fb - fa;
    });
  }

  return out;
}
