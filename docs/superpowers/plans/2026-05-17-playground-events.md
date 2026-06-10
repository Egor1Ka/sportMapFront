# Playground Events & Live Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build pickup-events + live presence on playgrounds (frontend only — backend contract is in the design spec).

**Architecture:** Next.js App Router with RSC loading initial data + client islands for interactions. No realtime — polling 60s via `router.refresh()`. State lives in component-local hooks + RSC re-fetch. Tight separation: `services/` does HTTP, `lib/events/` is pure functions, `hooks/` holds React state, `components/{events,presence}/` are UI.

**Tech Stack:** Next.js 16 + React 19 + RSC, TypeScript (strict), Tailwind 4, shadcn/ui (base-nova), `@base-ui/react`, `react-hook-form` + `zod`, `sonner`, `next-intl`, `date-fns`, `lucide-react`. New: `vitest` + `@testing-library/react` + `jsdom` (Task 0.1).

**Spec:** [docs/superpowers/specs/2026-05-17-playground-events-design.md](../specs/2026-05-17-playground-events-design.md). The plan implements it section-by-section.

**Critical mapping:** in this codebase, the URL slug for a playground is `/sports-map/[id]`, **not** `/playground/[id]`. The spec's "playground page" maps to `app/[locale]/(public-app)/sports-map/[id]/page.tsx`. Routing for the event detail page is new: `app/[locale]/(app)/events/[id]/page.tsx`.

**Backend prerequisite:** all endpoints in spec §3 must be implemented in the backend repo (`/Users/egorzozula/Desktop/backendTemplate /src/`). Frontend can scaffold against mocked responses, but visual smoke testing requires the backend.

**Commit policy:** the user (Egor) has a memory rule «No autonomous commits». Every step labeled "Commit" pauses for explicit "закоммить / commit" from the user before running `git commit`. The implementing agent **must not** commit without that confirmation.

---

## Phase 0 — Setup

### Task 0.1: Install Vitest + Testing Library

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Install deps**

Run:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Add test scripts to package.json**

Edit `package.json` `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Smoke test — create `vitest.smoke.test.ts` at repo root and verify**

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: 1 test passing.

- [ ] **Step 6: Remove smoke file**

Delete `vitest.smoke.test.ts`.

- [ ] **Step 7: Wait for explicit commit approval, then commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "chore: add vitest + RTL setup"
```

### Task 0.2: Add `pulse-presence` keyframe to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append keyframe at end of file**

```css
@keyframes pulse-presence {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.6;
  }
}

.animate-pulse-presence {
  animation: pulse-presence 1.5s ease-in-out infinite;
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build` (background OK)
Expected: build succeeds.

- [ ] **Step 3: Wait for commit approval**

```bash
git add app/globals.css
git commit -m "feat(styles): add presence pulse keyframe"
```

---

## Phase 1 — Foundation: pure lib + hooks + i18n

### Task 1.1: `lib/events/event-validators.ts` (TDD)

Pure validation helpers used both by zod schemas and runtime UI checks.

**Files:**
- Create: `lib/events/event-validators.ts`
- Create: `lib/events/event-validators.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { isWithin48hFuture, isStartInPast } from './event-validators'

describe('isWithin48hFuture', () => {
  const now = new Date('2026-05-17T10:00:00.000Z')

  it('returns true for time 1 hour ahead', () => {
    expect(isWithin48hFuture(new Date('2026-05-17T11:00:00.000Z'), now)).toBe(true)
  })

  it('returns true for time 47:59 ahead', () => {
    expect(isWithin48hFuture(new Date('2026-05-19T09:59:00.000Z'), now)).toBe(true)
  })

  it('returns false for time 48:01 ahead', () => {
    expect(isWithin48hFuture(new Date('2026-05-19T10:01:00.000Z'), now)).toBe(false)
  })

  it('returns false for time in the past', () => {
    expect(isWithin48hFuture(new Date('2026-05-17T09:00:00.000Z'), now)).toBe(false)
  })

  it('returns false for time less than 5 minutes ahead', () => {
    expect(isWithin48hFuture(new Date('2026-05-17T10:04:00.000Z'), now)).toBe(false)
  })

  it('returns true for time exactly 5 minutes ahead', () => {
    expect(isWithin48hFuture(new Date('2026-05-17T10:05:00.000Z'), now)).toBe(true)
  })
})

describe('isStartInPast', () => {
  const now = new Date('2026-05-17T10:00:00.000Z')

  it('returns true if 1ms in the past', () => {
    expect(isStartInPast(new Date('2026-05-17T09:59:59.999Z'), now)).toBe(true)
  })

  it('returns false if 1ms in the future', () => {
    expect(isStartInPast(new Date('2026-05-17T10:00:00.001Z'), now)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- lib/events/event-validators`
Expected: tests fail with module not found.

- [ ] **Step 3: Implement**

```ts
const MIN_LEAD_MS = 5 * 60 * 1000
const MAX_WINDOW_MS = 48 * 60 * 60 * 1000

const isWithin48hFuture = (start: Date, now: Date = new Date()): boolean => {
  const diff = start.getTime() - now.getTime()
  return diff >= MIN_LEAD_MS && diff <= MAX_WINDOW_MS
}

const isStartInPast = (start: Date, now: Date = new Date()): boolean =>
  start.getTime() < now.getTime()

export { isWithin48hFuture, isStartInPast }
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- lib/events/event-validators`
Expected: all green.

- [ ] **Step 5: Wait for commit approval**

```bash
git add lib/events/event-validators.ts lib/events/event-validators.test.ts
git commit -m "feat(lib/events): add event time validators with tests"
```

### Task 1.2: `lib/events/format-event-time.ts` (TDD)

**Files:**
- Create: `lib/events/format-event-time.ts`
- Create: `lib/events/format-event-time.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { formatEventTime, formatDuration } from './format-event-time'

describe('formatDuration', () => {
  it('formats 60 min as "1ч"', () => {
    expect(formatDuration(60, 'ru')).toBe('1ч')
  })
  it('formats 90 min as "1ч 30м"', () => {
    expect(formatDuration(90, 'ru')).toBe('1ч 30м')
  })
  it('formats 30 min as "30м"', () => {
    expect(formatDuration(30, 'ru')).toBe('30м')
  })
  it('formats 180 min as "3ч"', () => {
    expect(formatDuration(180, 'ru')).toBe('3ч')
  })
})

describe('formatEventTime', () => {
  it('returns HH:MM in 24h format', () => {
    const start = new Date('2026-05-17T15:30:00.000Z')
    const result = formatEventTime(start, { locale: 'ru', timeZone: 'UTC' })
    expect(result).toBe('15:30')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- lib/events/format-event-time`
Expected: fail.

- [ ] **Step 3: Implement using date-fns**

```ts
import { format } from 'date-fns'

interface FormatTimeOptions {
  locale: string
  timeZone?: string
}

const formatEventTime = (start: Date, options: FormatTimeOptions): string => {
  const formatter = new Intl.DateTimeFormat(options.locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: options.timeZone,
  })
  return formatter.format(start)
}

const formatDuration = (minutes: number, _locale: string): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}м`
  if (mins === 0) return `${hours}ч`
  return `${hours}ч ${mins}м`
}

export { formatEventTime, formatDuration }
export type { FormatTimeOptions }
```

- [ ] **Step 4: Run tests**

Run: `npm test -- lib/events/format-event-time`
Expected: green.

- [ ] **Step 5: Wait for commit approval**

```bash
git add lib/events/format-event-time.ts lib/events/format-event-time.test.ts
git commit -m "feat(lib/events): add formatEventTime + formatDuration"
```

### Task 1.3: `lib/events/group-events-by-day.ts` (TDD)

**Files:**
- Create: `lib/events/group-events-by-day.ts`
- Create: `lib/events/group-events-by-day.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { groupEventsByDay } from './group-events-by-day'

