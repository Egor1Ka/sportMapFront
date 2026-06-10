# Playground QR Code Print — Design

**Date:** 2026-05-15
**Status:** Approved (brainstorming)
**Owner:** Egor Zozulia

## Summary

Every playground (`/sports-map/[id]`) gets a one-click "Print QR" action that opens a clean A4 page with a single large QR code and a placeholder for the project logo. The QR encodes the public playground URL so anyone who scans a physical sign on the playground lands on its detail page.

## Goals

- Anyone visiting a playground page can print its QR code in **one click** — no extra dialogs, no extra downloads.
- The printed sheet is ready for a printer or "Save as PDF" without further editing.
- Scanned QR opens the playground page in the visitor's preferred language (locale handled by `next-intl` middleware, not baked into the QR).
- The print page is self-contained — does not load screen-only assets (map, gallery carousel).

## Non-Goals (v1)

- Custom poster designer / template editor in admin UI.
- Server-side PDF generation.
- Analytics on QR downloads/scans.
- Final brand identity — logo slot uses a `"SportMap"` text placeholder until a real brand asset is ready.
- Bulk print (multiple playgrounds at once).
- Tests — the project has no test framework configured; manual verification only.

## User Flow

1. Visitor opens `/[locale]/sports-map/[id]`.
2. Next to the existing actions (Share, Edit) a new **"Print QR"** button is visible.
3. Click → new tab opens at `/[locale]/sports-map/[id]/print`.
4. The print page fetches the playground (`playgroundApi.getById`) and renders:
   - Top: `"SportMap"` placeholder (project name/logo slot).
   - Center: large QR code (SVG, ~11 cm).
   - Bottom: full URL in small muted text (fallback for unreadable QR).
5. After data loads, `window.print()` is called once automatically via `useEffect` (guarded by a `useRef` flag).
6. User confirms or cancels the browser print dialog. If they cancel, the page stays visible with a "Print again" button.

## Architecture

```
app/[locale]/sports-map/[id]/
├── page.tsx                 (existing — add <PrintQrButton />)
└── print/
    └── page.tsx             (new — Client Component, A4 layout, auto-print)

components/sports-map/
├── PlaygroundQrCode.tsx     (new — presentational SVG QR + project slot + URL line)
└── PrintQrButton.tsx        (new — Link-styled-as-button to /print)

lib/
└── qr-url.ts                (new — buildPlaygroundShareUrl(origin, id))
```

### Why a dedicated route (Variant A)

Considered alternatives:

| Approach                                          | Verdict                                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **A. Dedicated `/print` route**                   | Chosen. Clean separation, no `@media print` conflicts with the main page, shareable URL, easy to extend to bulk-print later. |
| B. `@media print` on the existing playground page | Rejected. Mixes print and screen DOM; map and gallery would still be in the tree during print.                               |
| C. Modal preview + `react-to-print`               | Rejected. Extra dependency; requires two clicks (open → print), violating the "one click" requirement.                       |

### URL encoded in the QR

`${origin}/sports-map/${id}` — **no `[locale]` segment.** A physical sign should not force a language; `next-intl` middleware redirects the scanning visitor to their locale on first hit.

`origin` is read from `window.location.origin` inside the print page (always client-rendered, no SSR concern).

### QR rendering library

`qrcode.react` — `<QRCodeSVG />`, error correction level `M`, default size `520` (≈11 cm on A4). SVG scales without loss on any printer DPI. Bundle impact ≈10 KB gzip, scoped to the `/print` route via Next.js segment code-splitting.

## Components

### `lib/qr-url.ts`

Pure function — testable, no dependencies.

```ts
const buildPlaygroundShareUrl = (origin: string, id: string): string =>
	`${origin}/sports-map/${id}`

export { buildPlaygroundShareUrl }
```

### `components/sports-map/PrintQrButton.tsx`

- `'use client'`
- Props: `{ playgroundId: string }`
- Renders `<Link href={'/sports-map/' + playgroundId + '/print'} target="_blank" rel="noopener">` styled via `buttonVariants({ variant: 'outline', size: 'sm' })`.
- Icon: `QrCode` from `lucide-react`.
- Visible label + `aria-label` from `useTranslations('playground').printQr`.

### `components/sports-map/PlaygroundQrCode.tsx`

Presentational — no data fetching.

- Props: `{ url: string; projectName?: string; size?: number }`
- Wraps `<QRCodeSVG value={url} size={size ?? 520} level="M" />`
- Above QR: `<span>` with `projectName ?? 'SportMap'` (large, bold).
- Below QR: `<span className="text-xs text-muted-foreground">{url}</span>` so a person can type the URL if the QR is unreadable.
- Layout: vertical flex, centered, with consistent vertical rhythm.

### `app/[locale]/sports-map/[id]/print/page.tsx`

- `'use client'`
- `use(params)` to unwrap `{ id }`.
- Local state: `playground`, `loading`, `error`.
- `useEffect` (mount): `playgroundApi.getById({ pathParams: { id } })` → set state.
- `useEffect` (when `playground` is set): `if (!printedRef.current) { printedRef.current = true; window.print() }`.
- `origin` resolved once after mount via `useState(() => '')` + `useEffect(() => setOrigin(window.location.origin), [])`.
- Render states:
  - `loading` → `<Skeleton />`, print **not** called.
  - `error` → `<Empty>` with title/description, "Try again", "Back to map" — print **not** called.
  - `ready` → `<PlaygroundQrCode url={buildPlaygroundShareUrl(origin, id)} />` + a `.no-print` "Print again" button (calls `window.print()` directly).
