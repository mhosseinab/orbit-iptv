import type {
  Stream,
  Channel,
  Category,
  Country,
  StreamRecord,
  BuildResult,
} from "../types/iptv";

export const QUALITY_ORDER = [
  "1080p",
  "1080i",
  "720p",
  "720i",
  "576p",
  "576i",
  "480p",
  "360p",
  "240p",
];

// Join streams ⋈ channels into immutable records, deriving display fields and
// the geo/restricted flags. NSFW and xxx-category channels are excluded.
// Logos and languages are NOT joined here — they enrich separately at read time.
export function buildRecords(
  streams: Stream[],
  channels: Channel[],
  categories: Category[],
  countries: Country[],
): BuildResult {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const countryMap = new Map(countries.map((c) => [c.code, c]));
  const chMap = new Map(channels.map((c) => [c.id, c]));

  const records: StreamRecord[] = [];
  const catCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const qualSet = new Set<string>();

  for (const s of streams) {
    if (!s || !s.url) continue;
    const ch = s.channel ? chMap.get(s.channel) : null;
    const cats = ch && ch.categories && ch.categories.length ? ch.categories : [];
    if ((ch && ch.is_nsfw) || cats.includes("xxx")) continue;

    const name = (ch && ch.name) || s.title || s.channel || "Unknown channel";
    const cc = ch ? ch.country : null;
    const co = cc ? countryMap.get(cc) : null;
    const country = co ? co.name : cc || "";
    const catName = cats.map((c) => catMap.get(c) || c).join(", ");
    const label = s.label || null;

    records.push({
      i: records.length,
      url: s.url,
      ch: s.channel || null,
      feed: s.feed || null,
      name,
      nameL: name.toLowerCase(),
      title: s.title || name,
      quality: s.quality || null,
      cc,
      country,
      flag: co ? co.flag : "",
      countryL: country.toLowerCase(),
      cats,
      catName,
      catNameL: catName.toLowerCase(),
      label,
      geo: !!label && /geo|block/i.test(label),
      restricted: !!(s.referrer || s.user_agent),
      referrer: s.referrer || null,
      userAgent: s.user_agent || null,
    });
  }

  for (const r of records) {
    if (r.cats.length) {
      for (const c of r.cats) catCounts.set(c, (catCounts.get(c) || 0) + 1);
    } else {
      catCounts.set("__none", (catCounts.get("__none") || 0) + 1);
    }
    if (r.cc) countryCounts.set(r.cc, (countryCounts.get(r.cc) || 0) + 1);
    if (r.quality) qualSet.add(r.quality);
  }

  const qualities = [...qualSet].sort((a, b) => {
    const ia = QUALITY_ORDER.indexOf(a);
    const ib = QUALITY_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  return { records, catCounts, countryCounts, qualities };
}