const makeEvent = (id: string, startAt: string) =>
  ({ id, startAt }) as { id: string; startAt: string }

describe('groupEventsByDay', () => {
  const now = new Date('2026-05-17T10:00:00.000Z')

  it('groups events into today and tomorrow', () => {
    const events = [
      makeEvent('a', '2026-05-17T18:00:00.000Z'),
      makeEvent('b', '2026-05-18T12:00:00.000Z'),
      makeEvent('c', '2026-05-17T20:00:00.000Z'),
    ]
    const result = groupEventsByDay(events, now)
    expect(result.today.map((e) => e.id)).toEqual(['a', 'c'])
    expect(result.tomorrow.map((e) => e.id)).toEqual(['b'])
  })

  it('sorts each bucket by startAt ascending', () => {
    const events = [
      makeEvent('late', '2026-05-17T22:00:00.000Z'),
      makeEvent('early', '2026-05-17T08:00:00.000Z'),
    ]
    const result = groupEventsByDay(events, now)
    expect(result.today.map((e) => e.id)).toEqual(['early', 'late'])
  })

  it('returns empty arrays when no events match', () => {
    const result = groupEventsByDay([], now)
    expect(result.today).toEqual([])
    expect(result.tomorrow).toEqual([])
  })

  it('ignores events outside today/tomorrow', () => {
    const events = [makeEvent('far', '2026-05-19T10:00:00.000Z')]
    const result = groupEventsByDay(events, now)
    expect(result.today).toEqual([])
    expect(result.tomorrow).toEqual([])
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- lib/events/group-events-by-day`
Expected: fail.

- [ ] **Step 3: Implement**

```ts
import { isSameDay, addDays, startOfDay } from 'date-fns'

interface MinimalEvent {
  startAt: string
}

interface GroupedEvents<E extends MinimalEvent> {
  today: E[]
  tomorrow: E[]
}

const sortByStart = <E extends MinimalEvent>(a: E, b: E) =>
  new Date(a.startAt).getTime() - new Date(b.startAt).getTime()

const groupEventsByDay = <E extends MinimalEvent>(
  events: E[],
  now: Date = new Date()
): GroupedEvents<E> => {
  const todayStart = startOfDay(now)
  const tomorrowStart = startOfDay(addDays(now, 1))

  const today = events
    .filter((event) => isSameDay(new Date(event.startAt), todayStart))
    .slice()
    .sort(sortByStart)

  const tomorrow = events
    .filter((event) => isSameDay(new Date(event.startAt), tomorrowStart))
    .slice()
    .sort(sortByStart)

  return { today, tomorrow }
}

export { groupEventsByDay }
export type { GroupedEvents }
```

- [ ] **Step 4: Run tests**

Run: `npm test -- lib/events/group-events-by-day`
Expected: green.

- [ ] **Step 5: Wait for commit approval**

```bash
git add lib/events/group-events-by-day.ts lib/events/group-events-by-day.test.ts
git commit -m "feat(lib/events): add groupEventsByDay"
```

### Task 1.4: `hooks/use-now-clock.ts`

Ticking clock for live displays. Returns `Date` that updates every `intervalMs`.

**Files:**
- Create: `hooks/use-now-clock.ts`

- [ ] **Step 1: Implement**

```ts
'use client'

import { useEffect, useState } from 'react'

const useNowClock = (intervalMs: number = 30_000): Date => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}

export { useNowClock }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add hooks/use-now-clock.ts
git commit -m "feat(hooks): add useNowClock"
```

### Task 1.5: `hooks/use-relative-time.ts`

Returns localized «начнётся через X / Идёт сейчас / Завершено» string for a given startAt + duration.

**Files:**
- Create: `hooks/use-relative-time.ts`

- [ ] **Step 1: Implement**

```ts
'use client'

import { useTranslations } from 'next-intl'
import { useNowClock } from './use-now-clock'

interface UseRelativeTimeInput {
  startAt: string
  durationMin: number
}

interface RelativeTimeResult {
  phase: 'upcoming' | 'happening' | 'finished'
  label: string
}

const minutesBetween = (later: Date, earlier: Date): number =>
  Math.round((later.getTime() - earlier.getTime()) / 60_000)

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}м`
  if (mins === 0) return `${hours}ч`
  return `${hours}ч ${mins}м`
}

const useRelativeTime = ({ startAt, durationMin }: UseRelativeTimeInput): RelativeTimeResult => {
  const start = new Date(startAt)
  const minutesToStart = minutesBetween(start, new Date())
  const fastTick = minutesToStart <= 60 && minutesToStart > -durationMin
  const now = useNowClock(fastTick ? 30_000 : 60_000)
  const t = useTranslations('events')

  const minutesUntilStart = minutesBetween(start, now)
  const minutesUntilEnd = minutesUntilStart + durationMin

  if (minutesUntilEnd <= 0) {
    return { phase: 'finished', label: t('finished') }
  }
  if (minutesUntilStart <= 0) {
    const endTime = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(start.getTime() + durationMin * 60_000))
    return { phase: 'happening', label: t('happening', { endTime }) }
  }
  return {
    phase: 'upcoming',
    label: t('startsIn', { value: formatMinutes(minutesUntilStart) }),
  }
}

export { useRelativeTime }
export type { RelativeTimeResult }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add hooks/use-relative-time.ts
git commit -m "feat(hooks): add useRelativeTime"
```

### Task 1.6: `hooks/use-event-create-dialog.ts`

Controls open state of the create-event Sheet/Dialog, optionally synced to `?create=1` URL param so a deep link can open it.

**Files:**
- Create: `hooks/use-event-create-dialog.ts`

- [ ] **Step 1: Implement**

```ts
'use client'

import { useCallback, useState } from 'react'

interface EventCreateDialogState {
  isOpen: boolean
  open: () => void
  close: () => void
  setOpen: (next: boolean) => void
}

const useEventCreateDialog = (): EventCreateDialogState => {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  return { isOpen, open, close, setOpen: setIsOpen }
}

export { useEventCreateDialog }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add hooks/use-event-create-dialog.ts
git commit -m "feat(hooks): add useEventCreateDialog"
```

### Task 1.7: i18n keys — `events.*` and `presence.*`

**Files:**
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Add `events` block to `en.json` (merge with existing root object)**

```json
"events": {
  "today": "Today",
  "tomorrow": "Tomorrow",
  "rsvpGoing": "I'm in",
  "rsvpYouAreGoing": "✓ You're going",
  "rsvpFull": "Full",
  "createTitle": "Create event",
  "createCta": "Create event",
  "edit": "Edit",
  "cancel": "Cancel event",
  "cancelConfirm": "Cancel this event?",
  "cancelConfirmDescription": "Everyone who joined will see it was cancelled.",
  "save": "Save",
  "saving": "Saving…",
  "shareCopied": "Link copied",
  "back": "Back",
  "fields": {
    "sport": "Sport",
    "when": "When",
    "duration": "Duration",
    "limit": "Participant limit",
    "limitOff": "No limit",
    "description": "Description",
    "descriptionPlaceholder": "e.g. 3-on-3 streetball, bring a ball"
  },
  "day": { "today": "Today", "tomorrow": "Tomorrow" },
  "duration": { "30m": "30 min", "1h": "1h", "1h30m": "1h 30m", "2h": "2h", "3h": "3h" },
  "startsIn": "starts in {value}",
  "happening": "Happening now · ends at {endTime}",
  "finished": "Finished",
  "cancelled": "Cancelled by organizer",
  "creator": "Organizer",
  "participants": "{count} going",
  "participantsLimited": "{count}/{max} going",
  "freeSpots": "{count} spots left",
  "emptyTitle": "No events yet",
  "emptySubtitle": "Be the first to start a game",
  "loginToCreate": "Log in to create",
  "loginToJoin": "Log in to join",
  "errors": {
    "eventFull": "Event is full",
    "eventNotActive": "Event is not active",
    "eventTimeOutOfWindow": "Time must be within the next 48 hours",
    "timeInPast": "Time already passed, pick a later slot"
  }
}
```

- [ ] **Step 2: Add `presence` block to `en.json`**

```json
"presence": {
  "title": "{count, plural, =0 {No one is here right now} one {# person is on the spot} other {# people are on the spot}}",
  "checkInCta": "I'm on the spot",
  "checkOutCta": "I left",
  "youArePresent": "✓ You're here until {time}",
  "loginToCheckIn": "Log in to check in",
  "extended": "Stay extended until {time}"
}
```

- [ ] **Step 3: Add same `events` block to `uk.json` translated to Ukrainian**

```json
"events": {
  "today": "Сьогодні",
  "tomorrow": "Завтра",
  "rsvpGoing": "Я іду",
  "rsvpYouAreGoing": "✓ Ти йдеш",
  "rsvpFull": "Заповнено",
  "createTitle": "Створити подію",
  "createCta": "Створити подію",
  "edit": "Редагувати",
  "cancel": "Скасувати подію",
  "cancelConfirm": "Скасувати цю подію?",
  "cancelConfirmDescription": "Усі, хто приєднався, побачать, що її скасовано.",
  "save": "Зберегти",
  "saving": "Збереження…",
  "shareCopied": "Посилання скопійовано",
  "back": "Назад",
  "fields": {
    "sport": "Спорт",
    "when": "Коли",
    "duration": "Тривалість",
    "limit": "Ліміт учасників",
    "limitOff": "Без ліміту",
    "description": "Опис",
    "descriptionPlaceholder": "Напр.: «Стрітбол 3х3, потрібен м'яч»"
  },
  "day": { "today": "Сьогодні", "tomorrow": "Завтра" },
  "duration": { "30m": "30 хв", "1h": "1 год", "1h30m": "1 год 30 хв", "2h": "2 год", "3h": "3 год" },
  "startsIn": "почнеться через {value}",
  "happening": "Триває · завершиться о {endTime}",
  "finished": "Завершено",
  "cancelled": "Скасовано організатором",
  "creator": "Організатор",
  "participants": "{count} ідуть",
  "participantsLimited": "{count}/{max} ідуть",
  "freeSpots": "Вільно {count} місць",
  "emptyTitle": "Подій ще немає",
  "emptySubtitle": "Стань першим, хто збере гру",
  "loginToCreate": "Увійти, щоб створити",
  "loginToJoin": "Увійти, щоб приєднатися",
  "errors": {
    "eventFull": "Подія заповнена",
    "eventNotActive": "Подія не активна",
    "eventTimeOutOfWindow": "Час має бути в межах 48 годин",
    "timeInPast": "Час уже минув, обери пізніший слот"
  }
}
```

- [ ] **Step 4: Add same `presence` block to `uk.json`**

```json
"presence": {
  "title": "{count, plural, =0 {Зараз тут нікого немає} one {# людина зараз на майданчику} few {# людини зараз на майданчику} other {# людей зараз на майданчику}}",
  "checkInCta": "Я на майданчику",
  "checkOutCta": "Я пішов",
  "youArePresent": "✓ Ти тут до {time}",
  "loginToCheckIn": "Увійти, щоб відмітитися",
  "extended": "Продовжено до {time}"
}
```

- [ ] **Step 5: Verify `npm run build` still passes** (catches malformed JSON)

Run: `npm run build` (background OK)
Expected: build succeeds.

- [ ] **Step 6: Wait for commit approval**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "i18n: add events and presence keys"
```

---

## Phase 2 — Services layer

### Task 2.1: `services/configs/event.types.ts`

**Files:**
- Create: `services/configs/event.types.ts`

- [ ] **Step 1: Write the types**

```ts
import type { PlaygroundSport } from './playground.config'

interface EventCreator {
  id: string
  name: string
  avatar: string | null
}

interface PlaygroundEvent {
  id: string
  playgroundId: string
  sport: PlaygroundSport
  creator: EventCreator
  startAt: string
  durationMin: number
  description: string | null
  maxParticipants: number | null
  rsvpCount: number
  isFull: boolean
  status: 'active' | 'cancelled' | 'finished'
  createdAt: string
  viewer?: { isRsvped: boolean }
}

interface EventListResponse {
  items: PlaygroundEvent[]
  total: number
}

interface CreateEventBody {
  sportId: string
  startAt: string
  durationMin?: number
  description?: string | null
  maxParticipants?: number | null
}

interface UpdateEventBody {
  sportId?: string
  startAt?: string
  durationMin?: number
  description?: string | null
  maxParticipants?: number | null
}

interface EventRsvpResponse {
  rsvpCount: number
  isFull: boolean
  viewer: { isRsvped: boolean }
}

export type {
  EventCreator,
  PlaygroundEvent,
  EventListResponse,
  CreateEventBody,
  UpdateEventBody,
  EventRsvpResponse,
}
```

> The type is named `PlaygroundEvent`, not `Event`, to avoid colliding with the DOM `Event` global.

- [ ] **Step 2: Wait for commit approval**

```bash
git add services/configs/event.types.ts
git commit -m "feat(services): add event types"
```

### Task 2.2: `services/configs/event.config.ts`

**Files:**
- Create: `services/configs/event.config.ts`

- [ ] **Step 1: Write the config**

```ts
import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
  PlaygroundEvent,
  EventListResponse,
  CreateEventBody,
  UpdateEventBody,
  EventRsvpResponse,
} from './event.types'

const eventApiConfig = {
  listByPlayground: endpoint<void, EventListResponse>({
    url: ({ playgroundId }) => `/api/playgrounds/${playgroundId}/events`,
    method: getData,
    defaultErrorMessage: 'Failed to load events',
  }),

  getById: endpoint<void, PlaygroundEvent>({
    url: ({ id }) => `/api/events/${id}`,
    method: getData,
    defaultErrorMessage: 'Failed to load event',
  }),

  create: endpoint<CreateEventBody, PlaygroundEvent>({
    url: ({ playgroundId }) => `/api/playgrounds/${playgroundId}/events`,
    method: postData,
    defaultErrorMessage: 'Failed to create event',
  }),

  update: endpoint<UpdateEventBody, PlaygroundEvent>({
    url: ({ id }) => `/api/events/${id}`,
    method: patchData,
    defaultErrorMessage: 'Failed to update event',
  }),

  cancel: endpoint<void, PlaygroundEvent>({
    url: ({ id }) => `/api/events/${id}/cancel`,
    method: postData,
    defaultErrorMessage: 'Failed to cancel event',
  }),

  rsvp: endpoint<void, EventRsvpResponse>({
    url: ({ id }) => `/api/events/${id}/rsvp`,
    method: postData,
    defaultErrorMessage: 'Failed to RSVP',
  }),

  unrsvp: endpoint<void, EventRsvpResponse>({
    url: ({ id }) => `/api/events/${id}/rsvp`,
    method: deleteData,
    defaultErrorMessage: 'Failed to cancel RSVP',
  }),
}

export default eventApiConfig
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add services/configs/event.config.ts
git commit -m "feat(services): add event endpoints config"
```

### Task 2.3: `services/configs/check-in.types.ts` + `check-in.config.ts`

**Files:**
- Create: `services/configs/check-in.types.ts`
- Create: `services/configs/check-in.config.ts`

- [ ] **Step 1: Types**

```ts
interface CheckInViewer {
  isCheckedIn: boolean
  expiresAt: string | null
}

interface CheckInResponse {
  playgroundId: string
  activeCount: number
  viewer: CheckInViewer
}

export type { CheckInViewer, CheckInResponse }
```

- [ ] **Step 2: Config**

```ts
import { postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { CheckInResponse } from './check-in.types'

const checkInApiConfig = {
  checkIn: endpoint<void, CheckInResponse>({
    url: ({ playgroundId }) => `/api/playgrounds/${playgroundId}/check-in`,
    method: postData,
    defaultErrorMessage: 'Failed to check in',
  }),

  checkOut: endpoint<void, CheckInResponse>({
    url: ({ playgroundId }) => `/api/playgrounds/${playgroundId}/check-in`,
    method: deleteData,
    defaultErrorMessage: 'Failed to check out',
  }),
}

export default checkInApiConfig
```

- [ ] **Step 3: Wait for commit approval**

```bash
git add services/configs/check-in.types.ts services/configs/check-in.config.ts
git commit -m "feat(services): add check-in endpoints config"
```

### Task 2.4: Extend `playground.config.ts` with `counters` and `viewer`

**Files:**
- Modify: `services/configs/playground.config.ts`

- [ ] **Step 1: Add new interfaces in the same file**

In `services/configs/playground.config.ts`, after the existing `Playground` interface, add:

```ts
interface PlaygroundCounters {
  activeCheckIns: number
  upcomingEvents: number
}

interface PlaygroundViewer {
  isCheckedInHere: boolean
}
```

- [ ] **Step 2: Add fields to `Playground`**

Modify the `Playground` interface to include:

```ts
counters: PlaygroundCounters
viewer?: PlaygroundViewer
```

- [ ] **Step 3: Update bottom `export type`**

Add `PlaygroundCounters` and `PlaygroundViewer` to the exported type list.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Wait for commit approval**

```bash
git add services/configs/playground.config.ts
git commit -m "feat(services): expose playground counters and viewer"
```

### Task 2.5: Wire up `eventApi` and `checkInApi` in `services/index.ts`

**Files:**
- Modify: `services/index.ts`

- [ ] **Step 1: Inspect current `services/index.ts`**

Read it to understand the existing pattern (interceptor wiring, exports).

- [ ] **Step 2: Add new exports**

```ts
import { createApiMethods } from './api/create-api-methods'
import eventApiConfig from './configs/event.config'
import checkInApiConfig from './configs/check-in.config'

// Follow the existing interceptor wiring pattern used by userApi/playgroundApi.

export const eventApi = createApiMethods(eventApiConfig, {
  interceptors: { /* same as playgroundApi */ },
})

export const checkInApi = createApiMethods(checkInApiConfig, {
  interceptors: { /* same as playgroundApi */ },
})
```

The exact interceptor list must match the existing pattern (auth-refresh + toast). Copy from how `playgroundApi` is wired.

- [ ] **Step 3: Re-export types**

```ts
export type {
  PlaygroundEvent,
  EventCreator,
  EventListResponse,
  CreateEventBody,
  UpdateEventBody,
  EventRsvpResponse,
} from './configs/event.types'

export type { CheckInViewer, CheckInResponse } from './configs/check-in.types'
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Wait for commit approval**

```bash
git add services/index.ts
git commit -m "feat(services): wire eventApi and checkInApi"
```

---

## Phase 3 — Presence components

### Task 3.1: `components/presence/presence-pulse.tsx`

Animated indicator dot. Renders a green ring + pulsing inner dot when `active`.

**Files:**
- Create: `components/presence/presence-pulse.tsx`

- [ ] **Step 1: Implement**

```tsx
import { cn } from '@/lib/utils'

interface PresencePulseProps {
  active: boolean
  className?: string
}

function PresencePulse({ active, className }: PresencePulseProps) {
  return (
    <span
      data-slot="presence-pulse"
      data-active={active || undefined}
      className={cn('relative inline-flex h-3 w-3 items-center justify-center', className)}
    >
      <span
        className={cn(
          'absolute inline-flex h-3 w-3 rounded-full',
          active ? 'bg-emerald-500/60 animate-pulse-presence' : 'bg-muted'
        )}
      />
      <span
        className={cn(
          'relative inline-flex h-2 w-2 rounded-full',
          active ? 'bg-emerald-500' : 'bg-muted-foreground'
        )}
      />
    </span>
  )
}

export { PresencePulse }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/presence/presence-pulse.tsx
git commit -m "feat(presence): add PresencePulse component"
```

### Task 3.2: `components/presence/presence-indicator.tsx`

Compact pill with pulse + count, used on map markers and small headers.

**Files:**
- Create: `components/presence/presence-indicator.tsx`

- [ ] **Step 1: Implement**

```tsx
import { cn } from '@/lib/utils'
import { PresencePulse } from './presence-pulse'

interface PresenceIndicatorProps {
  count: number
  className?: string
}

function PresenceIndicator({ count, className }: PresenceIndicatorProps) {
  return (
    <span
      data-slot="presence-indicator"
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400',
        className
      )}
    >
      <PresencePulse active={count > 0} />
      {count}
    </span>
  )
}

export { PresenceIndicator }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/presence/presence-indicator.tsx
git commit -m "feat(presence): add PresenceIndicator"
```

### Task 3.3: `components/presence/presence-check-in-button.tsx`

Self-contained button with all states: anon → login, not-checked-in → CTA, checked-in → extend/leave.

**Files:**
- Create: `components/presence/presence-check-in-button.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { checkInApi, ApiError } from '@/services'
import { useUserOptional } from '@/lib/auth/user-provider'
import type { CheckInViewer } from '@/services'

interface PresenceCheckInButtonProps {
  playgroundId: string
  viewer: CheckInViewer | null
  onChange?: (next: CheckInViewer) => void
}

const formatExpires = (iso: string): string =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

function PresenceCheckInButton({ playgroundId, viewer, onChange }: PresenceCheckInButtonProps) {
  const user = useUserOptional()
  const t = useTranslations('presence')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  if (!user) {
    return (
      <Button
        variant="default"
        onClick={() => router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)}
      >
        {t('loginToCheckIn')}
      </Button>
    )
  }

  const handleCheckIn = async () => {
    setBusy(true)
    try {
      const result = await checkInApi.checkIn({ pathParams: { playgroundId } })
      onChange?.(result.viewer)
      startTransition(() => router.refresh())
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
    } finally {
      setBusy(false)
    }
  }

  const handleCheckOut = async () => {
    setBusy(true)
    try {
      const result = await checkInApi.checkOut({ pathParams: { playgroundId } })
      onChange?.(result.viewer)
      startTransition(() => router.refresh())
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
    } finally {
      setBusy(false)
    }
  }

  if (viewer?.isCheckedIn && viewer.expiresAt) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" onClick={handleCheckIn} disabled={busy || isPending}>
          {t('youArePresent', { time: formatExpires(viewer.expiresAt) })}
        </Button>
        <Button variant="outline" onClick={handleCheckOut} disabled={busy || isPending}>
          {t('checkOutCta')}
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={handleCheckIn} disabled={busy || isPending}>
      {t('checkInCta')}
    </Button>
  )
}

export { PresenceCheckInButton }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/presence/presence-check-in-button.tsx
git commit -m "feat(presence): add PresenceCheckInButton"
```

### Task 3.4: `components/presence/presence-card.tsx`

The big card on the playground page.

**Files:**
- Create: `components/presence/presence-card.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { PresencePulse } from './presence-pulse'
import { PresenceCheckInButton } from './presence-check-in-button'
import type { CheckInViewer } from '@/services'

interface PresenceCardProps {
  playgroundId: string
  initialActiveCount: number
  initialViewer: CheckInViewer | null
}

function PresenceCard({ playgroundId, initialActiveCount, initialViewer }: PresenceCardProps) {
  const t = useTranslations('presence')
  const [viewer, setViewer] = useState<CheckInViewer | null>(initialViewer)

  return (
    <Card data-slot="presence-card">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <PresencePulse active={initialActiveCount > 0} />
          <p className="text-2xl font-semibold">{t('title', { count: initialActiveCount })}</p>
        </div>
        <PresenceCheckInButton
          playgroundId={playgroundId}
          viewer={viewer}
          onChange={setViewer}
        />
      </CardContent>
    </Card>
  )
}

export { PresenceCard }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/presence/presence-card.tsx
git commit -m "feat(presence): add PresenceCard"
```

---

## Phase 4 — Event sub-components

### Task 4.1: `components/events/event-time-display.tsx`

**Files:**
- Create: `components/events/event-time-display.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRelativeTime } from '@/hooks/use-relative-time'
import { cn } from '@/lib/utils'

interface EventTimeDisplayProps {
  startAt: string
  durationMin: number
  className?: string
}

function EventTimeDisplay({ startAt, durationMin, className }: EventTimeDisplayProps) {
  const _t = useTranslations('events')
  const { phase, label } = useRelativeTime({ startAt, durationMin })

  return (
    <span
      data-slot="event-time-display"
      data-phase={phase}
      className={cn('text-sm text-muted-foreground', className)}
    >
      {label}
    </span>
  )
}

export { EventTimeDisplay }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/events/event-time-display.tsx
git commit -m "feat(events): add EventTimeDisplay"
```

### Task 4.2: `components/events/event-rsvp-button.tsx`

Behaviorally rich: handles unauth, not-going, going, full, and 409 rollback. Optimistic by default.

**Files:**
- Create: `components/events/event-rsvp-button.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { eventApi, ApiError } from '@/services'
import { useUserOptional } from '@/lib/auth/user-provider'
import type { PlaygroundEvent, EventRsvpResponse } from '@/services'

interface EventRsvpButtonProps {
  event: PlaygroundEvent
  size?: 'sm' | 'default' | 'lg'
  className?: string
  onChange?: (next: EventRsvpResponse) => void
}

function EventRsvpButton({ event, size = 'default', className, onChange }: EventRsvpButtonProps) {
  const t = useTranslations('events')
  const user = useUserOptional()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [isRsvped, setIsRsvped] = useState(event.viewer?.isRsvped ?? false)
  const [isFull, setIsFull] = useState(event.isFull)

  if (event.status !== 'active') {
    return null
  }

  if (!user) {
    return (
      <Button
        size={size}
        className={className}
        onClick={() =>
          router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
        }
      >
        {t('loginToJoin')}
      </Button>
    )
  }

  const handleClick = async (event_: React.MouseEvent) => {
    event_.stopPropagation()
    event_.preventDefault()
    setBusy(true)
    const next = !isRsvped
    setIsRsvped(next)
    try {
      const result = next
        ? await eventApi.rsvp({ pathParams: { id: event.id } })
        : await eventApi.unrsvp({ pathParams: { id: event.id } })
      setIsFull(result.isFull)
      onChange?.(result)
      startTransition(() => router.refresh())
    } catch (err) {
      setIsRsvped(!next)
      if (err instanceof ApiError && err.statusMessage === 'eventFull') {
        setIsFull(true)
      } else if (!(err instanceof ApiError)) {
        throw err
      }
    } finally {
      setBusy(false)
    }
  }

  if (isFull && !isRsvped) {
    return (
      <Button size={size} variant="outline" disabled className={className}>
        {t('rsvpFull')}
      </Button>
    )
  }

  return (
    <Button
      size={size}
      variant={isRsvped ? 'secondary' : 'default'}
      disabled={busy || isPending}
      onClick={handleClick}
      className={className}
    >
      {isRsvped ? t('rsvpYouAreGoing') : t('rsvpGoing')}
    </Button>
  )
}

export { EventRsvpButton }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/events/event-rsvp-button.tsx
git commit -m "feat(events): add EventRsvpButton"
```

### Task 4.3: `components/events/event-status-banner.tsx`

**Files:**
- Create: `components/events/event-status-banner.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PlaygroundEvent } from '@/services'

interface EventStatusBannerProps {
  status: PlaygroundEvent['status']
}

function EventStatusBanner({ status }: EventStatusBannerProps) {
  const t = useTranslations('events')

  if (status === 'cancelled') {
    return (
      <Alert variant="destructive" data-slot="event-status-banner">
        <AlertDescription>{t('cancelled')}</AlertDescription>
      </Alert>
    )
  }
  if (status === 'finished') {
    return (
      <Alert data-slot="event-status-banner">
        <AlertDescription>{t('finished')}</AlertDescription>
      </Alert>
    )
  }
  return null
}

export { EventStatusBanner }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/events/event-status-banner.tsx
git commit -m "feat(events): add EventStatusBanner"
```

### Task 4.4: `components/events/event-menu.tsx`

Creator-only meatball menu.

**Files:**
- Create: `components/events/event-menu.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MoreHorizontal, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { eventApi, ApiError } from '@/services'
import type { PlaygroundEvent } from '@/services'

interface EventMenuProps {
  event: PlaygroundEvent
  onEdit: () => void
  onCancelled: (updated: PlaygroundEvent) => void
}

function EventMenu({ event, onEdit, onCancelled }: EventMenuProps) {
  const t = useTranslations('events')
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleCancel = async () => {
    setBusy(true)
    try {
      const updated = await eventApi.cancel({ pathParams: { id: event.id } })
      onCancelled(updated)
      router.refresh()
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
    } finally {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menu">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 size-4" /> {t('edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} variant="destructive">
            <X className="mr-2 size-4" /> {t('cancel')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cancelConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('back')}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleCancel}>
              {t('cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { EventMenu }
```

> **Note:** `dropdown-menu.tsx` ships with shadcn components in this repo. If not, install via `npx shadcn@latest add dropdown-menu`.

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/events/event-menu.tsx
git commit -m "feat(events): add EventMenu"
```

---

## Phase 5 — Event form (create + edit)

### Task 5.1: `components/events/event-form.tsx`

Shared inner form. Wraps RHF + zod. Caller provides `defaultValues` and `onSubmit`.

**Files:**
- Create: `components/events/event-form.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { addMinutes, startOfDay, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { isStartInPast } from '@/lib/events/event-validators'
import type { Sport } from '@/services/configs/sport.config'

const schema = z.object({
  sportId: z.string().min(1, 'required'),
  day: z.enum(['today', 'tomorrow']),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().int().min(15).max(480),
  hasLimit: z.boolean(),
  maxParticipants: z.number().int().min(2).max(100).nullable(),
  description: z
    .string()
    .max(280)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
})

type EventFormValues = z.infer<typeof schema>

interface EventFormProps {
  sports: Sport[]
  defaultValues: Partial<EventFormValues>
  isSubmitting: boolean
  submitLabel: string
  onSubmit: (values: {
    sportId: string
    startAt: string
    durationMin: number
    maxParticipants: number | null
    description: string | null
  }) => Promise<void>
}

const DURATION_PRESETS = [30, 60, 90, 120, 180]

const combineDayTime = (day: 'today' | 'tomorrow', time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number)
  const base = day === 'today' ? new Date() : addDays(new Date(), 1)
  const local = startOfDay(base)
  return addMinutes(local, hours * 60 + minutes)
}

function EventForm({ sports, defaultValues, isSubmitting, submitLabel, onSubmit }: EventFormProps) {
  const t = useTranslations('events')

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sportId: defaultValues.sportId ?? '',
      day: defaultValues.day ?? 'today',
      time: defaultValues.time ?? '',
      durationMin: defaultValues.durationMin ?? 60,
      hasLimit: defaultValues.hasLimit ?? false,
      maxParticipants: defaultValues.maxParticipants ?? null,
      description: defaultValues.description ?? null,
    },
  })

  const hasLimit = watch('hasLimit')

  const submit = handleSubmit(async (values) => {
    const start = combineDayTime(values.day, values.time)
    if (isStartInPast(start)) {
      setError('time', { type: 'manual', message: t('errors.timeInPast') })
      return
    }
    await onSubmit({
      sportId: values.sportId,
      startAt: start.toISOString(),
      durationMin: values.durationMin,
      maxParticipants: values.hasLimit ? (values.maxParticipants ?? 10) : null,
      description: values.description ?? null,
    })
  })

  const sportOptions = useMemo(() => sports, [sports])

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Field data-invalid={!!errors.sportId || undefined}>
        <FieldLabel>{t('fields.sport')}</FieldLabel>
        <Controller
          control={control}
          name="sportId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder={t('fields.sport')} /></SelectTrigger>
              <SelectContent>
                {sportOptions.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>{sport.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.sportId]} />
      </Field>

      <Field data-invalid={!!errors.day || !!errors.time || undefined}>
        <FieldLabel>{t('fields.when')}</FieldLabel>
        <div className="flex gap-2">
          <Controller
            control={control}
            name="day"
            render={({ field }) => (
              <ToggleGroup
                type="single"
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
              >
                <ToggleGroupItem value="today">{t('day.today')}</ToggleGroupItem>
                <ToggleGroupItem value="tomorrow">{t('day.tomorrow')}</ToggleGroupItem>
              </ToggleGroup>
            )}
          />
          <Input type="time" step={900} className="w-32" {...register('time')} />
        </div>
        <FieldError errors={[errors.day, errors.time]} />
      </Field>

      <Field data-invalid={!!errors.durationMin || undefined}>
        <FieldLabel>{t('fields.duration')}</FieldLabel>
        <Controller
          control={control}
          name="durationMin"
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_PRESETS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes === 30
                      ? t('duration.30m')
                      : minutes === 60
                        ? t('duration.1h')
                        : minutes === 90
                          ? t('duration.1h30m')
                          : minutes === 120
                            ? t('duration.2h')
                            : t('duration.3h')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.durationMin]} />
      </Field>

      <Field orientation="horizontal" data-invalid={!!errors.maxParticipants || undefined}>
        <FieldLabel>{t('fields.limit')}</FieldLabel>
        <Controller
          control={control}
          name="hasLimit"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>
      {hasLimit && (
        <Field data-invalid={!!errors.maxParticipants || undefined}>
          <Controller
            control={control}
            name="maxParticipants"
            render={({ field }) => (
              <Input
                type="number"
                min={2}
                max={100}
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(event.target.value === '' ? null : Number(event.target.value))
                }
              />
            )}
          />
          <FieldError errors={[errors.maxParticipants]} />
        </Field>
      )}

      <Field data-invalid={!!errors.description || undefined}>
        <FieldLabel>{t('fields.description')}</FieldLabel>
        <Textarea
          placeholder={t('fields.descriptionPlaceholder')}
          {...register('description')}
        />
        <FieldDescription>
          <span data-slot="char-count">{(watch('description')?.length ?? 0)} / 280</span>
        </FieldDescription>
        <FieldError errors={[errors.description]} />
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('saving') : submitLabel}
      </Button>
    </form>
  )
}

