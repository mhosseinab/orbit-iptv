import type { Status } from "../types/iptv";

// Normalised view of an hls.js error event — the hook translates the raw
// Hls.Events.ERROR payload into this so classification stays pure & testable.
export interface HlsErrorInfo {
  fatal: boolean;
  type: "networkError" | "mediaError" | "otherError";
  details: string;
  code?: number; // upstream HTTP status, when present
}

export interface HlsRecover {
  recoverMedia: true;
}

export interface HlsVerdict {
  recoverMedia: false;
  status: Status;
  bannerClass: string; // geo | restrict | cors | fail | offline
  head: string;
  reason: string;
  retriable: boolean; // structurally eligible to retry through the proxy
}

const TIMEOUT_DETAILS = new Set(["manifestLoadTimeOut", "levelLoadTimeOut"]);

const HEADS: Record<string, string> = {
  geo: "Geo-blocked.",
  cors: "Blocked by CORS.",
  offline: "Source offline.",
  restricted: "Header-restricted.",
};

// Pure classification of a fatal HLS error into a status + banner copy, plus
// whether it's worth retrying via the proxy. Returns null for non-fatal errors
// and { recoverMedia: true } for recoverable media errors.
export function classifyHlsError(
  e: HlsErrorInfo,
  restricted: boolean,
  viaProxy: boolean,
): HlsRecover | HlsVerdict | null {
  if (!e.fatal) return null;
  if (e.type === "mediaError") return { recoverMedia: true };

  let status: Status = "fail";
  let bannerClass = "fail";
  let reason = "Playback failed: " + e.details;

  if (e.type === "networkError") {
    const code = e.code;
    if (code === 403 || code === 451) {
      status = "geo";
      bannerClass = "geo";
      reason = `Server refused (HTTP ${code}) — geo-blocked or access-restricted from your IP.`;
    } else if (code === 404 || code === 410 || code === 500 || code === 503) {
      status = "offline";
      bannerClass = "offline";
      reason = `Source error (HTTP ${code}) — the stream is offline or dead.`;
    } else if (TIMEOUT_DETAILS.has(e.details)) {
      status = "offline";
      bannerClass = "offline";
      reason = "Timed out — source unreachable or too slow.";
    } else if (!code) {
      status = "cors";
      bannerClass = "cors";
      reason =
        "Blocked by CORS / network — this stream sends no cross-origin headers, so the browser can't load it directly.";
    } else {
      status = "fail";
      bannerClass = "fail";
      reason = `Network error (HTTP ${code}).`;
    }
  }

  if (restricted && (status === "cors" || status === "fail")) {
    status = "restricted";
    bannerClass = "restrict";
    reason =
      "Needs custom Referer/User-Agent headers browsers can't set for media.";
  }

  const code = e.code;
  const retriable = !viaProxy && code !== 404 && code !== 410;
  const head = HEADS[status] ?? "Couldn't play.";

  return {
    recoverMedia: false,
    status,
    bannerClass,
    head,
    reason: viaProxy ? "Even via the proxy: " + reason : reason,
    retriable,
  };
}

export interface StatusBadge {
  label: string;
  cls: string;
  dot: string;
}

// Badge + dot colour for a record given its runtime status. Record flags
// (restricted/geo/label) win over a missing runtime status, matching the
// original's precedence.
export function statusMeta(
  r: { restricted: boolean; geo: boolean; label: string | null },
  status: Status | null,
): StatusBadge {
  if (status === "proxied") return { label: "Proxied", cls: "proxied", dot: "var(--accent)" };
  if (status === "ok") return { label: "OK", cls: "ok", dot: "var(--ok)" };
  if (r.restricted) return { label: "Restricted", cls: "restrict", dot: "var(--restrict)" };
  if (r.geo) return { label: "Geo", cls: "geo", dot: "var(--geo)" };
  switch (status) {
    case "cors":
      return { label: "CORS", cls: "cors", dot: "var(--bad)" };
    case "fail":
      return { label: "Fail", cls: "fail", dot: "var(--bad)" };
    case "offline":
      return { label: "Offline", cls: "offline", dot: "var(--offline)" };
  }
  if (r.label) return { label: "Note", cls: "info", dot: "var(--info)" };
  return { label: "", cls: "", dot: "var(--line-2)" };
}
