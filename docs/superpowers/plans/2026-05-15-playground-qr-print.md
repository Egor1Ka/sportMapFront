# Playground QR Code Print — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click "Print QR" action on every playground page that opens a dedicated `/print` route, auto-triggers the browser print dialog, and prints a clean A4 sheet with a large QR code that encodes the playground URL.

**Architecture:** New Client Component route `app/[locale]/sports-map/[id]/print/page.tsx` fetches the playground via the existing `playgroundApi.getById`, renders an A4-centered SVG QR code via `qrcode.react`, then calls `window.print()` exactly once after data resolves. A `<PrintQrButton />` on the playground page is a `<Link target="_blank">` to that route. The QR encodes a locale-less URL (`/sports-map/[id]`) so `next-intl` middleware routes scanners to their preferred language.

**Tech Stack:** Next.js 16 App Router (Client Components), React 19, TypeScript strict, Tailwind v4, `qrcode.react` 4.x (new dependency), `lucide-react`, project `playgroundApi` from `services/`.

**Source spec:** [`docs/superpowers/specs/2026-05-15-playground-qr-print-design.md`](../specs/2026-05-15-playground-qr-print-design.md).

**Deviation from spec:** Existing `app/[locale]/sports-map/[id]/page.tsx` uses hardcoded Ukrainian copy (e.g. `Поділитися`, `Додано`) rather than `useTranslations`. To stay consistent with this page's current convention, the new components also use hardcoded Ukrainian strings. The `i18n/messages/{en,uk}.json` changes from the spec are **skipped**. If the team standardizes the playground page on `next-intl` later, the QR copy moves with it under a single `playground.*` namespace.

**Testing note:** No test framework is configured in this project (`package.json` has neither `jest` nor `vitest`). Verification is manual via dev server and browser, as documented in each task.

---

## File Structure

| Path | Purpose |
|---|---|
| `package.json` | Add `qrcode.react` dependency |
| `lib/qr-url.ts` | **New** — pure `buildPlaygroundShareUrl(origin, id)` helper |
| `components/sports-map/PlaygroundQrCode.tsx` | **New** — presentational SVG QR + project-name slot + URL line |
| `components/sports-map/PrintQrButton.tsx` | **New** — outline button (`<Link target="_blank">`) |
| `app/[locale]/sports-map/[id]/print/page.tsx` | **New** — Client Component, fetches playground, auto-calls `window.print()` |
| `app/[locale]/sports-map/[id]/page.tsx` | **Modify** — insert `<PrintQrButton />` into the share sidebar card |

---

## Task 1: Install `qrcode.react`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the package**

Run from project root `/Users/egorzozula/Desktop/sportMap/Template-frontend`:

```bash
npm install qrcode.react
```

Expected: `package.json` gains `"qrcode.react": "^4.x.x"` under `dependencies`. `package-lock.json` updates.

- [ ] **Step 2: Sanity-check the import exists**

Run:

```bash
node -e "console.log(Object.keys(require('qrcode.react')))"
```

Expected output contains `'QRCodeSVG'` and `'QRCodeCanvas'`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add qrcode.react for playground QR printing"
```

---

## Task 2: Add `buildPlaygroundShareUrl` helper

**Files:**
- Create: `lib/qr-url.ts`

- [ ] **Step 1: Create the helper file**

Create `lib/qr-url.ts` with **exactly** this content:

```ts
const buildPlaygroundShareUrl = (origin: string, id: string): string =>
	`${origin}/sports-map/${id}`

export { buildPlaygroundShareUrl }
```

Notes for the engineer:
- Tabs for indentation (project Prettier config).
- No `let`, no semicolons, single quotes — matches `.prettierrc`.
- Locale segment is **intentionally omitted** — `next-intl` middleware redirects on scan.

- [ ] **Step 2: Verify import resolves**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors. (If the project's tsc takes a while, alternatively run `npm run lint` — should also pass.)

- [ ] **Step 3: Commit**

```bash
git add lib/qr-url.ts
git commit -m "feat(qr): add buildPlaygroundShareUrl helper"
```

---

## Task 3: Add `PlaygroundQrCode` presentational component

**Files:**
- Create: `components/sports-map/PlaygroundQrCode.tsx`

- [ ] **Step 1: Create the component**

Create `components/sports-map/PlaygroundQrCode.tsx` with **exactly** this content:

```tsx
'use client'