export { EventForm }
export type { EventFormValues }
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors. Add any missing shadcn dependencies if you see errors (`switch`, `toggle-group`, `select` should all already be installed in this template).

- [ ] **Step 3: Wait for commit approval**

```bash
git add components/events/event-form.tsx
git commit -m "feat(events): add EventForm"
```

### Task 5.2: `components/events/event-create-sheet.tsx`

**Files:**
- Create: `components/events/event-create-sheet.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EventForm } from './event-form'
import { eventApi, ApiError } from '@/services'
import type { Sport } from '@/services/configs/sport.config'

interface EventCreateSheetProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  playgroundId: string
  defaultSportId: string | null
  sports: Sport[]
}

function EventCreateSheet({
  open,
  onOpenChange,
  playgroundId,
  defaultSportId,
  sports,
}: EventCreateSheetProps) {
  const t = useTranslations('events')
  const router = useRouter()

  const handleSubmit = async (values: {
    sportId: string
    startAt: string
    durationMin: number
    maxParticipants: number | null
    description: string | null
  }) => {
    try {
      await eventApi.create({
        pathParams: { playgroundId },
        body: values,
      })
      toast.success(t('createTitle'))
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
      // Toast interceptor surfaces user-facing message.
      // Per-field server validation would require lifting setError up from EventForm — out of v1 scope.
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('createTitle')}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <EventForm
            sports={sports}
            defaultValues={{
              sportId: defaultSportId ?? sports[0]?.id ?? '',
              durationMin: 60,
              hasLimit: false,
            }}
            isSubmitting={false}
            submitLabel={t('createCta')}
            onSubmit={handleSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { EventCreateSheet }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/events/event-create-sheet.tsx
git commit -m "feat(events): add EventCreateSheet"
```

