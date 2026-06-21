# Orbit IPTV — Cloudflare Pages package

A single-page, open-source live-TV player for the [iptv-org](https://github.com/iptv-org/iptv) playlist (~12,500 channels): full-text search, category / country / language filters, geo-block detection, and an **optional on-demand proxy** that fixes CORS / header-restricted / geo-blocked streams — shipped as a Cloudflare Pages Function.

## Contents

| File | Purpose |
|---|---|
| `index.html` | The entire app (HTML + CSS + JS). `hls.js` loads from CDN at runtime; channel data is fetched live from iptv-org. |
| `functions/proxy.js` | Pages Function served at `/proxy` — injects CORS + `Referer`/`User-Agent` and rewrites HLS manifests. Invoked **only** when a stream fails directly. |
| `_headers` | Security headers, CSP, and cache rules. |
| `wrangler.toml` | Project name, output dir, and the `PROXY_ENABLED` / `PROXY_ALLOW_CROSS_SITE` vars. |
| `robots.txt`, `sitemap.xml`, `og-image.png` | SEO / social assets. |
| `package.json` | `npm run dev` and `npm run deploy` (Wrangler) scripts. |

No build step. It's static assets + one Function.

## Deploy — pick one

### A. Dashboard (no CLI)
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**.
2. Drag in the **contents of this folder** (keep the `functions/` folder).
3. **Deploy.** Functions in `functions/` are detected and deployed automatically.

### B. Connect a Git repo
1. Push this folder to GitHub/GitLab.
2. Dashboard → **Pages → Connect to Git** → select the repo.
3. Build command: *(leave empty)*. Build output directory: `/`. **Save and Deploy.**

### C. Wrangler CLI
```bash
npm install
npx wrangler login
npm run deploy          # wrangler pages deploy . --project-name orbit-iptv
```
Local dev incl. the Function: `npm run dev` → http://localhost:8788

## The proxy switch

In `wrangler.toml` (or per-environment in **Pages → Settings → Variables**, no redeploy needed):

```toml
[vars]
PROXY_ENABLED = "1"            # "1"/unset = ON · "0" = OFF (player detects this and runs direct-only)
PROXY_ALLOW_CROSS_SITE = "0"   # keep "0" to block other sites from abusing your proxy
```

When `PROXY_ENABLED="0"`, `/proxy` returns 404, the player's health-check ping fails, and the page behaves like a plain static site (Safari still plays the most streams).

### How it's used
**Direct-first.** The player routes a stream through `/proxy` only when it's CORS-blocked, header-restricted, `http://` on an `https://` page, or returns 403/451. So proxy traffic tracks *real failures*, not every channel. Streams that recover through it get a **Proxied** badge.

### ⚠️ Cost & abuse — read this
Proxied video segments flow through **your** Cloudflare account. The free tier allows ~100k Function requests/day; sustained live viewing can exhaust it, and large-scale third-party media proxying is discouraged by Cloudflare's terms. Mitigations already in place:

- `PROXY_ALLOW_CROSS_SITE="0"` blocks other websites from hot-linking your proxy (checks `Sec-Fetch-Site`).
- The Function blocks SSRF to private / loopback / link-local / cloud-metadata addresses and only allows `http(s)`.

For personal / light use this is fine. If it gets traffic, watch your usage or set `PROXY_ENABLED="0"`.

## Custom domain & SEO

Canonical URL, Open Graph tags, `robots.txt`, and `sitemap.xml` default to `https://orbit-iptv.pages.dev`. On a custom domain, find-and-replace that string in **`index.html`**, **`robots.txt`**, and **`sitemap.xml`**, then (re)submit `sitemap.xml` in Google Search Console.

SEO/AEO already included: keyworded title + meta description, canonical, Open Graph + Twitter cards, `WebApplication` and `FAQPage` JSON-LD, an `og-image.png` social card, an accessible `<h1>`, and crawlable `<noscript>` content.

## Credits & legal

Channel data and streams come from the **iptv-org** community project. This app **hosts no video** — it links to publicly available streams; availability and licensing are the responsibility of each broadcaster. Player engine: [hls.js](https://github.com/video-dev/hls.js) (MIT).
