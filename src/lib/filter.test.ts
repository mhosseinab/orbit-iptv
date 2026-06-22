import { describe, it, expect } from "vitest";
import { filterAndSort } from "./filter";
import type {
  StreamRecord,
  Filters,
  FilterContext,
  Lang,
  StatusEntry,
} from "../types/iptv";

let counter = 0;
function rec(p: Partial<StreamRecord>): StreamRecord {
  const name = p.name ?? "Channel";
  const country = p.country ?? "";
  const catName = p.catName ?? "";
  return {
    i: counter++,
    url: p.url ?? `http://x/${counter}`,
    ch: p.ch ?? null,
    feed: p.feed ?? null,
    name,
    nameL: name.toLowerCase(),
    title: name,
    quality: p.quality ?? null,
    cc: p.cc ?? null,
    country,
    flag: "",
    countryL: country.toLowerCase(),
    cats: p.cats ?? [],
    catName,
    catNameL: catName.toLowerCase(),
    label: p.label ?? null,
    geo: p.geo ?? false,
    restricted: p.restricted ?? false,
    referrer: null,
    userAgent: null,
  };
}

const baseFilters: Filters = {
  q: "",
  cat: "",
  country: "",
  lang: "",
  qual: "",
  status: "",
  sort: "name",
};

function ctx(p: Partial<FilterContext> = {}): FilterContext {
  return {
    langById: p.langById ?? new Map<number, Lang>(),
    statusByUrl: p.statusByUrl ?? new Map<string, StatusEntry>(),
    favorites: p.favorites ?? new Set<string>(),
    recent: p.recent ?? [],
  };
}