### Task 5.3: `components/events/event-edit-sheet.tsx`

**Files:**
- Create: `components/events/event-edit-sheet.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EventForm } from './event-form'
import { eventApi, ApiError } from '@/services'
import type { PlaygroundEvent } from '@/services'
import type { Sport } from '@/services/configs/sport.config'
import { addDays, isSameDay, format, startOfDay } from 'date-fns'

interface EventEditSheetProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  event: PlaygroundEvent
  sports: Sport[]
  onSaved: (updated: PlaygroundEvent) => void
}

const startToDayAndTime = (startAt: string) => {
  const start = new Date(startAt)
  const today = startOfDay(new Date())
  const tomorrow = startOfDay(addDays(new Date(), 1))
  const day: 'today' | 'tomorrow' = isSameDay(start, today)
    ? 'today'
    : isSameDay(start, tomorrow)
      ? 'tomorrow'
      : 'today'
  return { day, time: format(start, 'HH:mm') }
}

function EventEditSheet({ open, onOpenChange, event, sports, onSaved }: EventEditSheetProps) {
  const t = useTranslations('events')
  const router = useRouter()
  const { day, time } = startToDayAndTime(event.startAt)

  const handleSubmit = async (values: {
    sportId: string
    startAt: string
    durationMin: number
    maxParticipants: number | null
    description: string | null
  }) => {
    try {
      const updated = await eventApi.update({
        pathParams: { id: event.id },
        body: values,
      })
      onSaved(updated)
      toast.success(t('save'))
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('edit')}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <EventForm
            sports={sports}
            defaultValues={{
              sportId: event.sport.id,
              day,
              time,
              durationMin: event.durationMin,
              hasLimit: event.maxParticipants !== null,
              maxParticipants: event.maxParticipants,
              description: event.description,
            }}
            isSubmitting={false}
            submitLabel={t('save')}
            onSubmit={handleSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { EventEditSheet }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/events/event-edit-sheet.tsx
git commit -m "feat(events): add EventEditSheet"
```

