# Активність — Live Activity Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the public-facing `/activity` page that shows live check-ins, upcoming events and top playgrounds nearby on one screen — combining a map and a mixed feed.

**Architecture:** Reuse existing `SportsMap` (Leaflet + markercluster — already renders live badges via `Playground.counters`). New page at `app/[locale]/(public-app)/activity/`. Geolocation hook + a single data hook that loads playgrounds-by-bbox and (for top-N "hot" playgrounds) their upcoming events. Polling every 60s. Spec lives at [docs/superpowers/specs/2026-05-24-activity-page-design.md](../specs/2026-05-24-activity-page-design.md).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, shadcn/ui, next-intl, Leaflet, Vitest + Testing Library.

**Deviations from the spec, documented up-front:**
1. Events on the map are shown as `📅 N` badge on the playground pin (existing `SportsMap` behavior) instead of separate blue pins. Rationale: reuses existing component, no Leaflet rewrite. If product later wants separate event pins — separate plan.
2. "SOON" feed cards (with `за 30 хв`, `5/10 гравців`) fetch event details only for the top N playgrounds where `counters.upcomingEvents > 0`, using the existing `eventApi.listByPlayground`. A dedicated "events nearby in window" endpoint can replace this later — no API contract is exposed outside the hook.
3. Top is sorted by `counters.activeCheckIns` (what backend already returns) — equivalent to "check-ins за останні 60 хв" as long as backend agrees with that window. If backend's window differs — the spec needs alignment with the backend, not this plan.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `app/[locale]/(public-app)/activity/page.tsx` | Route entry, client component, layout composition |
| `components/activity/ActivityHeader.tsx` | City selector + "Дозволити геолокацію" CTA |
| `components/activity/ActivityMapPanel.tsx` | Thin wrapper around `SportsMap` (dynamic import) with the right `MapPoint[]` mapping and click → `/sports-map/[id]` navigation |
| `components/activity/SportFilterChips.tsx` | Horizontal chip filter, reads/writes `?sports=` |
| `components/activity/ActivityFeed.tsx` | Maps sorted items → `ActivityFeedItem`s |
| `components/activity/ActivityFeedItem.tsx` | One row, discriminated by `type: 'live' \| 'soon' \| 'top'` |
| `components/activity/ActivityFeedSkeleton.tsx` | Skeleton rows during initial load |
| `components/activity/activity-feed-utils.ts` | Pure functions: `playgroundsToFeedItems`, `sortFeedItems`, `filterBySport`, `distanceMeters` |
| `components/activity/activity-types.ts` | `FeedItem`, `FeedItemKind` discriminated union |
| `hooks/use-geolocation.ts` | State machine: pending → granted/denied + retry, default city fallback |
| `hooks/use-activity-data.ts` | Fetch playgrounds-by-bbox, fetch top-N upcoming events, polling 60s |
| `i18n/messages/uk.json` | New `activity` namespace + `nav.activity` |
| `i18n/messages/en.json` | Mirror EN |
| `components/app-shell/app-sidebar.tsx` | Add "Активність" nav item |
| `hooks/use-geolocation.test.ts` | Unit tests |
| `components/activity/activity-feed-utils.test.ts` | Unit tests |
| `components/activity/ActivityFeedItem.test.tsx` | Render tests, 3 variants |

---

## Task 1: Scaffold the route and add sidebar nav

**Files:**
- Create: `app/[locale]/(public-app)/activity/page.tsx`
- Modify: `components/app-shell/app-sidebar.tsx`
- Modify: `i18n/messages/uk.json` and `i18n/messages/en.json` (add `nav.activity`)

- [ ] **Step 1: Create stub page**

```tsx
// app/[locale]/(public-app)/activity/page.tsx
'use client'

import { useTranslations } from 'next-intl'

const ActivityPage = () => {
	const t = useTranslations('activity')
	return (
		<div className="flex h-[calc(100vh-3.5rem)] flex-col">
			<h1 className="px-4 pt-4 text-xl font-semibold">{t('title')}</h1>
			<p className="text-muted-foreground px-4 text-sm">{t('subtitle')}</p>
		</div>
	)
}

export default ActivityPage
```

- [ ] **Step 2: Add `nav.activity` translations**

In `i18n/messages/uk.json`, under existing `nav`:

```json
"nav": {
	"map": "Карта",
	"activity": "Активність",
	"moderation": "..."
}
```

In `en.json`:

```json
"nav": {
	"map": "Map",
	"activity": "Activity",
	"moderation": "..."
}
```

- [ ] **Step 3: Add stub `activity` translation namespace**

In both `uk.json` and `en.json`, top-level:

```json
"activity": {
	"title": "Активність",
	"subtitle": "Що відбувається зараз"
}
```

(EN: "Activity" / "What's happening now")

- [ ] **Step 4: Add sidebar entry**

In `components/app-shell/app-sidebar.tsx`, after the existing `isMapActive` line:

```tsx
const isActivityActive = pathname.includes('/activity')
```

And inside the `<SidebarMenu>`, after the `map` `SidebarMenuItem`:

```tsx
<SidebarMenuItem>
	<SidebarMenuButton
		tooltip={t('activity')}
		isActive={isActivityActive}
		render={<Link href="/activity" />}
	>
		<Radio />
		<span>{t('activity')}</span>
	</SidebarMenuButton>
</SidebarMenuItem>
```

Add `Radio` to the lucide imports at top:

```tsx
import { Dumbbell, MapIcon, Radio, ShieldCheck } from 'lucide-react'
```

- [ ] **Step 5: Run dev server and click into `/uk/activity`**

```bash
npm run dev
```
Open `http://localhost:3000/uk/activity`. Expected: sidebar shows "Активність" highlighted, page shows title and subtitle. No console errors.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/\(public-app\)/activity/page.tsx \
        components/app-shell/app-sidebar.tsx \
        i18n/messages/uk.json i18n/messages/en.json
git commit -m "feat(activity): scaffold /activity route and sidebar entry"
```

---

## Task 2: `useGeolocation` hook (TDD)

**Files:**
- Create: `hooks/use-geolocation.ts`
- Create: `hooks/use-geolocation.test.ts`

- [ ] **Step 1: Write failing test for default state**

```ts
// hooks/use-geolocation.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation, DEFAULT_CITY } from './use-geolocation'

