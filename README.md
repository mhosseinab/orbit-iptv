# Orbit IPTV

An open-source, single-page live-TV player for the [iptv-org](https://github.com/iptv-org/iptv) catalogue (~12,500 channels). Full-text search, category / country / language filters, geo-block detection, favorites, and an **optional proxy** that fixes CORS / header-restricted / geo-blocked streams — shipped as a Cloudflare Pages Function.

**[orbit-iptv.pages.dev](https://orbit-iptv.pages.dev)**

## Features

- Browse and search ~12,500 live channels from iptv-org
- Filter by category, country, language, quality, and stream status
- HLS playback via [hls.js](https://github.com/video-dev/hls.js); direct HLS in Safari
- Proxy fallback for CORS-blocked / header-restricted / geo-blocked streams
- Favorites and recently watched (persisted to localStorage)
- Shareable URLs — full app state lives in the query string, with working browser Back/Forward navigation

## Stack

Vite 6 · React 18 · TypeScript · CSS Modules · `@tanstack/react-virtual` · `hls.js` · Cloudflare Pages

## Develop

```bash
pnpm install
pnpm dev          # Vite dev server (UI only; /proxy is 404)
pnpm test         # Vitest unit tests
pnpm build        # tsc + vite build → dist/
pnpm pages:dev    # build + wrangler pages dev dist (exercises /proxy locally)
```

## Deploy

### Wrangler CLI
```bash
npx wrangler login
pnpm deploy
```

### Git integration (Cloudflare dashboard)
1. Push to GitHub → **Pages → Connect to Git**
2. Build command: `pnpm build` · Output directory: `dist`
3. Deploy — `functions/` is auto-detected

## Proxy

The player routes a stream through `/proxy` only when it fails directly (CORS, header-restricted, `http://` on `https://`, 403/451). Most streams play without it.

Enable / disable via `wrangler.toml` or **Pages → Settings → Variables** (no redeploy needed):

```toml
[vars]
PROXY_ENABLED = "1"            # "1" = on · "0" = off
PROXY_ALLOW_CROSS_SITE = "0"   # keep "0" to block other sites from using your proxy
```

> **Cost note:** proxied video flows through your Cloudflare account. The free tier covers ~100k Function requests/day — fine for personal use. Watch usage if the instance gets traffic, or set `PROXY_ENABLED="0"`.

## Custom domain

Find-and-replace `https://orbit-iptv.pages.dev` in `index.html`, `public/robots.txt`, and `public/sitemap.xml`, then resubmit the sitemap in Google Search Console.

## Credits

Channel data and streams come from the [iptv-org](https://github.com/iptv-org/iptv) community project. This app hosts no video — it links to publicly available streams; availability and licensing are the responsibility of each broadcaster.