---

## Phase 6 — Event display (card + list)

### Task 6.1: `components/events/event-card.tsx`

**Files:**
- Create: `components/events/event-card.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EventRsvpButton } from './event-rsvp-button'
import { formatEventTime, formatDuration } from '@/lib/events/format-event-time'
import type { PlaygroundEvent } from '@/services'

interface EventCardProps {
  event: PlaygroundEvent
  locale: string
}

function EventCard({ event, locale }: EventCardProps) {
  const t = useTranslations('events')
  const time = formatEventTime(new Date(event.startAt), { locale })
  const duration = formatDuration(event.durationMin, locale)
  const participants = event.maxParticipants
    ? t('participantsLimited', { count: event.rsvpCount, max: event.maxParticipants })
    : t('participants', { count: event.rsvpCount })

  return (
    <Link
      href={`/events/${event.id}`}
      className="block"
      data-slot="event-card"
    >
      <Card
        className={cn(
          'transition hover:border-primary/50',
          event.status === 'cancelled' && 'opacity-60'
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold" style={{ color: event.sport.color ?? undefined }}>
              {event.sport.label} · {time} · {duration}
            </p>
            {event.status === 'cancelled' && <Badge variant="destructive">{t('cancelled')}</Badge>}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="size-6">
              <AvatarImage src={event.creator.avatar ?? undefined} />
              <AvatarFallback>{event.creator.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{event.creator.name}</span>
            <span>·</span>
            <span>{participants}</span>
          </div>

          {event.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          )}

          <div onClick={(handlerEvent) => handlerEvent.stopPropagation()}>
            <EventRsvpButton event={event} size="sm" className="w-full sm:w-auto" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export { EventCard }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/events/event-card.tsx
git commit -m "feat(events): add EventCard"
```

