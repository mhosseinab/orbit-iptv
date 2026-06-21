// functions/proxy.js — Cloudflare Pages Function
// ---------------------------------------------------------------------------
// Same-origin CORS + header-injection proxy for HLS streams that won't play
// directly in the browser (CORS-blocked, geo-via-IP, header-restricted, or
// http:// on an https:// page = mixed content).
//
// The player calls this ONLY as a fallback, so cost tracks real failures.
//
//   Route:  /proxy?url=<streamUrl>&ref=<referer>&ua=<userAgent>
//   Health: /proxy?ping=1   ->  "orbit-proxy-ok"
//
// Safeguards: SSRF block-list (private/loopback/link-local/metadata),
// http/https only, and an anti-hotlink check (blocks Sec-Fetch-Site: cross-site
// unless env PROXY_ALLOW_CROSS_SITE="1").
// ---------------------------------------------------------------------------

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Response headers we must not copy verbatim when streaming the upstream body.
const HOP = new Set([
  "content-encoding", "content-length", "transfer-encoding",
  "connection", "keep-alive", "access-control-allow-origin"
]);

function cors(h = new Headers()) {
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Range,Content-Type");
  h.set("Access-Control-Expose-Headers", "Content-Length,Content-Range,Accept-Ranges");
  return h;
}

// Block SSRF to private / loopback / link-local / cloud-metadata hosts.
function isBlockedHost(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "metadata.google.internal") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;          // link-local + 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true;          // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true;// CGNAT 100.64/10
    if (a >= 224) return true;                         // multicast / reserved
  }
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true; // v6 link-local / ULA
  return false;
}

function validTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (isBlockedHost(u.hostname)) return null;
  return u;
}

// Rewrite an HLS manifest so every child URI (variant playlists, segments,
// keys, maps, alt-renditions) is routed back through this proxy, carrying the
// ref/ua forward. Relative URIs are resolved against the manifest's own URL.
// Exported for unit testing.
export function rewriteManifest(body, baseUrl, ref, ua) {
  const wrap = (abs) => {
    let q = "/proxy?url=" + encodeURIComponent(abs);
    if (ref) q += "&ref=" + encodeURIComponent(ref);
    if (ua) q += "&ua=" + encodeURIComponent(ua);
    return q;
  };
  const resolve = (uri) => { try { return new URL(uri, baseUrl).href; } catch { return uri; } };
  const out = [];
  for (let line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (t === "") { out.push(line); continue; }
    if (t.startsWith("#")) {
      if (t.indexOf('URI="') !== -1) {
        line = line.replace(/URI="([^"]*)"/g, (_, u) => `URI="${wrap(resolve(u))}"`);
      }
      out.push(line);
    } else {
      out.push(wrap(resolve(t)));   // segment or variant-playlist URI
    }
  }
  return out.join("\n");
}

function looksLikeManifest(targetUrl, contentType, body) {
  if (/\.m3u8(\?|$)/i.test(targetUrl)) return true;
  if (contentType && /mpegurl/i.test(contentType)) return true;
  if (body && body.slice(0, 7) === "#EXTM3U") return true;
  return false;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Master on/off switch (wrangler.toml [vars] or Pages dashboard env).
  // "1"/unset = enabled, "0"/"false" = disabled (player auto-detects and runs direct-only).
  const enabled = !(env && (env.PROXY_ENABLED === "0" || env.PROXY_ENABLED === "false"));
  if (!enabled) {
    return new Response("Proxy disabled by configuration (PROXY_ENABLED=0).", { status: 404, headers: cors() });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }
  if (url.searchParams.get("ping") === "1") {
    return new Response("orbit-proxy-ok", {
      headers: cors(new Headers({ "Content-Type": "text/plain", "Cache-Control": "no-store" }))
    });
  }

  // Anti-hotlink: block other websites from abusing the proxy. Same-origin
  // sub-resource fetches send Sec-Fetch-Site: same-origin/same-site/none.
  const allowCross = env && env.PROXY_ALLOW_CROSS_SITE === "1";
  const sfs = request.headers.get("Sec-Fetch-Site");
  if (!allowCross && sfs === "cross-site") {
    return new Response("Forbidden: cross-site proxy use is disabled.", { status: 403, headers: cors() });
  }

  const target = url.searchParams.get("url");
  if (!target) return new Response("Missing ?url parameter.", { status: 400, headers: cors() });
  const valid = validTarget(target);
  if (!valid) return new Response("Invalid or blocked target URL.", { status: 400, headers: cors() });

  const ref = url.searchParams.get("ref") || "";
  const ua = url.searchParams.get("ua") || DEFAULT_UA;

  const fwd = new Headers();
  fwd.set("User-Agent", ua);
  fwd.set("Accept", "*/*");
  if (ref) {
    fwd.set("Referer", ref);
    try { fwd.set("Origin", new URL(ref).origin); } catch {}
  }
  const range = request.headers.get("Range");
  if (range) fwd.set("Range", range);

  let resp;
  try {
    resp = await fetch(valid.href, { method: "GET", headers: fwd, redirect: "follow" });
  } catch (e) {
    return new Response("Upstream fetch failed: " + (e && e.message), { status: 502, headers: cors() });
  }

  const ct = resp.headers.get("Content-Type") || "";

  // Rewrite manifests; peek when the content-type is ambiguous/text.
  let isM3U = /\.m3u8(\?|$)/i.test(valid.href) || /mpegurl/i.test(ct);
  if (!isM3U && (ct === "" || /^(text|application)\//i.test(ct))) {
    const peek = await resp.clone().text();
    if (looksLikeManifest(valid.href, ct, peek)) {
      return new Response(rewriteManifest(peek, valid.href, ref, ua), {
        status: resp.status,
        headers: cors(new Headers({ "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" }))
      });
    }
  }
  if (isM3U) {
    const text = await resp.text();
    return new Response(rewriteManifest(text, valid.href, ref, ua), {
      status: resp.status,
      headers: cors(new Headers({ "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" }))
    });
  }

  // Binary segment / key / other: stream straight through, unbuffered.
  const h = cors();
  for (const [k, v] of resp.headers) {
    if (!HOP.has(k.toLowerCase())) h.set(k, v);
  }
  if (!h.has("Content-Type") && ct) h.set("Content-Type", ct);
  h.set("Cache-Control", "no-store");
  return new Response(resp.body, { status: resp.status, headers: h });
}
