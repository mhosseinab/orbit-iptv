import { describe, it, expect } from "vitest";
import { parseAppUrl, buildAppQuery, shareUrl, channelMeta, navAction } from "./url";
import type { Filters, StreamRecord } from "../types/iptv";

const DEFAULTS: Filters = {
  q: "",
  cat: "",
  country: "",
  lang: "",
  qual: "",
  status: "",
  sort: "name",
};

let counter = 0;
function rec(p: Partial<StreamRecord>): StreamRecord {
  const name = p.name ?? "Channel";
  const country = p.country ?? "";
  const catName = p.catName ?? "";
  return {
    i: counter++,
    url: p.url ?? `http://x/${counter}.m3u8`,
    ch: p.ch ?? null,
    feed: p.feed ?? null,
    name,
    nameL: name.toLowerCase(),
    title: name,
    quality: p.quality ?? null,
    cc: p.cc ?? null,
    country,
    flag: p.flag ?? "",
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

describe("parseAppUrl", () => {
  it("returns defaults and no selection for an empty query", () => {
    const r = parseAppUrl("");
    expect(r.filters).toEqual(DEFAULTS);
    expect(r.channelId).toBeNull();
    expect(r.streamUrl).toBeNull();
  });

  it("reads every filter param", () => {
    const r = parseAppUrl("?q=news&cat=sports&country=us&lang=eng&qual=1080p&status=geo&sort=country");
    expect(r.filters).toEqual({
      q: "news",
      cat: "sports",
      country: "us",
      lang: "eng",
      qual: "1080p",
      status: "geo",
      sort: "country",
    });
  });

  it("drops invalid status and sort values to defaults", () => {
    const r = parseAppUrl("?status=drop-tables&sort=evil");
    expect(r.filters.status).toBe("");
    expect(r.filters.sort).toBe("name");
  });

  it("reads a shared channel id", () => {
    const r = parseAppUrl("?ch=CNN.us");
    expect(r.channelId).toBe("CNN.us");
    expect(r.streamUrl).toBeNull();
  });

  it("reads a shared raw stream url fallback", () => {
    const r = parseAppUrl("?u=" + encodeURIComponent("http://h/live.m3u8"));
    expect(r.streamUrl).toBe("http://h/live.m3u8");
    expect(r.channelId).toBeNull();
  });
});

describe("buildAppQuery", () => {
  it("is empty for default filters and no selection", () => {
    expect(buildAppQuery(DEFAULTS, null)).toBe("");
  });

  it("omits the default sort but keeps non-default ones", () => {
    expect(buildAppQuery({ ...DEFAULTS, sort: "name" }, null)).toBe("");
    expect(buildAppQuery({ ...DEFAULTS, sort: "status" }, null)).toBe("?sort=status");
  });

  it("serializes set filters", () => {
    const q = buildAppQuery({ ...DEFAULTS, q: "bbc", country: "gb", status: "fav" }, null);
    const parsed = parseAppUrl(q);
    expect(parsed.filters.q).toBe("bbc");
    expect(parsed.filters.country).toBe("gb");
    expect(parsed.filters.status).toBe("fav");
  });

  it("encodes the selected channel id, falling back to the raw url", () => {
    expect(buildAppQuery(DEFAULTS, rec({ ch: "CNN.us" }))).toBe("?ch=CNN.us");
    const u = buildAppQuery(DEFAULTS, rec({ ch: null, url: "http://h/x.m3u8" }));
    expect(parseAppUrl(u).streamUrl).toBe("http://h/x.m3u8");
  });

  it("round-trips filters plus selection", () => {
    const filters: Filters = { ...DEFAULTS, q: "sky news", cat: "news", sort: "quality" };
    const current = rec({ ch: "Sky.uk" });
    const parsed = parseAppUrl(buildAppQuery(filters, current));
    expect(parsed.filters).toEqual(filters);
    expect(parsed.channelId).toBe("Sky.uk");
  });
});

describe("shareUrl", () => {
  it("builds an absolute channel link", () => {
    expect(shareUrl("https://orbit-iptv.pages.dev", rec({ ch: "CNN.us" }))).toBe(
      "https://orbit-iptv.pages.dev/?ch=CNN.us",
    );
  });

  it("falls back to the raw stream url and ignores filters", () => {
    const url = shareUrl("https://x.dev", rec({ ch: null, url: "http://h/y.m3u8" }));
    expect(parseAppUrl(new URL(url).search).streamUrl).toBe("http://h/y.m3u8");
  });
});

describe("navAction", () => {
  it("replaces on the first write to establish the history baseline", () => {
    expect(navAction("?ch=A", "?ch=A", true)).toBe("replace");
    expect(navAction("", "", true)).toBe("replace");
  });

  it("pushes a new history entry when the url changes", () => {
    expect(navAction("?ch=B", "?ch=A", false)).toBe("push");
    expect(navAction("?ch=A", "", false)).toBe("push");
  });

  it("skips history when the url already matches (e.g. after popstate)", () => {
    expect(navAction("?ch=A", "?ch=A", false)).toBe("skip");
    expect(navAction("", "", false)).toBe("skip");
  });
});

describe("channelMeta", () => {
  it("builds a per-channel title, description and canonical", () => {
    const m = channelMeta(rec({ name: "CNN", ch: "CNN.us", country: "United States", catName: "News" }), "https://orbit-iptv.pages.dev");
    expect(m.title).toContain("CNN");
    expect(m.title).toContain("Orbit IPTV");
    expect(m.description).toContain("CNN");
    expect(m.description).toContain("United States");
    expect(m.canonical).toBe("https://orbit-iptv.pages.dev/?ch=CNN.us");
  });
});
