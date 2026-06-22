import { describe, it, expect } from "vitest";
import { buildRecords } from "./records";
import type { Stream, Channel, Category, Country } from "../types/iptv";

const cats: Category[] = [
  { id: "news", name: "News" },
  { id: "movies", name: "Movies" },
  { id: "xxx", name: "Adult" },
];
const countries: Country[] = [
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "France", code: "FR", flag: "🇫🇷" },
];
const channels: Channel[] = [
  { id: "cnn.us", name: "CNN", country: "US", categories: ["news"] },
  { id: "adult.us", name: "Adult Ch", country: "US", categories: ["movies"], is_nsfw: true },
  { id: "porn.us", name: "Porn Ch", country: "US", categories: ["xxx"] },
  { id: "tf1.fr", name: "TF1", country: "FR", categories: ["news", "movies"] },
];

function build(streams: Stream[]) {
  return buildRecords(streams, channels, cats, countries);
}

const s = (p: Partial<Stream>): Stream => ({
  channel: null,
  feed: null,
  title: null,
  url: "http://x/a.m3u8",
  quality: null,
  label: null,
  user_agent: null,
  referrer: null,
  ...p,
});

describe("buildRecords", () => {
  it("joins streams to channels for name, country, flag, categories", () => {
    const { records } = build([s({ channel: "cnn.us", url: "http://x/cnn.m3u8", quality: "720p" })]);
    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.name).toBe("CNN");
    expect(r.cc).toBe("US");
    expect(r.country).toBe("United States");
    expect(r.flag).toBe("🇺🇸");
    expect(r.cats).toEqual(["news"]);
    expect(r.catName).toBe("News");
    expect(r.quality).toBe("720p");
  });

  it("skips streams without a url", () => {
    const { records } = build([s({ channel: "cnn.us", url: "" })]);
    expect(records).toHaveLength(0);
  });

  it("excludes NSFW channels and xxx-category channels entirely", () => {
    const { records } = build([
      s({ channel: "cnn.us", url: "http://x/1" }),
      s({ channel: "adult.us", url: "http://x/2" }),
      s({ channel: "porn.us", url: "http://x/3" }),
    ]);
    expect(records.map((r) => r.name)).toEqual(["CNN"]);
  });

  it("derives geo from a geo/block label, case-insensitive", () => {
    const { records } = build([
      s({ channel: "cnn.us", url: "http://x/1", label: "Geo-blocked" }),
      s({ channel: "tf1.fr", url: "http://x/2", label: "Not 24/7" }),
      s({ channel: "cnn.us", url: "http://x/3", label: "BLOCK" }),
    ]);
    expect(records.map((r) => r.geo)).toEqual([true, false, true]);
  });

  it("derives restricted when a referrer or user_agent is present", () => {
    const { records } = build([
      s({ channel: "cnn.us", url: "http://x/1", referrer: "http://ref" }),
      s({ channel: "cnn.us", url: "http://x/2", user_agent: "UA" }),
      s({ channel: "cnn.us", url: "http://x/3" }),
    ]);
    expect(records.map((r) => r.restricted)).toEqual([true, true, false]);
    expect(records[0].referrer).toBe("http://ref");
    expect(records[1].userAgent).toBe("UA");
  });

  it("falls back to title, then channel id, then 'Unknown channel' for the name", () => {
    const { records } = build([
      s({ title: "Free Title", url: "http://x/1" }),
      s({ channel: "ghost.zz", url: "http://x/2" }),
      s({ url: "http://x/3" }),
    ]);
    expect(records.map((r) => r.name)).toEqual(["Free Title", "ghost.zz", "Unknown channel"]);
  });

  it("counts categories, countries, and collects qualities", () => {
    const { catCounts, countryCounts, qualities } = build([
      s({ channel: "cnn.us", url: "http://x/1", quality: "720p" }),
      s({ channel: "tf1.fr", url: "http://x/2", quality: "1080p" }),
      s({ channel: "tf1.fr", url: "http://x/3", quality: "720p" }),
    ]);
    // cnn.us(news) + tf1.fr(news,movies)×2 → news 3, movies 2
    expect(catCounts.get("news")).toBe(3);
    expect(catCounts.get("movies")).toBe(2);
    expect(countryCounts.get("US")).toBe(1);
    expect(countryCounts.get("FR")).toBe(2);
    expect(qualities).toContain("720p");
    expect(qualities).toContain("1080p");
  });

  it("assigns sequential indices matching array position", () => {
    const { records } = build([
      s({ channel: "cnn.us", url: "http://x/1" }),
      s({ channel: "tf1.fr", url: "http://x/2" }),
    ]);
    expect(records.map((r) => r.i)).toEqual([0, 1]);
  });
});