import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface PlaygroundQrCodeProps {
	url: string
	projectName?: string
	size?: number
	className?: string
}

function PlaygroundQrCode({
	url,
	projectName = 'SportMap',
	size = 520,
	className,
}: PlaygroundQrCodeProps) {
	return (
		<div
			data-slot="playground-qr-code"
			className={cn(
				'flex flex-col items-center justify-center gap-6',
				className,
			)}
		>
			<span className="text-3xl font-bold tracking-tight">{projectName}</span>
			<QRCodeSVG value={url} size={size} level="M" marginSize={0} />
			<span className="text-muted-foreground max-w-full break-all text-center text-xs">
				{url}
			</span>
		</div>
	)
}

export { PlaygroundQrCode }
```

Notes:
- `data-slot` attribute follows the shadcn/ui convention in this repo.
- `cn()` import path matches `lib/utils.ts`.
- `projectName` defaults to `'SportMap'` per spec (placeholder for final brand).

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sports-map/PlaygroundQrCode.tsx
git commit -m "feat(qr): add PlaygroundQrCode presentational component"
```

---

## Task 4: Create the `/print` page

**Files:**
- Create: `app/[locale]/sports-map/[id]/print/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/[locale]/sports-map/[id]/print/page.tsx` with **exactly** this content:

```tsx
'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'

import {
	playgroundApi,
	ApiError,
	type Playground,
} from '@/services'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from '@/components/ui/empty'
import { PlaygroundQrCode } from '@/components/sports-map/PlaygroundQrCode'
import { buildPlaygroundShareUrl } from '@/lib/qr-url'
import { cn } from '@/lib/utils'

type RouteParams = { id: string; locale: string }
type Props = { params: Promise<RouteParams> }

function PlaygroundPrintPage({ params }: Props) {
	const { id } = use(params)

	const [playground, setPlayground] = useState<Playground | null>(null)
	const [error, setError] = useState<ApiError | null>(null)
	const [loading, setLoading] = useState(true)
	const [origin, setOrigin] = useState('')
	const [retryCount, setRetryCount] = useState(0)

	const printedRef = useRef(false)

	useEffect(() => {
		let cancelled = false

		setLoading(true)
		setError(null)

		const handleData = (data: Playground) => {
			if (cancelled) return
			setPlayground(data)
			setLoading(false)
		}
		const handleError = (err: unknown) => {
			if (cancelled) return
			if (err instanceof ApiError) {
				setError(err)
			}
			setLoading(false)
		}

		playgroundApi
			.getById({ pathParams: { id }, silent: true })
			.then(handleData)
			.catch(handleError)

		return () => {
			cancelled = true
		}
	}, [id, retryCount])

	useEffect(() => {
		setOrigin(window.location.origin)
	}, [])

	useEffect(() => {
		if (!playground || !origin || printedRef.current) return
		printedRef.current = true
		window.print()
	}, [playground, origin])

	const handleRetry = () => {
		printedRef.current = false
		setRetryCount((count) => count + 1)
	}

	const handleReprint = () => {
		window.print()
	}

	const renderLoading = () => (
		<div className="flex flex-col items-center gap-4">
			<Skeleton className="h-[520px] w-[520px] rounded-lg" />
			<Skeleton className="h-4 w-64" />
		</div>
	)

	const renderError = () => (
		<Empty>
			<EmptyHeader>
				<EmptyTitle>Не вдалося завантажити майданчик</EmptyTitle>
				<EmptyDescription>
					Перевірте посилання та спробуйте ще раз.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={handleRetry}
						className={buttonVariants({ variant: 'default', size: 'sm' })}
					>
						Спробувати ще
					</button>
					<Link
						href="/sports-map"
						className={buttonVariants({ variant: 'outline', size: 'sm' })}
					>
						<ArrowLeft className="mr-1 h-4 w-4" />
						До карти
					</Link>
				</div>
			</EmptyContent>
		</Empty>
	)

	const renderReady = (data: Playground) => (
		<>
			<PlaygroundQrCode url={buildPlaygroundShareUrl(origin, id)} />
			<div className="no-print mt-12 flex gap-3">
				<button
					type="button"
					onClick={handleReprint}
					className={buttonVariants({ variant: 'default', size: 'sm' })}
				>
					<Printer className="mr-1 h-4 w-4" />
					Друкувати ще раз
				</button>
				<Link
					href={`/sports-map/${data.id}`}
					className={buttonVariants({ variant: 'outline', size: 'sm' })}
				>
					<ArrowLeft className="mr-1 h-4 w-4" />
					До майданчика
				</Link>
			</div>
		</>
	)

	const renderBody = () => {
		if (loading) return renderLoading()
		if (error) return renderError()
		if (playground && origin) return renderReady(playground)
		return renderLoading()
	}

	return (
		<>
			<style>{`
				@page { size: A4; margin: 0; }
				@media print {
					html, body { background: white !important; }
					.no-print { display: none !important; }
				}
			`}</style>
			<meta name="robots" content="noindex" />
			<main
				className={cn(
					'bg-muted flex min-h-screen w-full items-center justify-center px-6 py-12 print:bg-white',
				)}
			>
				<section className="flex w-full max-w-[210mm] flex-col items-center justify-center bg-white py-16 print:py-0">
					{renderBody()}
				</section>
			</main>
		</>
	)
}

export default PlaygroundPrintPage
```

