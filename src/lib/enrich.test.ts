import { describe, it, expect } from "vitest";
import { buildLogoMap, buildLangMaps } from "./enrich";
import type { StreamRecord, Logo, Feed, Language } from "../types/iptv";

const logo = (p: Partial<Logo>): Logo => ({
  channel: "cnn.us",
  feed: null,
  in_use: false,
  url: "http://logo/x.png",
  ...p,
});

describe("buildLogoMap", () => {
  it("prefers an in_use logo over a non-in_use one for the same channel", () => {
    const m = buildLogoMap([
      logo({ channel: "cnn.us", url: "a.png", in_use: false }),
      logo({ channel: "cnn.us", url: "b.png", in_use: true }),
    ]);
    expect(m.get("cnn.us")).toBe("b.png");
  });

  it("ignores entries without a url or channel", () => {
    const m = buildLogoMap([
      logo({ channel: "cnn.us", url: "" }),
      logo({ channel: null as unknown as string, url: "c.png" }),
    ]);
    expect(m.size).toBe(0);
  });
});

const rec = (i: number, ch: string | null, feed: string | null): StreamRecord =>
  ({ i, ch, feed }) as StreamRecord;

const feeds: Feed[] = [
  { channel: "cnn.us", id: "HD", name: "HD", is_main: true, languages: ["eng"] },
  { channel: "tf1.fr", id: "Paris", name: "Paris", is_main: false, languages: ["fra"] },
  { channel: "tf1.fr", id: "Main", name: "Main", is_main: true, languages: ["fra", "eng"] },
];
const languages: Language[] = [
  { code: "eng", name: "English" },
  { code: "fra", name: "French" },
];

describe("buildLangMaps", () => {
  it("resolves language by channel@feed, falling back to the main feed", () => {
    const records = [
      rec(0, "cnn.us", "HD"), // exact feed
      rec(1, "tf1.fr", "Paris"), // exact feed
      rec(2, "tf1.fr", "Ghost"), // unknown feed → main feed
      rec(3, "unknown.zz", null), // no data
    ];
    const { langById } = buildLangMaps(records, feeds, languages);
    expect(langById.get(0)).toEqual({ code: "eng", name: "English" });
    expect(langById.get(1)).toEqual({ code: "fra", name: "French" });
    expect(langById.get(2)).toEqual({ code: "fra", name: "French" });
    expect(langById.has(3)).toBe(false);
  });

  it("counts the primary language per record", () => {
    const records = [rec(0, "cnn.us", "HD"), rec(1, "tf1.fr", "Main")];
    const { langCounts } = buildLangMaps(records, feeds, languages);
    expect(langCounts.get("eng")).toBe(1);
    expect(langCounts.get("fra")).toBe(1);
  });
});