### Task 6.2: `components/events/event-list.tsx`

**Files:**
- Create: `components/events/event-list.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { EventCard } from './event-card'
import { EventCreateSheet } from './event-create-sheet'
import { useEventCreateDialog } from '@/hooks/use-event-create-dialog'
import { groupEventsByDay } from '@/lib/events/group-events-by-day'
import { useUserOptional } from '@/lib/auth/user-provider'
import { useRouter } from 'next/navigation'
import type { PlaygroundEvent } from '@/services'
import type { Sport } from '@/services/configs/sport.config'

interface EventListProps {
  playgroundId: string
  events: PlaygroundEvent[]
  sports: Sport[]
  defaultSportId: string | null
}

const renderEmpty = (t: ReturnType<typeof useTranslations>, onCreate: () => void) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
    <p className="text-base font-semibold">{t('emptyTitle')}</p>
    <p className="text-sm text-muted-foreground">{t('emptySubtitle')}</p>
    <Button onClick={onCreate} className="mt-2">{t('createCta')}</Button>
  </div>
)

function EventList({ playgroundId, events, sports, defaultSportId }: EventListProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const router = useRouter()
  const user = useUserOptional()
  const dialog = useEventCreateDialog()
  const [items] = useState(events)
  const { today, tomorrow } = groupEventsByDay(items)

  const handleCreate = () => {
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    dialog.open()
  }

  const isEmpty = today.length === 0 && tomorrow.length === 0
  const renderCard = (event: PlaygroundEvent) => (
    <EventCard key={event.id} event={event} locale={locale} />
  )

  return (
    <section className="flex flex-col gap-4" data-slot="event-list">
      {isEmpty ? (
        renderEmpty(t, handleCreate)
      ) : (
        <>
          {today.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{t('today')}</h3>
              {today.map(renderCard)}
            </div>
          )}
          {tomorrow.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{t('tomorrow')}</h3>
              {tomorrow.map(renderCard)}
            </div>
          )}
          <Button onClick={handleCreate} variant="outline" className="self-start">
            {t('createCta')}
          </Button>
        </>
      )}

      <EventCreateSheet
        open={dialog.isOpen}
        onOpenChange={dialog.setOpen}
        playgroundId={playgroundId}
        defaultSportId={defaultSportId}
        sports={sports}
      />
    </section>
  )
}

export { EventList }
```

