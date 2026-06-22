import type { StreamRecord, Logo, Feed, Language, Lang } from "../types/iptv";

// Pick one logo per channel, preferring in_use. Returns channelId → url.
export function buildLogoMap(logos: Logo[]): Map<string, string> {
  const byCh = new Map<string, Logo>();
  for (const l of logos) {
    if (!l || !l.url || !l.channel) continue;
    const cur = byCh.get(l.channel);
    if (!cur || (l.in_use && !cur.in_use)) byCh.set(l.channel, l);
  }
  const out = new Map<string, string>();
  for (const [k, v] of byCh) out.set(k, v.url);
  return out;
}

// Resolve each record's primary language via its feed (channel@feed), falling
// back to the channel's main feed. Keyed by record index so records stay
// immutable. Also returns per-language counts for the dropdown.
export function buildLangMaps(
  records: StreamRecord[],
  feeds: Feed[],
  languages: Language[],
): { langById: Map<number, Lang>; langCounts: Map<string, number> } {
  const langName = new Map(languages.map((l) => [l.code, l.name]));
  const feedKey = new Map<string, string[]>();
  const mainByCh = new Map<string, string[]>();
  for (const f of feeds) {
    const langs = f.languages || [];
    if (!langs.length) continue;
    feedKey.set(f.channel + "@" + f.id, langs);
    if (f.is_main) mainByCh.set(f.channel, langs);
  }

  const langById = new Map<number, Lang>();
  const langCounts = new Map<string, number>();
  for (const r of records) {
    let langs: string[] | undefined;
    if (r.ch && r.feed) langs = feedKey.get(r.ch + "@" + r.feed);
    if (!langs && r.ch) langs = mainByCh.get(r.ch);
    if (langs && langs.length) {
      const code = langs[0];
      langById.set(r.i, { code, name: langName.get(code) || code });
      langCounts.set(code, (langCounts.get(code) || 0) + 1);
    }
  }
  return { langById, langCounts };
}
