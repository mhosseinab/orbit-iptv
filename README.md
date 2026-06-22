# Orbit IPTV — Cloudflare Pages app

An open-source, single-page live-TV player for the [iptv-org](https://github.com/iptv-org/iptv) playlist (~12,500 channels): full-text search, category / country / language filters, geo-block detection, favorites, and an **optional on-demand proxy** that fixes CORS / header-restricted / geo-blocked streams — shipped as a Cloudflare Pages Function.

Built with **Vite + React + TypeScript**, deployed as static assets to Cloudflare Pages. `hls.js` is bundled (lazy-loaded on first play) and channel data is fetched live from iptv-org, cached in IndexedDB for 24h.

## Stack & layout

| Path | Purpose |
|---|---|
| `src/` | React app — `lib/` pure logic (unit-tested), `hooks/`, `components/`, `types/`. |
| `index.html` | Vite entry: static SEO `<head>` (meta, OpenGraph, JSON-LD), `<noscript>` fallback, `#root`. |
| `functions/proxy.js` | Pages Function at `/proxy` — injects CORS + `Referer`/`User-Agent`, rewrites HLS manifests, SSRF-guarded. Invoked **only** when a stream fails directly. |
| `public/` | `_headers` (CSP + security), `robots.txt`, `sitemap.xml`, `og-image.png` — copied to the `dist/` root. |
| `wrangler.toml` | Project name, `pages_build_output_dir = "dist"`, and the `PROXY_ENABLED` / `PROXY_ALLOW_CROSS_SITE` vars. |

## Architecture

A few deliberate decisions worth knowing before changing code:

- **Pure logic lives in `src/lib/` and is unit-tested (43 Vitest tests).** `records` (join streams↔channels, derive name/flag/quality, flag geo/restricted, exclude NSFW), `filter` (search + facets + status + sort), `status` (HLS error → verdict, status badges), `enrich` (logo/language side-maps), `avatar`. UI is a thin layer over these — keep business logic here, tested.
- **The ~12,500 records are immutable.** Built once after `loadCore`, never mutated. Enrichment (logos, languages) is held in **separate maps** (`logosByCh` by channel id, `langById` by record index) and merged at read time — so the background enrich pass never rewrites 12.5k objects.
- **The list is virtualized** (`@tanstack/react-virtual`); only the visible window mounts. `ChannelRow` is `React.memo`’d and the filtered list is `useMemo`’d.
- **`hls.js` is lazy-loaded** via dynamic `import()` on first play — initial JS is ~68 kB gzip; hls.js is a separate ~162 kB chunk. This also lets `_headers` tighten CSP `script-src` to `'self'`.
- **Playback is a small state machine** in `useHlsPlayer` keyed on a `playTarget` object (`{record, viaProxy}`). A direct attempt that fails a retriable check (CORS / header-restricted / 403 / 451 / watchdog timeout) flips `viaProxy` and re-runs once; media errors call `recoverMediaError`; a 15s watchdog guards stalls.
- **Persistence is localStorage**, fail-soft: favorites, recent (cap 40), and a live status cache (cap 800, LRU). The 24h channel-data cache is IndexedDB, also fail-soft.

## Develop

```bash
pnpm install
pnpm dev          # Vite dev server (UI only; /proxy is 404 here, so proxy-retry is inactive)
pnpm test         # Vitest — pure-logic unit tests
pnpm build        # tsc + vite build → dist/
pnpm pages:dev    # build, then `wrangler pages dev dist` — exercises the /proxy Function locally
```

To test the proxy path locally, enable it: `wrangler pages dev dist --binding PROXY_ENABLED=1`, then visit a header-restricted stream and watch it retry → **Proxied**.

## Deploy

### Wrangler CLI
```bash
npx wrangler login
pnpm deploy       # vite build && wrangler pages deploy dist --project-name orbit-iptv
```

### Git integration (dashboard)
1. Push to GitHub/GitLab → Cloudflare **Pages → Connect to Git**.
2. **Build command:** `pnpm build` · **Build output directory:** `dist`.
3. Deploy. The repo-root `functions/` directory is auto-detected regardless of the output dir.

## The proxy switch

In `wrangler.toml` (or per-environment in **Pages → Settings → Variables**, no redeploy needed):

```toml
[vars]
PROXY_ENABLED = "1"            # "1"/unset = ON · "0" = OFF (player detects this and runs direct-only)
PROXY_ALLOW_CROSS_SITE = "0"   # keep "0" to block other sites from abusing your proxy
```

When `PROXY_ENABLED="0"`, `/proxy` returns 404, the player's health-check ping fails, and the page behaves like a plain static site (Safari still plays the most streams).

**Direct-first.** The player routes a stream through `/proxy` only when it's CORS-blocked, header-restricted, `http://` on an `https://` page, or returns 403/451 — so proxy traffic tracks *real failures*, not every channel.

### ⚠️ Cost & abuse — read this
Proxied video segments flow through **your** Cloudflare account. The free tier allows ~100k Function requests/day; sustained live viewing can exhaust it. Mitigations in place:

- `PROXY_ALLOW_CROSS_SITE="0"` blocks other sites from hot-linking your proxy (checks `Sec-Fetch-Site`).
- The Function blocks SSRF to private / loopback / link-local / cloud-metadata addresses and allows `http(s)` only.

For personal / light use this is fine. If it gets traffic, watch usage or set `PROXY_ENABLED="0"`.

## Custom domain & SEO

Canonical URL, Open Graph tags, `robots.txt`, and `sitemap.xml` default to `https://orbit-iptv.pages.dev`. On a custom domain, find-and-replace that string in **`index.html`**, **`public/robots.txt`**, and **`public/sitemap.xml`**, then resubmit `sitemap.xml` in Google Search Console.

Included: keyworded title + meta description, canonical, Open Graph + Twitter cards, `WebApplication` and `FAQPage` JSON-LD, an `og-image.png` social card, and crawlable `<noscript>` content.

## Credits & legal

Channel data and streams come from the **iptv-org** community project. This app **hosts no video** — it links to publicly available streams; availability and licensing are the responsibility of each broadcaster. Player engine: [hls.js](https://github.com/video-dev/hls.js) (MIT).