- [ ] **Step 2: Wait for commit approval**

```bash
git add components/events/event-list.tsx
git commit -m "feat(events): add EventList"
```

---

## Phase 7 — Page integration

### Task 7.1: Integrate Presence + Events into the playground page

**Files:**
- Modify: `app/[locale]/(public-app)/sports-map/[id]/page.tsx`

- [ ] **Step 1: Inspect current page**

Read `app/[locale]/(public-app)/sports-map/[id]/page.tsx` to understand current data loading and layout. Reuse existing data-loading pattern; add new fetches in parallel.

- [ ] **Step 2: Load events + sports in parallel**

Inside the RSC `page.tsx`, fetch (alongside the existing `playgroundApi.getById`):

```tsx
import { eventApi, sportApi } from '@/services'

const [playground, events, sports] = await Promise.all([
  playgroundApi.getById({ pathParams: { id } }),
  eventApi.listByPlayground({ pathParams: { playgroundId: id } }),
  sportApi.list(),
])
```

- [ ] **Step 3: Render new sections**

Place the `PresenceCard` and `EventList` into the existing layout (after the playground header, before any footer area):

```tsx
import { PresenceCard } from '@/components/presence/presence-card'
import { EventList } from '@/components/events/event-list'

<PresenceCard
  playgroundId={playground.id}
  initialActiveCount={playground.counters.activeCheckIns}
  initialViewer={
    playground.viewer
      ? { isCheckedIn: playground.viewer.isCheckedInHere, expiresAt: null }
      : null
  }
/>
<EventList
  playgroundId={playground.id}
  events={events.items}
  sports={sports.items}
  defaultSportId={playground.sports[0]?.id ?? null}
/>
```

> Note: `PresenceCard` expects `expiresAt` for the active check-in. Today the playground `viewer` flag only carries `isCheckedInHere: boolean`. Either:
>   - extend `viewer` on the playground response to include `expiresAt`, **or**
>   - make a parallel `checkInApi.checkIn` is **not** done here — instead, surface the check-in's `expiresAt` from the backend's playground response.
>
> Mark this as a backend follow-up if not already in spec. For v1 the UI can degrade gracefully: when `expiresAt` is null, show «✓ Ты тут» without the time suffix.

- [ ] **Step 4: Smoke-test in browser**

Run `npm run dev` (background) and visit `/<locale>/sports-map/<some-id>` to confirm the new sections render.

- [ ] **Step 5: Wait for commit approval**

```bash
git add app/[locale]/(public-app)/sports-map/[id]/page.tsx
git commit -m "feat(playground): show presence and events on playground page"
```

### Task 7.2: Event detail page

**Files:**
- Create: `app/[locale]/(app)/events/[id]/page.tsx`
- Create: `app/[locale]/(app)/events/[id]/event-detail-page.tsx`

- [ ] **Step 1: RSC page**

```tsx
// page.tsx
import { notFound } from 'next/navigation'
import { eventApi, sportApi, ApiError } from '@/services'
import { EventDetailPage } from './event-detail-page'

interface Params {
  params: Promise<{ id: string; locale: string }>
}

export default async function EventPage({ params }: Params) {
  const { id } = await params
  try {
    const [event, sports] = await Promise.all([
      eventApi.getById({ pathParams: { id } }),
      sportApi.list(),
    ])
    return <EventDetailPage event={event} sports={sports.items} />
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }
}
```

- [ ] **Step 2: Client island**