const mockGetCurrentPosition = vi.fn()

beforeEach(() => {
	Object.defineProperty(global.navigator, 'geolocation', {
		value: { getCurrentPosition: mockGetCurrentPosition },
		configurable: true,
	})
	mockGetCurrentPosition.mockReset()
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('useGeolocation', () => {
	it('starts in pending state with default city coordinates', () => {
		mockGetCurrentPosition.mockImplementation(() => {})
		const { result } = renderHook(() => useGeolocation())
		expect(result.current.status).toBe('pending')
		expect(result.current.lat).toBe(DEFAULT_CITY.lat)
		expect(result.current.lng).toBe(DEFAULT_CITY.lng)
	})
})
```

- [ ] **Step 2: Run test, see it fail**

```bash
npm run test -- hooks/use-geolocation
```
Expected: FAIL — module not found.

- [ ] **Step 3: Minimal implementation**

```ts
// hooks/use-geolocation.ts
'use client'

import { useEffect, useState } from 'react'

const DEFAULT_CITY = { name: 'Київ', lat: 50.4501, lng: 30.5234 }

type GeoState =
	| { status: 'pending'; lat: number; lng: number }
	| { status: 'granted'; lat: number; lng: number }
	| { status: 'denied'; lat: number; lng: number; reason: 'permission' | 'unavailable' | 'timeout' }

const initialState = (): GeoState => ({
	status: 'pending',
	lat: DEFAULT_CITY.lat,
	lng: DEFAULT_CITY.lng,
})

const useGeolocation = () => {
	const [state, setState] = useState<GeoState>(initialState)
	useEffect(() => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			setState({ status: 'denied', lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng, reason: 'unavailable' })
			return
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => setState({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude }),
			(err) => {
				const reason = err.code === err.PERMISSION_DENIED ? 'permission' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable'
				setState({ status: 'denied', lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng, reason })
			},
		)
	}, [])
	return state
}

export { useGeolocation, DEFAULT_CITY }
export type { GeoState }
```

- [ ] **Step 4: Test passes**

```bash
npm run test -- hooks/use-geolocation
```
Expected: PASS.

- [ ] **Step 5: Add test — transitions to granted on success**

Append to test file:

```ts
it('transitions to granted with returned coords', async () => {
	mockGetCurrentPosition.mockImplementation((onSuccess) => {
		onSuccess({ coords: { latitude: 49.5, longitude: 32.5 } })
	})
	const { result } = renderHook(() => useGeolocation())
	await act(async () => {})
	expect(result.current.status).toBe('granted')
	expect(result.current.lat).toBe(49.5)
	expect(result.current.lng).toBe(32.5)
})

it('transitions to denied with permission reason and default city coords', async () => {
	mockGetCurrentPosition.mockImplementation((_onSuccess, onError) => {
		onError({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 })
	})
	const { result } = renderHook(() => useGeolocation())
	await act(async () => {})
	expect(result.current.status).toBe('denied')
	if (result.current.status === 'denied') {
		expect(result.current.reason).toBe('permission')
	}
	expect(result.current.lat).toBe(DEFAULT_CITY.lat)
})
```

- [ ] **Step 6: Run tests**

```bash
npm run test -- hooks/use-geolocation
```
Expected: 3 passing.

- [ ] **Step 7: Add `retry()` method — failing test first**

Append:

```ts
it('exposes retry() to re-trigger geolocation', async () => {
	mockGetCurrentPosition
		.mockImplementationOnce((_s, onError) => onError({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 }))
		.mockImplementationOnce((onSuccess) => onSuccess({ coords: { latitude: 48, longitude: 35 } }))
	const { result } = renderHook(() => useGeolocation())
	await act(async () => {})
	expect(result.current.status).toBe('denied')
	await act(async () => {
		result.current.retry()
	})
	expect(result.current.status).toBe('granted')
	expect(result.current.lat).toBe(48)
})
```

Run:

```bash
npm run test -- hooks/use-geolocation
```
Expected: FAIL — `retry` is not a function.

- [ ] **Step 8: Implement `retry`**

In `hooks/use-geolocation.ts`, extract the request logic and expose `retry`:

```ts
import { useCallback, useEffect, useState } from 'react'

// ... (DEFAULT_CITY, GeoState, initialState unchanged)

const useGeolocation = () => {
	const [state, setState] = useState<GeoState>(initialState)

	const request = useCallback(() => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			setState({ status: 'denied', lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng, reason: 'unavailable' })
			return
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => setState({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude }),
			(err) => {
				const reason =
					err.code === err.PERMISSION_DENIED ? 'permission'
					: err.code === err.TIMEOUT ? 'timeout'
					: 'unavailable'
				setState({ status: 'denied', lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng, reason })
			},
		)
	}, [])

	useEffect(() => {
		request()
	}, [request])

	return { ...state, retry: request }
}
```

- [ ] **Step 9: Run all tests, commit**

```bash
npm run test -- hooks/use-geolocation
git add hooks/use-geolocation.ts hooks/use-geolocation.test.ts
git commit -m "feat(activity): add useGeolocation with retry and default-city fallback"
```

---

## Task 3: Feed types + pure utils (TDD)

**Files:**
- Create: `components/activity/activity-types.ts`
- Create: `components/activity/activity-feed-utils.ts`
- Create: `components/activity/activity-feed-utils.test.ts`

- [ ] **Step 1: Write the types**

```ts
// components/activity/activity-types.ts
import type { Playground, PlaygroundEvent } from '@/services'

interface FeedItemLive {
	type: 'live'
	playground: Playground
	activeCount: number
	distanceMeters: number | null
}

interface FeedItemSoon {
	type: 'soon'
	playground: Playground
	event: PlaygroundEvent
	startsInMin: number
	distanceMeters: number | null
}

interface FeedItemTop {
	type: 'top'
	playground: Playground
	dailyCount: number
	distanceMeters: number | null
}

type FeedItem = FeedItemLive | FeedItemSoon | FeedItemTop