Notes for the engineer:
- `playgroundApi.getById({ pathParams: { id }, silent: true })` — `silent: true` suppresses the global toast interceptor, because we render an inline error state instead.
- `printedRef` guards `window.print()` so it fires **at most once per mount**, even if React re-renders for any reason.
- `<meta name="robots" content="noindex" />` keeps print pages out of search engines.
- The inline `<style>` block uses `@page` for printer page size — this rule cannot live in Tailwind/CSS modules.

- [ ] **Step 2: Type-check and lint**

Run in parallel:

```bash
npx tsc --noEmit
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Manual verification — happy path**

Start the dev server in background:

```bash
npm run dev
```

Then in a browser:

1. Open `http://localhost:3000/uk/sports-map` and pick any existing playground; copy its UUID from the URL.
2. Navigate manually to `http://localhost:3000/uk/sports-map/<that-uuid>/print`.
3. Expected within ~1 second: browser print dialog opens automatically.
4. In the print preview: A4 sheet, "SportMap" header, centered QR code, URL text below it.
5. Cancel the dialog → page stays, "Друкувати ще раз" button is visible (`.no-print` correctly hides only during the print render).
6. Click "Друкувати ще раз" → dialog reopens.

- [ ] **Step 4: Manual verification — error path**

In the browser, navigate to `http://localhost:3000/uk/sports-map/00000000-0000-0000-0000-000000000000/print`.

Expected:
- No print dialog opens.
- `<Empty>` state appears with title "Не вдалося завантажити майданчик", "Спробувати ще" and "До карти" buttons.
- No toast appears (because `silent: true`).

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/sports-map/\[id\]/print/page.tsx
git commit -m "feat(qr): add /sports-map/[id]/print page with auto-print"
```

---

## Task 5: Add `PrintQrButton` component

**Files:**
- Create: `components/sports-map/PrintQrButton.tsx`

- [ ] **Step 1: Create the button**

Create `components/sports-map/PrintQrButton.tsx` with **exactly** this content:

```tsx
'use client'

import Link from 'next/link'
import { QrCode } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PrintQrButtonProps {
	playgroundId: string
	className?: string
}

function PrintQrButton({ playgroundId, className }: PrintQrButtonProps) {
	const href = `/sports-map/${playgroundId}/print`

	return (
		<Link
			href={href}
			target="_blank"
			rel="noopener"
			aria-label="Друкувати QR-код майданчика"
			className={cn(
				buttonVariants({ variant: 'outline', size: 'sm' }),
				'w-full',
				className,
			)}
		>
			<QrCode className="mr-1 h-4 w-4" />
			QR-код для друку
		</Link>
	)
}

export { PrintQrButton }
```

Notes:
- `target="_blank" rel="noopener"` — opens in a new tab so user's place in the playground page is preserved.
- `w-full` matches the existing Share button (which is also `w-full` inside its Card).
- Lucide icon `QrCode` is already in the dependency tree (used elsewhere via `lucide-react`).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sports-map/PrintQrButton.tsx
git commit -m "feat(qr): add PrintQrButton link-styled component"
```

---

## Task 6: Wire `PrintQrButton` into the playground page

**Files:**
- Modify: `app/[locale]/sports-map/[id]/page.tsx`

The target is the share Card around lines 400–419 (the `<Card>` containing the "Поділитися" button). We add the QR button immediately below the share button, **inside the same `<CardContent>`** so it shares the same sidebar visual block.

