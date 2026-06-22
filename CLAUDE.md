# CLAUDE.md — Orbit IPTV

Client-side IPTV player: fetches the iptv-org catalogue (~12,500 channels) in the
browser, filters/searches a virtualized list, and plays HLS with `hls.js`, falling
back through a Cloudflare Pages Function proxy for CORS / header-restricted / geo
streams. **Static SPA on Cloudflare Pages** — no server, no SSR.

## Stack
Vite 6 · React 18 · TypeScript (strict) · CSS Modules + global tokens ·
`@tanstack/react-virtual` · `hls.js` (npm, lazy-loaded) · Vitest 3 · Wrangler.

## Commands
```bash
pnpm dev          # Vite dev server (UI only — /proxy is 404 here)
pnpm test         # Vitest, pure-logic unit tests (src/lib/*.test.ts)
pnpm build        # tsc -b && vite build → dist/
pnpm pages:dev    # build + wrangler pages dev dist (exercises /proxy locally)
pnpm deploy       # build + wrangler pages deploy
```

## Layout
- `src/types/` — all shared TypeScript type definitions (e.g. `iptv.ts`). No type definitions outside this directory.
- `src/lib/` — pure, unit-tested logic (records, filter, status, enrich, avatar, url) + boundaries (api, idb, proxy).
- `src/hooks/` — data load (`useIptvData`), playback (`useHlsPlayer`), proxy ping, persistence, url state, media-query, toast, shortcuts.
- `src/components/{topbar,sidebar,player,common}/` — each `.tsx` + `.module.css`.
- `src/styles/` — `tokens.css` (all design tokens / CSS variables), `global.css` (resets + base). Raw values go here, never inline.
- `functions/proxy.js` — the Pages Function. `public/` — `_headers`, robots, sitemap, og-image.
- `wrangler.toml` — Cloudflare Pages / Workers deploy config.

## Naming conventions
- **Components** — PascalCase (`ChannelRow.tsx`)
- **Hooks** — camelCase with `use` prefix (`useHlsPlayer.ts`)
- **Lib modules** — lowercase (`filter.ts`, `status.ts`)
- **Tests** — `*.test.ts` co-located with the module they test
- **CSS Modules** — `ComponentName.module.css`, same directory as the component

## Engineering principles
- **DRY** — no duplicated logic; extract shared behaviour to `src/lib/` or a shared hook before a second call site appears.
- **SOLID** — single responsibility per module/hook/component; depend on abstractions (the `src/lib/` boundary functions), not concrete fetch/IDB/HLS internals.
- **KISS** — prefer the simplest solution that passes tests; no speculative abstractions.
- **TDD** — failing test first, then code; no production code in `src/lib/` or `src/hooks/` without a corresponding Vitest test.
- **No dependency sprawl** — the stack is intentionally minimal (no router, no state manager, no query lib). Do not add new npm packages without explicit approval.

## Invariants — don't break these
- **`functions/proxy.js` stays byte-for-byte unchanged** unless explicitly asked. SSRF guard + `?ping=1`→`orbit-proxy-ok` + env gating are load-bearing.
- **Records are immutable.** Built once; enrichment lives in side maps (`logosByCh`, `langById`) merged at read time. Never mutate the 12.5k record array.
- **Business logic goes in `src/lib/` and is TDD'd** — failing test first, then code. UI stays thin over lib. (Global rule: no production code without a failing test.)
- **`hls.js` is dynamically imported** — don't move it to a static import (kills the CSP `script-src 'self'` + bundle-size win). Map HLS error types to literal strings, not `Hls.*` constants, so the classifier needs no runtime import.
- **CSP in `public/_headers`**: `connect/img/media-src *` must stay open (streams + logos are arbitrary hosts); `script-src` stays `'self'`, `worker-src` keeps `blob:` (hls worker).
- **Persistence is fail-soft.** localStorage (favorites / recent cap 40 / status cap 800) and IndexedDB (24h data cache) must never throw into the UI.

## Verification (per global rules — no completion claims without fresh evidence)
- `pnpm test` → all tests pass 
- `pnpm build` → exit 0.
- For runtime/proxy changes, `pnpm pages:dev` and hit `/proxy?ping=1`.

## Git
Commit only when asked; new commits never amend published ones; never push / open PRs
without explicit ask; stage files by name (no `git add -A`). Currently on `master` — branch before committing.
