import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Topbar } from "./components/topbar/Topbar";
import { FilterPanel } from "./components/sidebar/FilterPanel";
import { ChannelList, type ChannelListHandle } from "./components/sidebar/ChannelList";
import { PlayerStage } from "./components/player/PlayerStage";
import { AboutModal } from "./components/common/AboutModal";
import { Drawer } from "./components/common/Drawer";
import { Toast } from "./components/common/Toast";
import type { SelectOption } from "./components/sidebar/Filters";
import { useIptvData } from "./hooks/useIptvData";
import { useProxy } from "./hooks/useProxy";
import { useFavorites, useRecent, useStatusCache } from "./hooks/usePersistence";
import { useToast } from "./hooks/useToast";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useHlsPlayer } from "./hooks/useHlsPlayer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { filterAndSort } from "./lib/filter";
import type { Filters, Status, StreamRecord } from "./types/iptv";
import styles from "./App.module.css";

const INITIAL_FILTERS: Filters = {
  q: "",
  cat: "",
  country: "",
  lang: "",
  qual: "",
  status: "",
  sort: "name",
};

export default function App() {
  const data = useIptvData();
  const proxyOk = useProxy();
  const { favorites, toggleFav } = useFavorites();
  const { recent, pushRecent } = useRecent();
  const { statusByUrl, setStatus } = useStatusCache();
  const { toast, showToast } = useToast();
  const isMobile = useMediaQuery("(max-width: 980px)");

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [current, setCurrent] = useState<StreamRecord | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<ChannelListHandle>(null);

  // Debounce search input into the filter object.
  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => (f.q === searchText ? f : { ...f, q: searchText })),
      130,
    );
    return () => clearTimeout(t);
  }, [searchText]);

  const handleStatus = useCallback(
    (record: StreamRecord, status: Status) => setStatus(record.url, status),
    [setStatus],
  );

  const player = useHlsPlayer({ videoRef, current, proxyOk, onStatus: handleStatus });

  const filtered = useMemo(
    () =>
      filterAndSort(data.records, filters, {
        langById: data.langById,
        statusByUrl,
        favorites,
        recent,
      }),
    [data.records, data.langById, filters, statusByUrl, favorites, recent],
  );

  // ---- derived option lists for the filter dropdowns ----
  const catNameById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c.name])),
    [data.categories],
  );
  const countryByCode = useMemo(
    () => new Map(data.countries.map((c) => [c.code, c])),
    [data.countries],
  );
  const langNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of data.langById.values()) m.set(l.code, l.name);
    return m;
  }, [data.langById]);

  const catOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [{ value: "", label: "All categories" }];
    for (const [id, n] of [...data.catCounts.entries()]
      .filter(([k]) => k !== "__none")
      .sort((a, b) => b[1] - a[1])) {
      opts.push({ value: id, label: `${catNameById.get(id) || id} (${n.toLocaleString()})` });
    }
    const none = data.catCounts.get("__none");
    if (none) opts.push({ value: "__none", label: `Uncategorized (${none.toLocaleString()})` });
    return opts;
  }, [data.catCounts, catNameById]);

  const countryOptions = useMemo<SelectOption[]>(() => {
    const list = [...data.countryCounts.entries()]
      .map(([code, n]) => {
        const c = countryByCode.get(code);
        return { code, name: c ? c.name : code, flag: c ? c.flag : "", n };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const opts: SelectOption[] = [{ value: "", label: "All countries" }];
    for (const c of list)
      opts.push({
        value: c.code,
        label: `${c.flag ? c.flag + " " : ""}${c.name} (${c.n.toLocaleString()})`,
      });
    return opts;
  }, [data.countryCounts, countryByCode]);

  const langOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [{ value: "", label: "All languages" }];
    for (const [code, n] of [...data.langCounts.entries()].sort((a, b) => b[1] - a[1]))
      opts.push({ value: code, label: `${langNameByCode.get(code) || code} (${n.toLocaleString()})` });
    return opts;
  }, [data.langCounts, langNameByCode]);

  const qualOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Any quality" },
      ...data.qualities.map((q) => ({ value: q, label: q })),
    ],
    [data.qualities],
  );

  // ---- actions ----
  const onSelect = useCallback(
    (r: StreamRecord) => {
      setCurrent(r);
      pushRecent(r.url);
      if (isMobile)
        requestAnimationFrame(() =>
          shellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
    },
    [isMobile, pushRecent],
  );

  const onCopy = useCallback(
    (url: string) => {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast("Stream URL copied"))
        .catch(() => showToast("Copy failed"));
    },
    [showToast],
  );

  const onRefresh = useCallback(() => {
    data.reload();
    showToast("Refreshing playlist…");
  }, [data, showToast]);

  // ---- keyboard shortcuts ----
  const onNav = useCallback(
    (dir: 1 | -1) => {
      if (!current) return;
      const idx = filtered.findIndex((r) => r.url === current.url);
      if (idx < 0) return;
      const next = filtered[idx + dir];
      if (next) {
        setCurrent(next);
        pushRecent(next.url);
        listRef.current?.scrollToIndex(idx + dir);
      }
    },
    [current, filtered, pushRecent],
  );

  const shortcuts = useMemo(
    () => ({
      onSearch: () => {
        searchRef.current?.focus();
        searchRef.current?.select();
      },
      onTogglePlay: () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play().catch(() => {});
        else v.pause();
      },
      onFullscreen: () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else shellRef.current?.requestFullscreen?.();
      },
      onMute: () => {
        const v = videoRef.current;
        if (v) v.muted = !v.muted;
      },
      onEscape: () => {
        setAboutOpen(false);
        setDrawerOpen(false);
      },
      onNav,
    }),
    [onNav],
  );
  useKeyboardShortcuts(shortcuts);

  // ---- derived display values ----
  const stats = useMemo(() => {
    let geo = 0;
    let res = 0;
    for (const r of data.records) {
      if (r.geo) geo++;
      if (r.restricted) res++;
    }
    return { geo, res };
  }, [data.records]);

  const hasData = data.records.length > 0;
  const subtitle =
    data.phase === "error" && !hasData
      ? "Load failed"
      : !hasData
        ? "Loading channels…"
        : `${data.records.length.toLocaleString()} streams · ${stats.geo.toLocaleString()} geo · ${stats.res.toLocaleString()} restricted`;

  const currentLogo = current?.ch ? data.logosByCh.get(current.ch) : undefined;
  const currentLang = current ? data.langById.get(current.i)?.name : undefined;
  const currentFav = current ? favorites.has(current.url) : false;

  const filterPanel = (
    <FilterPanel
      filters={filters}
      onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
      resultCount={filtered.length}
      catOptions={catOptions}
      countryOptions={countryOptions}
      langOptions={langOptions}
      qualOptions={qualOptions}
    />
  );

  const channelList = (
    <ChannelList
      ref={listRef}
      records={filtered}
      currentUrl={current?.url ?? null}
      favorites={favorites}
      statusByUrl={statusByUrl}
      logosByCh={data.logosByCh}
      onSelect={onSelect}
      onToggleFav={toggleFav}
    />
  );

  const playerStage = (
    <PlayerStage
      videoRef={videoRef}
      shellRef={shellRef}
      current={current}
      phase={player.phase}
      loadingText={player.loadingText}
      banner={player.banner}
      levels={player.levels}
      level={player.level}
      onSetLevel={player.setLevel}
      logo={currentLogo}
      langName={currentLang}
      fav={currentFav}
      onToggleFav={toggleFav}
      onCopy={onCopy}
      onToast={showToast}
      onAbout={() => setAboutOpen(true)}
    />
  );

  return (
    <div className={styles.app}>
      <Topbar
        subtitle={subtitle}
        search={searchText}
        onSearch={setSearchText}
        searchRef={searchRef}
        proxyOk={proxyOk}
        onRefresh={onRefresh}
        refreshing={data.phase === "loading" && hasData}
        onAbout={() => setAboutOpen(true)}
        isMobile={isMobile}
        onOpenFilters={() => setDrawerOpen(true)}
      />

      {data.phase === "error" && !hasData ? (
        <div className={styles.center}>
          <h2>Couldn't load the playlist</h2>
          <p>
            {data.error}. This is almost always a network/CORS issue reaching iptv-org. Try again in
            a moment.
          </p>
          <button className={styles.retry} onClick={onRefresh}>
            Retry
          </button>
        </div>
      ) : !hasData ? (
        <div className={styles.center}>
          <span className={styles.spinner} />
          <h2>Loading channels…</h2>
          <p>Fetching the iptv-org catalogue. This is cached for next time.</p>
        </div>
      ) : isMobile ? (
        <div className={styles.bodyMobile}>
          <div className={styles.playerMobile}>{playerStage}</div>
          {channelList}
          <Drawer open={drawerOpen} title="Filters" onClose={() => setDrawerOpen(false)}>
            {filterPanel}
          </Drawer>
        </div>
      ) : (
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            {filterPanel}
            {channelList}
          </aside>
          <div className={styles.main}>{playerStage}</div>
        </div>
      )}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <Toast message={toast} />
    </div>
  );
}