export type { FeedItem, FeedItemLive, FeedItemSoon, FeedItemTop }
```

- [ ] **Step 2: Write failing tests for utils**

```ts
// components/activity/activity-feed-utils.test.ts
import { describe, it, expect } from 'vitest'
import { distanceMeters, playgroundsToFeedItems, sortFeedItems, filterBySport } from './activity-feed-utils'
import type { Playground } from '@/services'

const makePlayground = (overrides: Partial<Playground> = {}): Playground => ({
	id: 'p1',
	name: 'Test',
	description: null,
	lat: 50.4501,
	lng: 30.5234,
	address: { city: null, district: null, street: null, fullAddress: null },
	sports: [],
	photos: [],
	counters: { activeCheckIns: 0, upcomingEvents: 0 },
	rating: { average: null, count: 0 },
	createdBy: null,
	createdAt: null,
	updatedAt: null,
	...overrides,
})

describe('distanceMeters', () => {
	it('returns 0 for identical points', () => {
		expect(distanceMeters(50, 30, 50, 30)).toBe(0)
	})

	it('returns ~111 km for 1 degree latitude difference', () => {
		const meters = distanceMeters(50, 30, 51, 30)
		expect(meters).toBeGreaterThan(110_000)
		expect(meters).toBeLessThan(112_000)
	})
})

describe('playgroundsToFeedItems', () => {
	it('emits live item for playgrounds with activeCheckIns > 0', () => {
		const playground = makePlayground({ counters: { activeCheckIns: 5, upcomingEvents: 0 } })
		const items = playgroundsToFeedItems([playground], { lat: 50.4501, lng: 30.5234 })
		expect(items).toHaveLength(1)
		expect(items[0].type).toBe('live')
		if (items[0].type === 'live') expect(items[0].activeCount).toBe(5)
	})

	it('emits top item for playgrounds with no live but with rating', () => {
		const playground = makePlayground({
			counters: { activeCheckIns: 0, upcomingEvents: 0 },
			rating: { average: 4.5, count: 10 },
		})
		const items = playgroundsToFeedItems([playground], { lat: 50.4501, lng: 30.5234 })
		expect(items).toHaveLength(1)
		expect(items[0].type).toBe('top')
	})

	it('skips playgrounds with no activity and no rating', () => {
		const playground = makePlayground()
		const items = playgroundsToFeedItems([playground], { lat: 50.4501, lng: 30.5234 })
		expect(items).toHaveLength(0)
	})
})

describe('sortFeedItems', () => {
	const userPos = { lat: 50.4501, lng: 30.5234 }

	it('puts live items before top items', () => {
		const top = makePlayground({ id: 'top', counters: { activeCheckIns: 0, upcomingEvents: 0 }, rating: { average: 4.9, count: 100 } })
		const live = makePlayground({ id: 'live', counters: { activeCheckIns: 1, upcomingEvents: 0 } })
		const items = playgroundsToFeedItems([top, live], userPos)
		const sorted = sortFeedItems(items)
		expect(sorted[0].playground.id).toBe('live')
	})

	it('within live items, more active count ranks higher', () => {
		const small = makePlayground({ id: 'small', counters: { activeCheckIns: 1, upcomingEvents: 0 }, lat: 50.4501, lng: 30.5234 })
		const big = makePlayground({ id: 'big', counters: { activeCheckIns: 12, upcomingEvents: 0 }, lat: 50.4501, lng: 30.5234 })
		const items = playgroundsToFeedItems([small, big], userPos)
		const sorted = sortFeedItems(items)
		expect(sorted[0].playground.id).toBe('big')
	})
})

describe('filterBySport', () => {
	it('keeps live item when playground has selected sport', () => {
		const playground = makePlayground({
			counters: { activeCheckIns: 3, upcomingEvents: 0 },
			sports: [{ id: 's', code: 'football', label: 'Football', icon: null, color: null }],
		})
		const items = playgroundsToFeedItems([playground], { lat: 50, lng: 30 })
		expect(filterBySport(items, 'football')).toHaveLength(1)
		expect(filterBySport(items, 'basketball')).toHaveLength(0)
	})

	it('keeps everything when no sport filter', () => {
		const playground = makePlayground({ counters: { activeCheckIns: 1, upcomingEvents: 0 } })
		const items = playgroundsToFeedItems([playground], { lat: 50, lng: 30 })
		expect(filterBySport(items, null)).toHaveLength(1)
	})
})
```

- [ ] **Step 3: Run, see it fail**

```bash
npm run test -- components/activity
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement utils**

```ts
// components/activity/activity-feed-utils.ts
import type { Playground } from '@/services'
import type { FeedItem } from './activity-types'

const EARTH_RADIUS_M = 6_371_000

const toRad = (deg: number) => (deg * Math.PI) / 180

const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
	const dLat = toRad(lat2 - lat1)
	const dLng = toRad(lng2 - lng1)
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

const computeDistance = (playground: Playground, user: { lat: number; lng: number }): number | null => {
	if (typeof playground.lat !== 'number' || typeof playground.lng !== 'number') return null
	return distanceMeters(user.lat, user.lng, playground.lat, playground.lng)
}

const toLiveItem = (playground: Playground, user: { lat: number; lng: number }): FeedItem => ({
	type: 'live',
	playground,
	activeCount: playground.counters.activeCheckIns,
	distanceMeters: computeDistance(playground, user),
})

const toTopItem = (playground: Playground, user: { lat: number; lng: number }): FeedItem => ({
	type: 'top',
	playground,
	dailyCount: playground.counters.activeCheckIns,
	distanceMeters: computeDistance(playground, user),
})

const hasRating = (playground: Playground): boolean =>
	playground.rating.average !== null && playground.rating.count > 0

const toFeedItem = (user: { lat: number; lng: number }) => (playground: Playground): FeedItem | null => {
	if (playground.counters.activeCheckIns > 0) return toLiveItem(playground, user)
	if (hasRating(playground)) return toTopItem(playground, user)
	return null
}

const isNotNull = <T>(value: T | null): value is T => value !== null

const playgroundsToFeedItems = (playgrounds: Playground[], user: { lat: number; lng: number }): FeedItem[] =>
	playgrounds.map(toFeedItem(user)).filter(isNotNull)

const SCORE_LIVE = 1_000_000
const SCORE_SOON = 500_000
const SCORE_TOP_PER_DAILY = 100

const scoreItem = (item: FeedItem): number => {
	const kindScore =
		item.type === 'live' ? SCORE_LIVE + item.activeCount * 1000
		: item.type === 'soon' ? SCORE_SOON - item.startsInMin
		: item.dailyCount * SCORE_TOP_PER_DAILY
	const distance = item.distanceMeters ?? 5000
	const proximity = Math.max(0, 5000 - distance) / 10
	return kindScore + proximity
}

const byScoreDesc = (a: FeedItem, b: FeedItem) => scoreItem(b) - scoreItem(a)

const sortFeedItems = (items: FeedItem[]): FeedItem[] => [...items].sort(byScoreDesc)

const matchesSport = (sportCode: string) => (item: FeedItem): boolean => {
	if (item.type === 'soon') return item.event.sport.code === sportCode
	return item.playground.sports.some((sport) => sport.code === sportCode)
}

const filterBySport = (items: FeedItem[], sportCode: string | null): FeedItem[] => {
	if (!sportCode) return items
	return items.filter(matchesSport(sportCode))
}

export { distanceMeters, playgroundsToFeedItems, sortFeedItems, filterBySport }
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- components/activity/activity-feed-utils
```
Expected: All passing.

