import { useCallback, useEffect, useState } from "react";
import { fetchJSON } from "../lib/api";
import { idbClear } from "../lib/idb";
import { buildRecords } from "../lib/records";
import { buildLogoMap, buildLangMaps } from "../lib/enrich";
import type {
  Stream,
  Channel,
  Category,
  Country,
  Feed,
  Language,
  Logo,
  StreamRecord,
  Lang,
} from "../types/iptv";

export type DataPhase = "loading" | "ready" | "error";

export interface IptvData {
  phase: DataPhase;
  error: string | null;
  records: StreamRecord[];
  catCounts: Map<string, number>;
  countryCounts: Map<string, number>;
  categories: Category[];
  countries: Country[];
  qualities: string[];
  logosByCh: Map<string, string>;
  langById: Map<number, Lang>;
  langCounts: Map<string, number>;
  reload: () => void;
}

const EMPTY = {
  records: [] as StreamRecord[],
  catCounts: new Map<string, number>(),
  countryCounts: new Map<string, number>(),
  qualities: [] as string[],
};

export function useIptvData(): IptvData {
  const [phase, setPhase] = useState<DataPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [core, setCore] = useState(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [logosByCh, setLogosByCh] = useState<Map<string, string>>(new Map());
  const [langById, setLangById] = useState<Map<number, Lang>>(new Map());
  const [langCounts, setLangCounts] = useState<Map<string, number>>(new Map());
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    idbClear().then(() => setNonce((n) => n + 1));
  }, []);

  useEffect(() => {
    let alive = true;
    setPhase("loading");
    setError(null);

    (async () => {
      let records: StreamRecord[] = [];
      try {
        const [streams, channels, cats, ctries] = await Promise.all([
          fetchJSON<Stream[]>("streams.json"),
          fetchJSON<Channel[]>("channels.json"),
          fetchJSON<Category[]>("categories.json"),
          fetchJSON<Country[]>("countries.json"),
        ]);
        if (!alive) return;
        const built = buildRecords(streams, channels, cats, ctries);
        records = built.records;
        setCore(built);
        setCategories(cats);
        setCountries(ctries);
        setPhase("ready");
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
        return;
      }

      // Background enrichment — non-blocking, best-effort.
      fetchJSON<Logo[]>("logos.json")
        .then((logos) => {
          if (alive) setLogosByCh(buildLogoMap(logos));
        })
        .catch(() => {});

      Promise.all([
        fetchJSON<Feed[]>("feeds.json"),
        fetchJSON<Language[]>("languages.json"),
      ])
        .then(([feeds, languages]) => {
          if (!alive) return;
          const { langById: lb, langCounts: lc } = buildLangMaps(records, feeds, languages);
          setLangById(lb);
          setLangCounts(lc);
        })
        .catch(() => {});
    })();

    return () => {
      alive = false;
    };
  }, [nonce]);

  return {
    phase,
    error,
    ...core,
    categories,
    countries,
    logosByCh,
    langById,
    langCounts,
    reload,
  };
}