describe("filterAndSort", () => {
  it("sorts by name case-insensitively by default", () => {
    counter = 0;
    const records = [rec({ name: "Zeta" }), rec({ name: "alpha" }), rec({ name: "Beta" })];
    const out = filterAndSort(records, baseFilters, ctx());
    expect(out.map((r) => r.name)).toEqual(["alpha", "Beta", "Zeta"]);
  });

  it("keeps favorites on top within the default name sort", () => {
    counter = 0;
    const records = [rec({ name: "Zeta", url: "z" }), rec({ name: "alpha", url: "a" })];
    const out = filterAndSort(records, baseFilters, ctx({ favorites: new Set(["z"]) }));
    expect(out.map((r) => r.name)).toEqual(["Zeta", "alpha"]);
  });

  it("filters by category, country and quality", () => {
    counter = 0;
    const records = [
      rec({ name: "A", cats: ["news"], cc: "US", quality: "720p" }),
      rec({ name: "B", cats: ["movies"], cc: "FR", quality: "1080p" }),
    ];
    expect(filterAndSort(records, { ...baseFilters, cat: "news" }, ctx()).map((r) => r.name)).toEqual(["A"]);
    expect(filterAndSort(records, { ...baseFilters, country: "FR" }, ctx()).map((r) => r.name)).toEqual(["B"]);
    expect(filterAndSort(records, { ...baseFilters, qual: "1080p" }, ctx()).map((r) => r.name)).toEqual(["B"]);
  });

  it("supports the __none category (uncategorized)", () => {
    counter = 0;
    const records = [rec({ name: "A", cats: ["news"] }), rec({ name: "B", cats: [] })];
    expect(filterAndSort(records, { ...baseFilters, cat: "__none" }, ctx()).map((r) => r.name)).toEqual(["B"]);
  });

  it("matches every search term across name, country, category and language", () => {
    counter = 0;
    const records = [
      rec({ name: "France 24", country: "France", catName: "News" }),
      rec({ name: "CNN", country: "United States", catName: "News" }),
    ];
    const out = filterAndSort(records, { ...baseFilters, q: "news france" }, ctx());
    expect(out.map((r) => r.name)).toEqual(["France 24"]);
  });

  it("language filter is inert before enrichment (empty langById)", () => {
    counter = 0;
    const records = [rec({ name: "A" }), rec({ name: "B" })];
    // With a lang filter set but no langById, nothing matches that code...
    expect(filterAndSort(records, { ...baseFilters, lang: "fra" }, ctx())).toHaveLength(0);
    // ...but with no lang filter, all pass regardless of enrichment.
    expect(filterAndSort(records, baseFilters, ctx())).toHaveLength(2);
  });

  it("language filter and search use langById after enrichment", () => {
    counter = 0;
    const a = rec({ name: "A" });
    const b = rec({ name: "B" });
    const langById = new Map([
      [a.i, { code: "fra", name: "French" }],
      [b.i, { code: "eng", name: "English" }],
    ]);
    const c = ctx({ langById });
    expect(filterAndSort([a, b], { ...baseFilters, lang: "fra" }, c).map((r) => r.name)).toEqual(["A"]);
    expect(filterAndSort([a, b], { ...baseFilters, q: "english" }, c).map((r) => r.name)).toEqual(["B"]);
  });

  it("status filter: geo, restricted, favorites and recent", () => {
    counter = 0;
    const geo = rec({ name: "Geo", geo: true, url: "g" });
    const res = rec({ name: "Res", restricted: true, url: "r" });
    const plain = rec({ name: "Plain", url: "p" });
    const records = [geo, res, plain];
    const c = ctx({ favorites: new Set(["p"]), recent: ["r"] });
    expect(filterAndSort(records, { ...baseFilters, status: "geo" }, c).map((r) => r.name)).toEqual(["Geo"]);
    expect(filterAndSort(records, { ...baseFilters, status: "restricted" }, c).map((r) => r.name)).toEqual(["Res"]);
    expect(filterAndSort(records, { ...baseFilters, status: "fav" }, c).map((r) => r.name)).toEqual(["Plain"]);
    expect(filterAndSort(records, { ...baseFilters, status: "recent" }, c).map((r) => r.name)).toEqual(["Res"]);
  });

  it("status 'playable' excludes geo, restricted, and failed/offline/cors statuses", () => {
    counter = 0;
    const ok = rec({ name: "Ok", url: "ok" });
    const geo = rec({ name: "Geo", geo: true, url: "g" });
    const restricted = rec({ name: "Res", restricted: true, url: "r" });
    const dead = rec({ name: "Dead", url: "d" });
    const records = [ok, geo, restricted, dead];
    const statusByUrl = new Map<string, StatusEntry>([["d", { status: "offline", ts: 0 }]]);
    const out = filterAndSort(records, { ...baseFilters, status: "playable" }, ctx({ statusByUrl }));
    expect(out.map((r) => r.name)).toEqual(["Ok"]);
  });

  it("sorts by country then name", () => {
    counter = 0;
    const records = [
      rec({ name: "B", country: "France" }),
      rec({ name: "A", country: "France" }),
      rec({ name: "C", country: "Algeria" }),
    ];
    const out = filterAndSort(records, { ...baseFilters, sort: "country" }, ctx());
    expect(out.map((r) => r.name)).toEqual(["C", "A", "B"]);
  });

  it("sorts by quality with known ranking, unknown last", () => {
    counter = 0;
    const records = [
      rec({ name: "SD", quality: "480p" }),
      rec({ name: "HD", quality: "1080p" }),
      rec({ name: "Unknown", quality: null }),
      rec({ name: "Mid", quality: "720p" }),
    ];
    const out = filterAndSort(records, { ...baseFilters, sort: "quality" }, ctx());
    expect(out.map((r) => r.name)).toEqual(["HD", "Mid", "SD", "Unknown"]);
  });

  it("sorts by status rank (ok first, then geo, restricted, failures)", () => {
    counter = 0;
    const ok = rec({ name: "Ok", url: "ok" });
    const geo = rec({ name: "Geo", geo: true, url: "g" });
    const fail = rec({ name: "Fail", url: "f" });
    const records = [fail, geo, ok];
    const statusByUrl = new Map<string, StatusEntry>([
      ["ok", { status: "ok", ts: 0 }],
      ["f", { status: "fail", ts: 0 }],
    ]);
    const out = filterAndSort(records, { ...baseFilters, sort: "status" }, ctx({ statusByUrl }));
    expect(out.map((r) => r.name)).toEqual(["Ok", "Geo", "Fail"]);
  });
});