- [ ] **Step 6: Commit**

```bash
git add components/activity/activity-types.ts \
        components/activity/activity-feed-utils.ts \
        components/activity/activity-feed-utils.test.ts
git commit -m "feat(activity): feed item types and pure sorting/filter utils"
```

---

## Task 4: `useActivityData` hook

**Files:**
- Create: `hooks/use-activity-data.ts`

This hook fetches playgrounds in a bbox around the user, then for the top N playgrounds with `counters.upcomingEvents > 0` fetches their upcoming events. Polls every 60s.

- [ ] **Step 1: Implement the hook**

```ts
// hooks/use-activity-data.ts
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { playgroundApi, eventApi, type Playground, type PlaygroundEvent } from '@/services'

const POLL_INTERVAL_MS = 60_000
const BBOX_RADIUS_DEG = 0.05 // ~5.5km — enough for an urban district
const EVENT_FETCH_LIMIT = 8 // top N playgrounds to fetch events for
const SOON_WINDOW_MIN = 120

interface ActivityData {
	playgrounds: Playground[]
	upcomingEvents: PlaygroundEvent[]
}

const emptyData: ActivityData = { playgrounds: [], upcomingEvents: [] }

const buildBbox = (lat: number, lng: number): string => {
	const swLng = lng - BBOX_RADIUS_DEG
	const swLat = lat - BBOX_RADIUS_DEG
	const neLng = lng + BBOX_RADIUS_DEG
	const neLat = lat + BBOX_RADIUS_DEG
	return [swLng, swLat, neLng, neLat].map((n) => n.toFixed(6)).join(',')
}

const minutesUntil = (iso: string, now: number): number => {
	const start = new Date(iso).getTime()
	return Math.round((start - now) / 60_000)
}

const isWithinSoonWindow = (event: PlaygroundEvent, now: number): boolean => {
	const m = minutesUntil(event.startAt, now)
	return m >= 0 && m <= SOON_WINDOW_MIN
}

const fetchUpcomingForPlayground = async (playgroundId: string): Promise<PlaygroundEvent[]> => {
	const response = await eventApi.listByPlayground({
		pathParams: { playgroundId },
		queryParams: { time: 'upcoming' },
		silent: true,
	})
	return response.items
}

const pickPlaygroundsWithUpcoming = (playgrounds: Playground[]): Playground[] =>
	playgrounds
		.filter((p) => p.counters.upcomingEvents > 0)
		.slice(0, EVENT_FETCH_LIMIT)

const fetchEventsForPlaygrounds = async (playgrounds: Playground[]): Promise<PlaygroundEvent[]> => {
	const targets = pickPlaygroundsWithUpcoming(playgrounds)
	if (targets.length === 0) return []
	const ids = targets.map((p) => p.id)
	const lists = await Promise.allSettled(ids.map(fetchUpcomingForPlayground))
	const flatten = lists.flatMap((settled) => (settled.status === 'fulfilled' ? settled.value : []))
	const now = Date.now()
	return flatten.filter((event) => isWithinSoonWindow(event, now))
}

const useActivityData = (params: { lat: number; lng: number; sportCode: string | null }) => {
	const { lat, lng, sportCode } = params
	const [data, setData] = useState<ActivityData>(emptyData)
	const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
	const requestIdRef = useRef(0)

	const load = useCallback(async () => {
		const requestId = requestIdRef.current + 1
		requestIdRef.current = requestId
		setStatus((prev) => (prev === 'idle' ? 'loading' : prev))
		try {
			const playgroundResponse = await playgroundApi.listByBbox({
				queryParams: { bbox: buildBbox(lat, lng), sports: sportCode ?? undefined },
				silent: true,
			})
			const playgrounds = playgroundResponse.items
			const upcomingEvents = await fetchEventsForPlaygrounds(playgrounds)
			if (requestIdRef.current !== requestId) return
			setData({ playgrounds, upcomingEvents })
			setStatus('success')
		} catch {
			if (requestIdRef.current !== requestId) return
			setStatus('error')
		}
	}, [lat, lng, sportCode])

	useEffect(() => {
		load()
	}, [load])

	useEffect(() => {
		const id = setInterval(load, POLL_INTERVAL_MS)
		return () => clearInterval(id)
	}, [load])

	return { data, status, refetch: load }
}

export { useActivityData }
export type { ActivityData }
```

- [ ] **Step 2: Smoke-test the hook compiles**

```bash
npm run lint -- hooks/use-activity-data.ts
```
Expected: no lint errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-activity-data.ts
git commit -m "feat(activity): useActivityData hook with bbox playgrounds, soon events, polling"
```

---

## Task 5: `SportFilterChips` component

**Files:**
- Create: `components/activity/SportFilterChips.tsx`

Reads sport list from `sportApi.list` (or whatever the existing list endpoint is — confirm via `services/configs/sport.config.ts`). Renders horizontal chip row. Active chip → URL `?sport=football`.

- [ ] **Step 1: Confirm sport-list endpoint signature**

Open `services/configs/sport.config.ts` and confirm a list endpoint exists (e.g. `sportApi.list()` returning `SportListResponse`). If not, use the existing `SportsFilter` component as inspiration (`components/sports-map/SportsFilter.tsx`).

- [ ] **Step 2: Implement the chips component**

```tsx
// components/activity/SportFilterChips.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { sportApi, type Sport } from '@/services'
import { cn } from '@/lib/utils'