- [ ] **Step 1: Add the import**

Open `app/[locale]/sports-map/[id]/page.tsx`. Find the existing import block (top of file). Add this import alongside the other component imports:

```tsx
import { PrintQrButton } from '@/components/sports-map/PrintQrButton'
```

Place it next to the other `@/components/sports-map/...` imports (the file already imports `PlaygroundMiniMap` similarly).

- [ ] **Step 2: Insert the button into the share Card**

Find this block (around lines 400–419):

```tsx
<Card>
    <CardContent className="pt-6">
        <button
            type="button"
            onClick={handleShare}
            className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'w-full',
            )}
        >
            <Share2 className="mr-1 h-4 w-4" />
            Поділитися
        </button>
        {createdAt ? (
            <p className="text-muted-foreground mt-3 text-center text-xs">
                Додано {createdAt}
            </p>
        ) : null}
    </CardContent>
</Card>
```

Replace it with **exactly** this:

```tsx
<Card>
    <CardContent className="space-y-3 pt-6">
        <button
            type="button"
            onClick={handleShare}
            className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'w-full',
            )}
        >
            <Share2 className="mr-1 h-4 w-4" />
            Поділитися
        </button>
        <PrintQrButton playgroundId={id} />
        {createdAt ? (
            <p className="text-muted-foreground mt-3 text-center text-xs">
                Додано {createdAt}
            </p>
        ) : null}
    </CardContent>
</Card>
```

Differences from the original:
- `className="pt-6"` → `className="space-y-3 pt-6"` so the two buttons have vertical spacing.
- New `<PrintQrButton playgroundId={id} />` between the Share button and the `createdAt` paragraph.

The `id` value comes from `use(params)` higher up in the same component — it's already in scope.

- [ ] **Step 3: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Manual end-to-end verification**

With `npm run dev` running:

1. Open any playground page: `http://localhost:3000/uk/sports-map/<id>`.
2. Expected: in the right sidebar, the share Card contains TWO buttons stacked with spacing — "Поділитися" and "QR-код для друку".
3. Click "QR-код для друку".
4. Expected: new browser tab opens at `/uk/sports-map/<id>/print`, browser print dialog appears within ~1 second.
5. Cancel the print dialog, return to the original tab — playground page is intact.
6. (Optional, real device test) On the print preview, scan the QR with a phone camera. Expected: phone opens `https://<host>/sports-map/<id>` and `next-intl` redirects to the device's locale.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/sports-map/\[id\]/page.tsx
git commit -m "feat(playground): show Print QR button in share sidebar"
```

---

## Task 7: Final cross-cutting verification

**No files modified.** This task confirms the feature works end-to-end and is safe to merge.

- [ ] **Step 1: Production build**

Run:

```bash
npm run build
```

Expected: build succeeds with no errors. The `app/[locale]/sports-map/[id]/print/page` route appears in the build output as a client page.

- [ ] **Step 2: Lint and format gates (CI parity)**

Run:

```bash
npm run lint
npm run format:check
```

Expected: both pass. If `format:check` fails, run `npm run format` to auto-fix and re-commit (separately).

- [ ] **Step 3: Walk the manual verification checklist**

Run through this list from the spec; tick each off mentally:

- [ ] "Print QR" button visible on playground page; styled like an outline button.
- [ ] Click opens new tab at `/[locale]/sports-map/[id]/print`.
- [ ] Browser print dialog opens automatically within ~1 second.
- [ ] Print preview: empty A4, centered QR, `"SportMap"` placeholder on top, URL underneath.
- [ ] Scanning the printed QR with a phone (or simulator) opens `/sports-map/[id]` and redirects to the visitor's locale.
- [ ] Cancelling print → page stays; "Друкувати ще раз" button calls `window.print()`.
- [ ] Refreshing the print tab triggers print exactly once again (per mount).
- [ ] `/sports-map/<bad-uuid>/print` shows `<Empty>` and never calls `window.print()`.
- [ ] No console errors, no hydration warnings.

- [ ] **Step 4: Stop dev server**

If it was started earlier in background, stop it:

```bash
# If you used `run_in_background`, the harness will track it.
# Otherwise: Ctrl+C in the dev terminal.
```

- [ ] **Step 5: No final commit needed**

All code is committed across Tasks 1–6. This task only verifies; nothing new to add.
