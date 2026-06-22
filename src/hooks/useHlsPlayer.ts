import { useCallback, useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";
import { classifyHlsError } from "../lib/status";
import { proxiedUrl, needsProxyFirst } from "../lib/proxy";
import type { Status, StreamRecord } from "../types/iptv";

export type PlayPhase = "idle" | "loading" | "playing" | "error";

export interface BannerState {
  cls: string; // geo | restrict | cors | fail | offline | info
  head: string;
  body: string;
  url?: string;
  deployHint?: boolean;
}

export interface LevelOption {
  value: number; // -1 = auto
  label: string;
}

interface PlayTarget {
  record: StreamRecord;
  viaProxy: boolean;
}

const HLS_CONFIG = {
  enableWorker: true,
  lowLatencyMode: true,
  manifestLoadingTimeOut: 12000,
  manifestLoadingMaxRetry: 1,
  levelLoadingTimeOut: 12000,
  fragLoadingTimeOut: 20000,
  fragLoadingMaxRetry: 2,
};

// hls.js (~150kB gzip) is only needed once a channel plays, so it's loaded
// on demand the first time — keeping the initial page-load bundle small.
let hlsModule: Promise<typeof import("hls.js")> | null = null;
const loadHls = () => (hlsModule ??= import("hls.js"));

function buildLevels(levels: HlsType["levels"]): LevelOption[] {
  if (!levels || levels.length < 2) return [];
  return [
    { value: -1, label: "Auto" },
    ...levels.map((l, i) => ({
      value: i,
      label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`,
    })),
  ];
}

interface Params {
  videoRef: React.RefObject<HTMLVideoElement>;
  current: StreamRecord | null;
  proxyOk: boolean;
  onStatus: (record: StreamRecord, status: Status) => void;
}

export function useHlsPlayer({ videoRef, current, proxyOk, onStatus }: Params) {
  const [phase, setPhase] = useState<PlayPhase>("idle");
  const [loadingText, setLoadingText] = useState("");
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [level, setLevelState] = useState(-1);
  const [target, setTarget] = useState<PlayTarget | null>(null);

  const hlsRef = useRef<HlsType | null>(null);
  const onStatusRef = useRef(onStatus);
  const proxyOkRef = useRef(proxyOk);
  useEffect(() => {
    onStatusRef.current = onStatus;
  });
  useEffect(() => {
    proxyOkRef.current = proxyOk;
  }, [proxyOk]);

  // Selection change → set the initial play target + any pre-play banner.
  useEffect(() => {
    if (!current) {
      setTarget(null);
      setBanner(null);
      setPhase("idle");
      return;
    }
    setTarget({ record: current, viaProxy: needsProxyFirst(current, proxyOkRef.current) });

    if (!proxyOkRef.current && current.restricted) {
      setBanner({
        cls: "restrict",
        head: "Header-restricted stream.",
        body: "This source needs a custom Referer/User-Agent header that browsers won't allow on media requests. Try VLC/mpv, or deploy with the bundled proxy.",
      });
    } else if (!proxyOkRef.current && current.geo) {
      setBanner({
        cls: "geo",
        head: "Geo-blocked.",
        body: `iptv-org marks this stream as restricted by region${current.label ? ` (“${current.label}”)` : ""}. It will likely fail unless you're in the broadcast country or using a VPN/proxy.`,
      });
    } else {
      setBanner(null);
    }
  }, [current]);

  // Playback effect — one run per (re)load. `target` identity changes exactly
  // when we want to load: a new selection or a proxy retry.
  useEffect(() => {
    if (!target) return;
    const v = videoRef.current;
    if (!v) return;

    const { record, viaProxy } = target;
    const src = viaProxy
      ? proxiedUrl(record.url, record.referrer, record.userAgent)
      : record.url;
    const okStatus: Status = viaProxy ? "proxied" : "ok";

    setPhase("loading");
    setLoadingText(viaProxy ? "Connecting via proxy…" : "Connecting…");
    setLevels([]);
    setLevelState(-1);

    let settled = false;
    let cancelled = false;
    let onLoaded: (() => void) | null = null;
    let onNativeError: (() => void) | null = null;

    const settle = (ok: boolean, status: Status | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      if (status) onStatusRef.current(record, status);
      setPhase(ok ? "playing" : "error");
      if (ok && (status === "ok" || status === "proxied")) setBanner(null);
    };
    const retryViaProxy = () => {
      setBanner({ cls: "info", head: "Direct play blocked.", body: "Retrying through the proxy…" });
      setTarget({ record, viaProxy: true });
    };
    const fromVerdict = (status: Status, head: string, body: string) =>
      setBanner({
        cls:
          status === "geo"
            ? "geo"
            : status === "restricted"
              ? "restrict"
              : status === "offline"
                ? "offline"
                : status === "cors"
                  ? "cors"
                  : "fail",
        head,
        body,
        url: record.url,
        deployHint: !proxyOkRef.current && (status === "cors" || status === "restricted"),
      });

    const watchdog = setTimeout(() => {
      if (settled) return;
      if (!viaProxy && proxyOkRef.current) {
        retryViaProxy();
        return;
      }
      settle(false, "offline");
      setBanner({
        cls: "offline",
        head: "Timed out.",
        body: "No response from this source — it's probably offline or blocked from your network.",
      });
    }, 15000);

    // Tear down any previous instance before re-attaching.
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        /* ignore */
      }
      hlsRef.current = null;
    }
    v.removeAttribute("src");
    try {
      v.load();
    } catch {
      /* ignore */
    }

    (async () => {
      const canNative = v.canPlayType("application/vnd.apple.mpegurl");
      let Hls: typeof HlsType | null = null;
      try {
        Hls = (await loadHls()).default;
      } catch {
        Hls = null;
      }
      if (cancelled) return;

      if (Hls && Hls.isSupported()) {
        const hls = new Hls(HLS_CONFIG);
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLevels(buildLevels(hls.levels));
          v.play().catch(() => {});
          settle(true, okStatus);
        });
        hls.on(Hls.Events.LEVEL_LOADED, () => {
          if (!settled) settle(true, okStatus);
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          const verdict = classifyHlsError(
            {
              fatal: data.fatal,
              type:
                data.type === "networkError"
                  ? "networkError"
                  : data.type === "mediaError"
                    ? "mediaError"
                    : "otherError",
              details: data.details,
              code: data.response && "code" in data.response ? data.response.code : undefined,
            },
            record.restricted,
            viaProxy,
          );
          if (!verdict) return; // non-fatal
          if (verdict.recoverMedia) {
            try {
              hls.recoverMediaError();
            } catch {
              /* ignore */
            }
            return;
          }
          try {
            hls.destroy();
          } catch {
            /* ignore */
          }
          if (verdict.retriable && proxyOkRef.current) {
            retryViaProxy();
            return;
          }
          settle(false, verdict.status);
          fromVerdict(verdict.status, verdict.head, verdict.reason);
        });
      } else if (canNative) {
        v.src = src;
        onLoaded = () => {
          v.play().catch(() => {});
          settle(true, okStatus);
        };
        onNativeError = () => {
          if (!viaProxy && proxyOkRef.current) {
            retryViaProxy();
            return;
          }
          settle(false, "fail");
          fromVerdict(
            "fail",
            "Couldn't play.",
            "The browser failed to load this stream — usually CORS, geo, or a dead source.",
          );
        };
        v.addEventListener("loadedmetadata", onLoaded, { once: true });
        v.addEventListener("error", onNativeError, { once: true });
      } else {
        settle(false, "fail");
        setBanner({
          cls: "fail",
          head: "Your browser can't play HLS.",
          body: "Try Chrome, Edge, Firefox, or Safari.",
        });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsRef.current = null;
      }
      if (onLoaded) v.removeEventListener("loadedmetadata", onLoaded);
      if (onNativeError) v.removeEventListener("error", onNativeError);
    };
  }, [target, videoRef]);

  const setLevel = useCallback((lvl: number) => {
    setLevelState(lvl);
    if (hlsRef.current) hlsRef.current.currentLevel = lvl;
  }, []);

  return { phase, loadingText, banner, levels, level, setLevel };
}