const ALL_VALUE = ''

const useSports = () => {
	const [sports, setSports] = useState<Sport[]>([])
	useEffect(() => {
		let cancelled = false
		const load = async () => {
			try {
				const response = await sportApi.list({ silent: true })
				if (!cancelled) setSports(response.items)
			} catch {
				/* swallow — toast interceptor already surfaces */
			}
		}
		load()
		return () => {
			cancelled = true
		}
	}, [])
	return sports
}

const SportFilterChips = () => {
	const t = useTranslations('activity.filters')
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const selectedCode = searchParams.get('sport') ?? ALL_VALUE
	const sports = useSports()

	const handleSelect = (code: string) => {
		const params = new URLSearchParams(searchParams.toString())
		if (code === ALL_VALUE) params.delete('sport')
		else params.set('sport', code)
		const query = params.toString()
		router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
	}

	const renderChip = (code: string, label: string) => {
		const isActive = selectedCode === code
		return (
			<button
				key={code || 'all'}
				type="button"
				onClick={() => handleSelect(code)}
				className={cn(
					'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
					isActive
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border bg-background text-muted-foreground hover:text-foreground',
				)}
			>
				{label}
			</button>
		)
	}

	return (
		<div className="flex gap-2 overflow-x-auto border-b px-4 py-2">
			{renderChip(ALL_VALUE, t('all'))}
			{sports.map((sport) => renderChip(sport.code, sport.label))}
		</div>
	)
}

export { SportFilterChips }
```

- [ ] **Step 3: Add `activity.filters.all` to translations**

In `i18n/messages/uk.json`:
```json
"activity": {
	"title": "Активність",
	"subtitle": "Що відбувається зараз",
	"filters": { "all": "Всі види" }
}
```

EN: `"all": "All sports"`.

- [ ] **Step 4: Commit**

```bash
git add components/activity/SportFilterChips.tsx i18n/messages/uk.json i18n/messages/en.json
git commit -m "feat(activity): SportFilterChips with URL-synced selection"
```

---

## Task 6: `ActivityFeedItem` (TDD render)

**Files:**
- Create: `components/activity/ActivityFeedItem.tsx`
- Create: `components/activity/ActivityFeedItem.test.tsx`

- [ ] **Step 1: Write failing render test for live variant**

```tsx
// components/activity/ActivityFeedItem.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ActivityFeedItem } from './ActivityFeedItem'
import type { FeedItemLive } from './activity-types'

const messages = {
	activity: {
		feed: {
			live: {
				badge: 'LIVE',
				title: '{count} людей грають',
				distanceMeters: '{meters} м',
				distanceKm: '{km} км',
			},
			soon: { badge: 'СКОРО' },
			top: { badge: 'ТОП' },
		},
	},
}

const renderWithIntl = (ui: React.ReactNode) =>
	render(<NextIntlClientProvider locale="uk" messages={messages}>{ui}</NextIntlClientProvider>)

const makeLiveItem = (overrides: Partial<FeedItemLive> = {}): FeedItemLive => ({
	type: 'live',
	playground: {
		id: 'p1',
		name: 'Парк Шевченка',
		description: null,
		lat: 50.4501,
		lng: 30.5234,
		address: { city: 'Київ', district: null, street: null, fullAddress: null },
		sports: [{ id: 's1', code: 'football', label: 'Футбол', icon: null, color: null }],
		photos: [],
		counters: { activeCheckIns: 12, upcomingEvents: 0 },
		rating: { average: 4.5, count: 8 },
		createdBy: null,
		createdAt: null,
		updatedAt: null,
	},
	activeCount: 12,
	distanceMeters: 500,
	...overrides,
})