- `<meta name="robots" content="noindex" />` — print sheets out of search results.
- Inline `<style>`:
  - `@page { size: A4; margin: 0; }`
  - `@media print { body { background: white } .no-print { display: none } }`
  - Screen background `bg-muted` for visual A4 framing.

## Data Flow

```
PrintQrButton (on /sports-map/[id])
    └─ <Link target="_blank"> → new tab /sports-map/[id]/print

/sports-map/[id]/print/page.tsx (mount)
    │
    ├─ useEffect: playgroundApi.getById({ pathParams: { id } })
    │     ├─ success → setPlayground(data); setLoading(false)
    │     └─ error   → setError(err); setLoading(false)   (toast shown by global interceptor)
    │
    ├─ useEffect: setOrigin(window.location.origin)
    │
    ├─ render:
    │     ├─ loading       → <Skeleton />, no print
    │     ├─ error         → <Empty> + back link, no print
    │     └─ ready+origin  → <PlaygroundQrCode url={buildPlaygroundShareUrl(origin, id)} />
    │
    └─ useEffect [playground, origin]:
          if (playground && origin && !printedRef.current) {
            printedRef.current = true
            window.print()
          }
```

## Error Handling

| Scenario                            | Behavior                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `404 notFound` (no such playground) | `<Empty>` with i18n title/description + "Back to map" link. Print not invoked.                             |
| Network / timeout                   | Global `createToastInterceptor` shows toast; page shows `<Empty>` with "Try again" that re-runs `getById`. |
| User cancels print dialog           | No-op. Page stays visible; `.no-print` "Print again" button is available.                                  |
| Multiple re-renders                 | `printedRef` guards `window.print()` — fires at most once per mount.                                       |
| Server-side render                  | Page is `'use client'` — no SSR access to `window`.                                                        |
| Broken `id`                         | Backend returns 404 — falls through to the error case above.                                               |

## i18n

New keys under `playground` in `i18n/messages/{en,uk}.json`:

| Key                                 | English (placeholder)         | Ukrainian (placeholder)                  |
| ----------------------------------- | ----------------------------- | ---------------------------------------- |
| `playground.printQr`                | Print QR                      | Друк QR                                  |
| `playground.print.loading`          | Preparing QR code…            | Готуємо QR-код…                          |
| `playground.print.errorTitle`       | Couldn't load playground      | Не вдалося завантажити майданчик         |
| `playground.print.errorDescription` | Check the link and try again. | Перевірте посилання та спробуйте ще раз. |
| `playground.print.retry`            | Try again                     | Спробувати ще                            |
| `playground.print.backToMap`        | Back to map                   | Назад до карти                           |
| `playground.print.reprint`          | Print again                   | Друкувати ще раз                         |

Final copy may differ — translators will refine.

## Dependencies

- **Add:** `qrcode.react` (latest 4.x, MIT). Install via `npm install qrcode.react`.
- No other additions; no server-side packages required.

## Code Conventions

Per repo rules (`CLAUDE.md`, global `~/.claude/rules/*`):

- `function` declarations for components, named exports, `data-slot` on UI roots.
- `cn()` for className composition.
- Named callbacks — no inline lambdas with logic in `map`/`filter`/handlers.
- `const`-only; no `let`.
- Guard clauses before calls; no `?.` chains in guards.
- `'use client'` on every file using hooks or browser APIs.

## Manual Verification Checklist

- [ ] "Print QR" button visible on playground page; styled like an outline button.
- [ ] Click opens new tab at `/[locale]/sports-map/[id]/print`.
- [ ] Browser print dialog opens automatically within ~1 second.
- [ ] Print preview: empty A4, centered QR, `"SportMap"` placeholder on top, URL underneath.
- [ ] Scanning the printed QR with a phone opens `/sports-map/[id]` and redirects to the visitor's locale.
- [ ] Cancelling print → page stays; "Print again" button calls `window.print()`.
- [ ] Refreshing the print tab triggers print exactly once again (per mount).
- [ ] `/sports-map/<bad-uuid>/print` shows `<Empty>` and never calls `window.print()`.
- [ ] No console errors, no hydration warnings.

## Open Questions (resolved during brainstorming)

- **Access** → Public on the playground page.
- **Print contents** → Just QR + placeholder for project name/logo (no address/sports/photos).
- **Trigger** → Browser print dialog (auto-invoked).
- **URL form** → Locale-less; `next-intl` redirects on scan.

## Files Touched (preview)

| Path                                          | Change                                           |
| --------------------------------------------- | ------------------------------------------------ |
| `package.json`                                | Add `qrcode.react`                               |
| `lib/qr-url.ts`                               | **New**                                          |
| `components/sports-map/PrintQrButton.tsx`     | **New**                                          |
| `components/sports-map/PlaygroundQrCode.tsx`  | **New**                                          |
| `app/[locale]/sports-map/[id]/page.tsx`       | Add `<PrintQrButton />` next to existing actions |
| `app/[locale]/sports-map/[id]/print/page.tsx` | **New**                                          |
| `i18n/messages/en.json`                       | Add `playground.print*` keys                     |
| `i18n/messages/uk.json`                       | Add `playground.print*` keys                     |