```tsx
// event-detail-page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { EventRsvpButton } from '@/components/events/event-rsvp-button'
import { EventStatusBanner } from '@/components/events/event-status-banner'
import { EventMenu } from '@/components/events/event-menu'
import { EventEditSheet } from '@/components/events/event-edit-sheet'
import { EventTimeDisplay } from '@/components/events/event-time-display'
import { useUserOptional } from '@/lib/auth/user-provider'
import { formatEventTime, formatDuration } from '@/lib/events/format-event-time'
import type { PlaygroundEvent } from '@/services'
import type { Sport } from '@/services/configs/sport.config'

interface EventDetailPageProps {
  event: PlaygroundEvent
  sports: Sport[]
}

function EventDetailPage({ event: initialEvent, sports }: EventDetailPageProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const router = useRouter()
  const user = useUserOptional()
  const [event, setEvent] = useState(initialEvent)
  const [editOpen, setEditOpen] = useState(false)

  const isCreator = user?.id === event.creator.id
  const time = formatEventTime(new Date(event.startAt), { locale })
  const duration = formatDuration(event.durationMin, locale)
  const progress = event.maxParticipants
    ? Math.round((event.rsvpCount / event.maxParticipants) * 100)
    : null
  const free = event.maxParticipants ? event.maxParticipants - event.rsvpCount : null

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ url: window.location.href, title: event.sport.label })
      return
    }
    await navigator.clipboard.writeText(window.location.href)
    toast.success(t('shareCopied'))
  }

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" /> {t('back')}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Share">
            <Share2 />
          </Button>
          {isCreator && (
            <EventMenu event={event} onEdit={() => setEditOpen(true)} onCancelled={setEvent} />
          )}
        </div>
      </header>

      <EventStatusBanner status={event.status} />

      <div className="flex flex-col gap-1">
        <p className="text-3xl font-bold" style={{ color: event.sport.color ?? undefined }}>
          {event.sport.label}
        </p>
        <p className="text-xl font-medium">{time} · {duration}</p>
        <EventTimeDisplay startAt={event.startAt} durationMin={event.durationMin} />
      </div>

      <Link
        href={`/sports-map/${event.playgroundId}`}
        className="rounded-lg border bg-card p-4 transition hover:border-primary/50"
      >
        <p className="text-sm font-medium">📍 {t('creator')}</p>
      </Link>

      <section className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={event.creator.avatar ?? undefined} />
          <AvatarFallback>{event.creator.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs uppercase text-muted-foreground">{t('creator')}</p>
          <p className="font-medium">{event.creator.name}</p>
        </div>
      </section>

      {event.description && (
        <p className="whitespace-pre-line rounded-lg border bg-card p-4">{event.description}</p>
      )}

      <section className="flex flex-col gap-2">
        <p className="font-medium">
          {event.maxParticipants
            ? t('participantsLimited', { count: event.rsvpCount, max: event.maxParticipants })
            : t('participants', { count: event.rsvpCount })}
        </p>
        {progress !== null && <Progress value={progress} />}
        {free !== null && free > 0 && (
          <p className="text-sm text-muted-foreground">{t('freeSpots', { count: free })}</p>
        )}
      </section>

      {event.status === 'active' && (
        <div className="sticky bottom-4 mt-auto">
          <EventRsvpButton event={event} size="lg" className="w-full" />
        </div>
      )}

      <EventEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
        sports={sports}
        onSaved={setEvent}
      />
    </article>
  )
}

export { EventDetailPage }
```

- [ ] **Step 3: Smoke-test**

Run `npm run dev` and visit `/<locale>/events/<id>`.

- [ ] **Step 4: Wait for commit approval**

```bash
git add app/[locale]/(app)/events/[id]/page.tsx app/[locale]/(app)/events/[id]/event-detail-page.tsx
git commit -m "feat(events): add event detail page"
```

---

## Phase 8 — Map integration

### Task 8.1: Update `SportsMap.tsx` to consume `counters`

**Files:**
- Modify: `components/sports-map/SportsMap.tsx`

- [ ] **Step 1: Inspect current marker rendering**

Read `components/sports-map/SportsMap.tsx`. Note where each marker DOM is built.

- [ ] **Step 2: Add badge rendering**

For each playground marker, when `playground.counters.activeCheckIns > 0` render a `PresenceIndicator` overlay on top-right of the marker; when `playground.counters.upcomingEvents > 0` render a `Calendar` icon + number bubble next to it. Use Leaflet `divIcon` with embedded HTML — example:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { PresenceIndicator } from '@/components/presence/presence-indicator'

const makeIconHtml = (playground: Playground) => {
  const presence = playground.counters.activeCheckIns
  const upcoming = playground.counters.upcomingEvents
  return `
    <div class="playground-marker">
      <!-- existing marker visual -->
      ${
        presence > 0
          ? `<span class="marker-badge marker-badge--presence">${renderToStaticMarkup(<PresenceIndicator count={presence} />)}</span>`
          : ''
      }
      ${
        upcoming > 0
          ? `<span class="marker-badge marker-badge--events">📅 ${upcoming}</span>`
          : ''
      }
    </div>
  `
}
```

Style `.marker-badge` in `SportsMap.css` (modify existing file). Use `--chart-2` for presence, `--primary` for events.

- [ ] **Step 3: Smoke-test**

Run `npm run dev`, visit `/<locale>/sports-map`, hover/inspect markers — badges should appear on playgrounds with activity.

- [ ] **Step 4: Wait for commit approval**

```bash
git add components/sports-map/SportsMap.tsx components/sports-map/SportsMap.css
git commit -m "feat(map): show presence and event badges on markers"
```

### Task 8.2: 60s heartbeat on playground page

**Files:**
- Modify: `components/events/event-list.tsx`
- Modify: `components/presence/presence-card.tsx`

- [ ] **Step 1: Add `useVisibilityPolling` hook**

Create `hooks/use-visibility-polling.ts`:

```ts
'use client'

import { useEffect } from 'react'

const useVisibilityPolling = (callback: () => void, intervalMs: number = 60_000): void => {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') callback()
    }
    const id = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(id)
  }, [callback, intervalMs])
}

export { useVisibilityPolling }
```

- [ ] **Step 2: Wire up in `EventList` and `PresenceCard`**

In each:

```ts
import { useRouter } from 'next/navigation'
import { useVisibilityPolling } from '@/hooks/use-visibility-polling'

const router = useRouter()
useVisibilityPolling(() => router.refresh(), 60_000)
```

(In `EventList` `router` is already imported; in `PresenceCard` add the import.)

- [ ] **Step 3: Smoke-test**

Manual: leave the playground page open, change the data in DB (or have another user RSVP), see the counts update within 60s.

- [ ] **Step 4: Wait for commit approval**

```bash
git add hooks/use-visibility-polling.ts components/events/event-list.tsx components/presence/presence-card.tsx
git commit -m "feat(events): poll playground page every 60s while visible"
```

---

## Phase 9 — Verification & polish

### Task 9.1: Full type check + lint + format

- [ ] **Step 1:** Run `npx tsc --noEmit` — expect no errors.
- [ ] **Step 2:** Run `npm run lint` — expect no errors.
- [ ] **Step 3:** Run `npm run format` — expect Prettier to normalize new files.
- [ ] **Step 4:** Run `npm test` — expect all unit tests green.
- [ ] **Step 5:** Run `npm run build` — expect build to succeed.

If any check fails, fix inline. Then wait for commit approval and commit lint/format normalizations under `chore: format and lint` if any files changed.

### Task 9.2: Manual smoke-test checklist

Run `npm run dev`. With the backend running and a fresh user logged in, walk through:

- [ ] Open `/<locale>/sports-map`. Markers render normally if no activity.
- [ ] Open a playground page `/<locale>/sports-map/<id>`. PresenceCard and EventList sections render.
- [ ] Click `Я на площадке` → button switches to «✓ Ты тут до HH:MM», `Я ушёл` is visible. Count increases on refresh.
- [ ] Click `+ Создать событие`. Fill form, submit. New event appears in the list with `Я иду` button.
- [ ] Click `Я иду` → button toggles to `✓ Ты идёшь`, counter increases. Click again → reverts.
- [ ] Click the event card → /events/[id] detail page loads with all fields.
- [ ] As creator, open meatball menu → Edit → change description, save. Banner does not appear, edits visible.
- [ ] As creator, meatball menu → Cancel event → confirm. Red banner appears on detail page; event disappears from playground list after refresh.
- [ ] Anonymous: click `Я иду` → redirects to `/login?returnTo=...`.
- [ ] Back to map: playground with activity now shows the green pulse badge and event count badge.

If any step fails, fix and re-run. Document any backend issues in a follow-up note (not a blocker for the frontend PR).

### Task 9.3: Final commit

When everything passes and the user approves:

```bash
git add -A
git commit -m "chore(events): finalize playground events + presence v1"
```

---

## Out of scope (deferred)

These items are explicitly NOT done in this plan, per the spec:

- Comments / chat in events (`comments-system` is a separate plan)
- Push / email notifications
- Recurring events
- Standalone `/events` feed
- Participant lists with names/avatars (only counters)
- WebSocket / true realtime
- QR / GPS verified check-in
- Analytics hooks
- Waitlists on full events
- Backend implementation (lives in `/Users/egorzozula/Desktop/backendTemplate /src/`, separate plan)