describe('ActivityFeedItem live', () => {
	it('renders count and LIVE badge', () => {
		renderWithIntl(<ActivityFeedItem item={makeLiveItem()} />)
		expect(screen.getByText(/12 людей грають/)).toBeInTheDocument()
		expect(screen.getByText('LIVE')).toBeInTheDocument()
		expect(screen.getByText('Парк Шевченка')).toBeInTheDocument()
	})

	it('renders distance in meters when under 1km', () => {
		renderWithIntl(<ActivityFeedItem item={makeLiveItem({ distanceMeters: 500 })} />)
		expect(screen.getByText('500 м')).toBeInTheDocument()
	})

	it('renders distance in km when >= 1km', () => {
		renderWithIntl(<ActivityFeedItem item={makeLiveItem({ distanceMeters: 2300 })} />)
		expect(screen.getByText('2.3 км')).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Run, see it fail**

```bash
npm run test -- components/activity/ActivityFeedItem
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ActivityFeedItem`**

```tsx
// components/activity/ActivityFeedItem.tsx
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { FeedItem } from './activity-types'

const formatDistance = (meters: number | null, formatMeters: (m: number) => string, formatKm: (km: string) => string): string | null => {
	if (meters === null) return null
	if (meters < 1000) return formatMeters(Math.round(meters))
	return formatKm((meters / 1000).toFixed(1))
}

const SportEmojiMap: Record<string, string> = {
	football: '⚽',
	futsal: '⚽',
	basketball: '🏀',
	workout: '💪',
	fitness: '💪',
	tennis: '🎾',
	running: '🏃',
	volleyball: '🏐',
}

const pickSportEmoji = (codes: string[]): string => {
	for (const code of codes) {
		if (SportEmojiMap[code]) return SportEmojiMap[code]
	}
	return '🏅'
}

const ActivityFeedItem = ({ item }: { item: FeedItem }) => {
	const t = useTranslations('activity.feed')
	const formatMeters = (m: number) => t('live.distanceMeters', { meters: m })
	const formatKm = (km: string) => t('live.distanceKm', { km })
	const distanceText = formatDistance(item.distanceMeters, formatMeters, formatKm)
	const emoji = pickSportEmoji(item.playground.sports.map((s) => s.code))
	const playgroundName = item.playground.name ?? '—'

	if (item.type === 'live') {
		return (
			<Link
				href={`/sports-map/${item.playground.id}`}
				className="bg-card flex items-center gap-3 rounded-lg border-l-4 border-red-500 p-3 shadow-sm transition hover:shadow"
			>
				<div className="bg-red-50 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg">{emoji}</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<span>{t('live.title', { count: item.activeCount })}</span>
						<span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{t('live.badge')}</span>
					</div>
					<div className="text-muted-foreground text-xs">
						{playgroundName}
						{distanceText ? ` · ${distanceText}` : null}
					</div>
				</div>
			</Link>
		)
	}

	if (item.type === 'soon') {
		return (
			<Link
				href={`/sports-map/${item.playground.id}`}
				className="bg-card flex items-center gap-3 rounded-lg border-l-4 border-amber-500 p-3 shadow-sm transition hover:shadow"
			>
				<div className="bg-amber-50 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg">📅</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<span>{t('soon.title', { sport: item.event.sport.label, minutes: item.startsInMin })}</span>
						<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{t('soon.badge')}</span>
					</div>
					<div className="text-muted-foreground text-xs">
						{playgroundName}
						{distanceText ? ` · ${distanceText}` : null}
					</div>
				</div>
			</Link>
		)
	}

	return (
		<Link
			href={`/sports-map/${item.playground.id}`}
			className={cn('bg-card flex items-center gap-3 rounded-lg border-l-4 border-sky-500 p-3 shadow-sm transition hover:shadow')}
		>
			<div className="bg-sky-50 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg">🔥</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<span>{playgroundName}</span>
					<span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{t('top.badge')}</span>
				</div>
				<div className="text-muted-foreground text-xs">
					{item.playground.rating.average !== null ? `★ ${item.playground.rating.average.toFixed(1)}` : '—'}
					{distanceText ? ` · ${distanceText}` : null}
				</div>
			</div>
		</Link>
	)
}

export { ActivityFeedItem }
```

- [ ] **Step 4: Add the live/soon/top i18n keys**

In `i18n/messages/uk.json`, under `activity`:

```json
"feed": {
	"live": {
		"badge": "LIVE",
		"title": "{count, plural, one {# людина грає} few {# людини грають} other {# людей грають}}",
		"distanceMeters": "{meters} м",
		"distanceKm": "{km} км"
	},
	"soon": {
		"badge": "СКОРО",
		"title": "{sport} за {minutes} хв"
	},
	"top": {
		"badge": "ТОП"
	},
	"empty": "У цьому районі поки тихо"
}
```

Mirror in EN.

- [ ] **Step 5: Run tests**

```bash
npm run test -- components/activity/ActivityFeedItem
```
Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add components/activity/ActivityFeedItem.tsx \
        components/activity/ActivityFeedItem.test.tsx \
        i18n/messages/uk.json i18n/messages/en.json
git commit -m "feat(activity): ActivityFeedItem with live/soon/top variants and distance formatting"
```

---

## Task 7: `ActivityFeed` and skeleton

**Files:**
- Create: `components/activity/ActivityFeed.tsx`
- Create: `components/activity/ActivityFeedSkeleton.tsx`

- [ ] **Step 1: Implement skeleton**

```tsx
// components/activity/ActivityFeedSkeleton.tsx
const SkeletonRow = ({ id }: { id: number }) => (
	<div key={id} className="bg-card flex items-center gap-3 rounded-lg border-l-4 border-muted p-3 shadow-sm">
		<div className="bg-muted h-9 w-9 animate-pulse rounded-lg" />
		<div className="flex-1 space-y-2">
			<div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
			<div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
		</div>
	</div>
)

const ActivityFeedSkeleton = () => (
	<div className="flex flex-col gap-2 p-4">
		{[1, 2, 3].map((id) => (
			<SkeletonRow id={id} key={id} />
		))}
	</div>
)

export { ActivityFeedSkeleton }
```

- [ ] **Step 2: Implement feed**

```tsx
// components/activity/ActivityFeed.tsx
'use client'

import { useTranslations } from 'next-intl'
import { ActivityFeedItem } from './ActivityFeedItem'
import type { FeedItem } from './activity-types'

const FEED_LIMIT = 20

const ActivityFeed = ({ items }: { items: FeedItem[] }) => {
	const t = useTranslations('activity.feed')
	if (items.length === 0) {
		return <div className="text-muted-foreground p-8 text-center text-sm">{t('empty')}</div>
	}
	const limited = items.slice(0, FEED_LIMIT)
	return (
		<div className="flex flex-col gap-2 p-4">
			{limited.map((item) => (
				<ActivityFeedItem key={`${item.type}-${item.playground.id}-${item.type === 'soon' ? item.event.id : ''}`} item={item} />
			))}
		</div>
	)
}

export { ActivityFeed }
```

- [ ] **Step 3: Commit**

```bash
git add components/activity/ActivityFeed.tsx components/activity/ActivityFeedSkeleton.tsx
git commit -m "feat(activity): ActivityFeed renderer and loading skeleton"
```

---

## Task 8: `ActivityMapPanel` — reuse SportsMap

**Files:**
- Create: `components/activity/ActivityMapPanel.tsx`

- [ ] **Step 1: Implement the wrapper**

```tsx
// components/activity/ActivityMapPanel.tsx
'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { Playground } from '@/services'
import type { MapPoint, MapPointSport } from '@/lib/overpass'

const SportsMap = dynamic(() => import('@/components/sports-map/SportsMap'), {
	ssr: false,
	loading: () => <div className="bg-muted h-full w-full" />,
})

const toMapPointSports = (playground: Playground): MapPointSport[] =>
	playground.sports.map((sport) => ({ code: sport.code, label: sport.label }))

const toMapPoint = (playground: Playground): MapPoint | null => {
	if (typeof playground.lat !== 'number' || typeof playground.lng !== 'number') return null
	const sports = toMapPointSports(playground)
	return {
		id: playground.id,
		lat: playground.lat,
		lon: playground.lng,
		name: playground.name ?? undefined,
		sports: sports.length > 0 ? sports : undefined,
		photo: playground.photos[0],
		counters: {
			activeCheckIns: playground.counters.activeCheckIns,
			upcomingEvents: playground.counters.upcomingEvents,
		},
		rating:
			playground.rating.average !== null && playground.rating.count > 0
				? { average: playground.rating.average, count: playground.rating.count }
				: undefined,
	}
}

const isMapPoint = (value: MapPoint | null): value is MapPoint => value !== null

interface Props {
	playgrounds: Playground[]
	center: [number, number]
}

const ActivityMapPanel = ({ playgrounds, center }: Props) => {
	const points = useMemo(() => playgrounds.map(toMapPoint).filter(isMapPoint), [playgrounds])
	return (
		<div className="h-[40vh] w-full md:h-[50vh]">
			<SportsMap points={points} center={center} zoom={13} />
		</div>
	)
}

export { ActivityMapPanel }
```

Note: `SportsMap` opens its own popup on marker click; clicking the popup title navigates to `/sports-map/[id]` already (see `buildDetailsHref` in `SportsMap.tsx`). The `compact` mode is for non-detail views — we keep popup mode (`compact={false}`) to give visual confirmation before navigation.

- [ ] **Step 2: Commit**

```bash
git add components/activity/ActivityMapPanel.tsx
git commit -m "feat(activity): ActivityMapPanel wrapping SportsMap with playground→MapPoint mapping"
```

---

## Task 9: `ActivityHeader` — city selector + geolocation CTA

**Files:**
- Create: `components/activity/ActivityHeader.tsx`

- [ ] **Step 1: Define cities and component**

```tsx
// components/activity/ActivityHeader.tsx
'use client'

import { MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface City {
	id: string
	name: string
	lat: number
	lng: number
}

const CITIES: City[] = [
	{ id: 'kyiv', name: 'Київ', lat: 50.4501, lng: 30.5234 },
	{ id: 'kharkiv', name: 'Харків', lat: 49.9935, lng: 36.2304 },
	{ id: 'odesa', name: 'Одеса', lat: 46.4825, lng: 30.7233 },
	{ id: 'lviv', name: 'Львів', lat: 49.8397, lng: 24.0297 },
	{ id: 'dnipro', name: 'Дніпро', lat: 48.4647, lng: 35.0462 },
]

interface Props {
	selectedCityId: string | null
	onSelectCity: (city: City) => void
	geoStatus: 'pending' | 'granted' | 'denied'
	onRequestGeo: () => void
}

const findCity = (id: string): City | undefined => CITIES.find((city) => city.id === id)

const ActivityHeader = ({ selectedCityId, onSelectCity, geoStatus, onRequestGeo }: Props) => {
	const t = useTranslations('activity.geo')
	const handleChange = (id: string) => {
		const city = findCity(id)
		if (city) onSelectCity(city)
	}
	return (
		<div className="border-b px-4 py-3 flex items-center justify-between gap-2">
			<Select value={selectedCityId ?? ''} onValueChange={handleChange}>
				<SelectTrigger className="w-[160px]">
					<MapPin className="mr-2 h-4 w-4" />
					<SelectValue placeholder={t('city')} />
				</SelectTrigger>
				<SelectContent>
					{CITIES.map((city) => (
						<SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
					))}
				</SelectContent>
			</Select>
			{geoStatus === 'denied' ? (
				<Button variant="ghost" size="sm" onClick={onRequestGeo}>
					<MapPin className="mr-1 h-4 w-4" />
					{t('denied')}
				</Button>
			) : null}
			{geoStatus === 'pending' ? (
				<span className="text-muted-foreground text-xs">{t('pending')}</span>
			) : null}
		</div>
	)
}

export { ActivityHeader, CITIES }
export type { City }
```

- [ ] **Step 2: Add i18n strings**

```json
"geo": {
	"pending": "Запитуємо геолокацію…",
	"denied": "Дозволити геолокацію",
	"city": "Місто"
}
```

EN: `"Requesting geolocation…"`, `"Allow geolocation"`, `"City"`.

- [ ] **Step 3: Commit**

```bash
git add components/activity/ActivityHeader.tsx i18n/messages/uk.json i18n/messages/en.json
git commit -m "feat(activity): ActivityHeader with city selector and geo CTA"
```

---

## Task 10: Wire it all up in the page

**Files:**
- Modify: `app/[locale]/(public-app)/activity/page.tsx`

- [ ] **Step 1: Replace the stub with full implementation**

```tsx
// app/[locale]/(public-app)/activity/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useActivityData } from '@/hooks/use-activity-data'
import { ActivityHeader, CITIES, type City } from '@/components/activity/ActivityHeader'
import { ActivityMapPanel } from '@/components/activity/ActivityMapPanel'
import { SportFilterChips } from '@/components/activity/SportFilterChips'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { ActivityFeedSkeleton } from '@/components/activity/ActivityFeedSkeleton'
import {
	playgroundsToFeedItems,
	sortFeedItems,
	filterBySport,
} from '@/components/activity/activity-feed-utils'
import type { FeedItem } from '@/components/activity/activity-types'

const KYIV = CITIES[0]

const buildSoonItems = (
	events: Awaited<ReturnType<typeof useActivityData>>['data']['upcomingEvents'],
	playgrounds: Awaited<ReturnType<typeof useActivityData>>['data']['playgrounds'],
	user: { lat: number; lng: number },
): FeedItem[] => {
	const byId = new Map(playgrounds.map((p) => [p.id, p]))
	const now = Date.now()
	const minutesUntil = (iso: string) => Math.round((new Date(iso).getTime() - now) / 60_000)
	return events.flatMap((event) => {
		const playground = byId.get(event.playgroundId)
		if (!playground) return []
		const distance =
			typeof playground.lat === 'number' && typeof playground.lng === 'number'
				? Math.round(
						Math.hypot(
							(playground.lat - user.lat) * 111_000,
							(playground.lng - user.lng) * 111_000,
						),
					)
				: null
		const item: FeedItem = {
			type: 'soon',
			playground,
			event,
			startsInMin: Math.max(0, minutesUntil(event.startAt)),
			distanceMeters: distance,
		}
		return [item]
	})
}

const ActivityPage = () => {
	const geo = useGeolocation()
	const searchParams = useSearchParams()
	const sportCode = searchParams.get('sport')

	const [overrideCity, setOverrideCity] = useState<City | null>(null)
	const effectiveLat = overrideCity?.lat ?? geo.lat
	const effectiveLng = overrideCity?.lng ?? geo.lng
	const selectedCityId =
		overrideCity?.id ?? (geo.status === 'granted' ? null : KYIV.id)

	const { data, status } = useActivityData({
		lat: effectiveLat,
		lng: effectiveLng,
		sportCode,
	})

	const feedItems: FeedItem[] = useMemo(() => {
		const playgroundItems = playgroundsToFeedItems(data.playgrounds, { lat: effectiveLat, lng: effectiveLng })
		const soonItems = buildSoonItems(data.upcomingEvents, data.playgrounds, { lat: effectiveLat, lng: effectiveLng })
		return sortFeedItems(filterBySport([...playgroundItems, ...soonItems], sportCode))
	}, [data, effectiveLat, effectiveLng, sportCode])

	const isInitialLoading = status === 'idle' || status === 'loading'

	return (
		<div className="flex h-[calc(100vh-3.5rem)] flex-col">
			<ActivityHeader
				selectedCityId={selectedCityId}
				onSelectCity={setOverrideCity}
				geoStatus={geo.status}
				onRequestGeo={geo.retry}
			/>
			<ActivityMapPanel
				playgrounds={data.playgrounds}
				center={[effectiveLat, effectiveLng]}
			/>
			<SportFilterChips />
			<div className="flex-1 overflow-y-auto">
				{isInitialLoading && data.playgrounds.length === 0 ? (
					<ActivityFeedSkeleton />
				) : (
					<ActivityFeed items={feedItems} />
				)}
			</div>
		</div>
	)
}

export default ActivityPage
```

- [ ] **Step 2: Run dev and smoke-test**

```bash
npm run dev
```

Open `http://localhost:3000/uk/activity`:
- Allow geolocation when prompted → map centers on user position
- City selector visible, switch to Харків → map re-centers and feed updates
- Sport chips appear under the map; clicking changes URL `?sport=football`
- Feed shows LIVE/TOP/SOON rows depending on backend data
- Clicking any row navigates to `/sports-map/[id]`
- Refresh the page after 60s — feed/map data refresh via polling

- [ ] **Step 3: Run full test suite**

```bash
npm run test
```
Expected: all tests pass (existing + new).

- [ ] **Step 4: Lint and format**

```bash
npm run lint
npm run format
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/\(public-app\)/activity/page.tsx
git commit -m "feat(activity): wire ActivityPage with map, chips, feed, header"
```

---

## Task 11: Empty and error states

**Files:**
- Modify: `app/[locale]/(public-app)/activity/page.tsx`
- Modify: `i18n/messages/uk.json`, `i18n/messages/en.json`

- [ ] **Step 1: Add `error.retry` translation**

```json
"activity": {
	"error": {
		"title": "Не вдалося завантажити дані",
		"retry": "Спробувати знову"
	}
}
```

EN: `"Could not load data"`, `"Try again"`.

- [ ] **Step 2: Destructure `refetch` and add `useTranslations('activity.error')`**

In `ActivityPage`, replace the existing data-hook line:

```tsx
const { data, status } = useActivityData({ lat: effectiveLat, lng: effectiveLng, sportCode })
```

with:

```tsx
const { data, status, refetch } = useActivityData({ lat: effectiveLat, lng: effectiveLng, sportCode })
const tError = useTranslations('activity.error')
```

- [ ] **Step 3: Render the error banner inside the page JSX**

Immediately after `<SportFilterChips />` and before the `<div className="flex-1 overflow-y-auto">…</div>` block, insert:

```tsx
{status === 'error' ? (
	<div className="bg-destructive/10 text-destructive flex items-center justify-between gap-2 border-b px-4 py-2 text-sm">
		<span>{tError('title')}</span>
		<button type="button" className="underline" onClick={() => refetch()}>
			{tError('retry')}
		</button>
	</div>
) : null}
```

- [ ] **Step 4: Smoke-test by killing network in DevTools and reloading**

Expected: banner appears with "Спробувати знову"; click triggers refetch.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/\(public-app\)/activity/page.tsx i18n/messages/uk.json i18n/messages/en.json
git commit -m "feat(activity): error banner with retry"
```

---

## Self-Review Checklist (for the engineer)

Before opening a PR, walk the spec section by section:

- [ ] §2 Route+access — `/[locale]/(public-app)/activity/page.tsx` exists; no auth gate
- [ ] §3 Layout — header / map / chips / feed in that order
- [ ] §4 Components — all listed components created
- [ ] §5 Map markers — note known deviation (events as badge, not separate pin)
- [ ] §6 Sortig and sport filter — both work; sport chip toggles URL `?sport=`
- [ ] §7 Card variants — live, soon, top all render
- [ ] §8 Data — playgrounds-by-bbox + per-playground upcoming events
- [ ] §9 Geolocation — pending → granted/denied; CTA retry; city override works
- [ ] §10 States — pending skeleton, empty message, error banner
- [ ] §11 i18n — `activity.*` namespace + `nav.activity`
- [ ] §12 Performance — polling 60s; ≤20 feed items rendered
- [ ] §13 Tests — geolocation, feed utils, feed item — all green via `npm run test`

If any item is unchecked, do not mark this plan done.

---

## Open Questions Discovered During Implementation

If the engineer hits any of these mid-task — pause and surface to the user:

1. **Does `sportApi.list` exist?** If not, Task 5 needs to use a different source. The existing `SportsFilter` (`components/sports-map/SportsFilter.tsx`) shows how the codebase already handles this — read it first.
2. **Does `playgroundApi.listByBbox` actually return `counters.activeCheckIns` with a 60-min window?** If the backend uses a different window, the "60 минут" definition in the spec is informational — the feed will reflect whatever window the backend returns. Either align with backend or treat the field as "currently active per backend semantics".
3. **Is there an `events nearby` endpoint?** If yes — replace the N-per-playground fetch in `useActivityData` with one call. The hook is the only place this needs to change.
