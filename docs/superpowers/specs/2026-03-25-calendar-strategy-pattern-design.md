# Calendar Strategy Pattern — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Refactor BookingCalendar into CalendarCore + pluggable strategies

---

## Problem

The current booking calendar is a monolithic component with conditional rendering logic baked in. All UI decisions (what to render in sidebar, panel, grid) are hardcoded for one context — client booking. Adding new contexts (staff schedule management, org-wide view) requires modifying existing components and adding more conditionals.

## Solution

Strategy Pattern via factory functions. A generic `CalendarCore` renders whatever blocks a strategy provides. Each context (client, staff, org) is a separate strategy file. Adding a new context = creating one file, no existing code changes.

## Architecture

```
Page (fetches data from API, manages URL state)
  → createClientStrategy({ data, urlState, callbacks })
    → CalendarProvider strategy={strategy}
      → CalendarCore (dumb renderer)
        ├── Header: strategy.getTitle() + nav + view switcher
        ├── Sidebar: strategy.renderSidebar()
        ├── Grid: strategy.getBlocks() → positioned blocks
        └── Panel: strategy.renderPanel()
```

### Data Flow

1. **Page** — fetches data (API/mock) + reads URL state (service, date, slot, mode, view)
2. **Factory** — receives data + state + callbacks as params, returns `CalendarStrategy` object
3. **Strategy** — works with ready data, doesn't know where it comes from
4. **CalendarCore** — renders blocks by position, knows nothing about business domain

### Source of Truth

- **URL params** — navigational state (selected service, date, slot, view mode, slot algorithm)
- **API (mock for now)** — data (services, bookings, schedule)
- Strategy receives both via factory params, doesn't fetch or manage state itself

---

## Types

### `lib/calendar/types.ts`

```typescript
import type { ReactNode } from 'react'

type ViewMode = 'day' | 'week' | 'month'

type BlockType = 'booking' | 'dropzone' | 'pending' | 'locked' | 'workHours'

interface CalendarBlock {
	id: string
	startMin: number
	duration: number
	date: string

	// visual
	color: string
	opacity?: number // 0.5 for pending
	borderStyle?: 'solid' | 'dashed'
	label?: string
	sublabel?: string // second line (e.g. "14:00 – 15:00")

	// behavior
	onClick?: () => void
	draggable?: boolean
	blockType: BlockType

	// multi-column (OrgStrategy resource view)
	column?: string // staff ID — CalendarCore creates column per unique value
}

interface ConfirmedBooking {
	serviceSlug: string
	startTime: string
	date: string
}

interface CalendarStrategy {
	getBlocks(date: string): CalendarBlock[]
	renderSidebar(): ReactNode
	renderPanel(): ReactNode
	onCellClick(date: string, startMin: number): void
	onRangeSelect?: (date: string, startMin: number, endMin: number) => void // drag-select (StaffStrategy)
	allowRangeSelect: boolean
	getTitle(date: string, view: ViewMode): string
}
```

`CalendarBlock` is the only contract between strategy and CalendarCore. CalendarCore doesn't know what "slot" or "booking" means — it just positions blocks by `startMin` and `duration`.

- `label` — primary text (e.g. "Haircut — Maria")
- `sublabel` — secondary text (e.g. "14:00 – 15:00"), rendered below label in smaller font
- CalendarCore renders both if present, no domain knowledge required
- `ConfirmedBooking` type lives here (migrated from `calendar-utils.ts`), used by BookingPanel and strategies

---

## CalendarContext

### `lib/calendar/CalendarContext.tsx`

```typescript
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { CalendarStrategy } from './types'

const CalendarContext = createContext<CalendarStrategy | null>(null)

interface CalendarProviderProps {
  strategy: CalendarStrategy
  children: ReactNode
}

function CalendarProvider({ strategy, children }: CalendarProviderProps) {
  return (
    <CalendarContext value={strategy}>
      {children}
    </CalendarContext>
  )
}

const useCalendarStrategy = (): CalendarStrategy => {
  const strategy = useContext(CalendarContext)
  if (!strategy) throw new Error('useCalendarStrategy must be used within CalendarProvider')
  return strategy
}

export { CalendarProvider, useCalendarStrategy }
```

Minimal — stores and provides strategy. No state, no logic.

---

## CalendarCore

### `lib/calendar/CalendarCore.tsx`

**Props:**

```typescript
interface CalendarCoreProps {
	date: string
	view: ViewMode
	onViewChange: (view: ViewMode) => void
	onDateChange: (date: string) => void
	workStart: string // "10:00"
	workEnd: string // "18:00"
}
```

**Responsibilities:**

1. Reads strategy via `useCalendarStrategy()`
2. Renders **responsive layout** — three zones:
   - Left: `strategy.renderSidebar()` — visible on `md+`, hidden on mobile
   - Center: Grid (view-dependent)
   - Right: `strategy.renderPanel()`
   - Mobile: floating hamburger button opens `<Sheet>` with sidebar content
3. Renders header — `strategy.getTitle(date, view)` + prev/next navigation + view switcher
4. Renders grid — **view-dependent rendering**:

   **Day view:**
   - Hour lines from workStart to workEnd
   - Calls `strategy.getBlocks(date)` for a single date
   - Positions each block absolutely:
     - `top = minutesToPx(block.startMin)`
     - `height = durationToPx(block.duration)`
   - Renders `block.label` + `block.sublabel` inside each block
   - Click on empty cell → `strategy.onCellClick(date, startMin)`

   **Week view:**
   - 7-column grid with day headers (Mon–Sun)
   - Calls `strategy.getBlocks(date)` once per day (7 calls)
   - Each column renders blocks identically to day view
   - Blocks carry their own `date` field — CalendarCore matches block to column

   **Month view:**
   - Calendar grid (rows of weeks, 7 columns)
   - Calls `strategy.getBlocks(date)` for each day in the month
   - Renders **compact representation**: colored dots or count badges per day (blocks with `duration > 0` are counted)
   - Click on day cell → `onDateChange(date)` + `onViewChange('day')` (drill down)

5. Click on empty cell (day/week views) → `strategy.onCellClick(date, startMin)`

**What CalendarCore does NOT do:**

- Doesn't know about services, slots, bookings, confirmed state
- Doesn't manage state (state lives in strategy/page)
- Doesn't decide what to render — only positions blocks

**Navigation** (prev/next) stays in CalendarCore — pure date arithmetic (±1 day / ±7 days / ±1 month depending on view). `onDateChange` callback propagates new date up to page.

**Mobile layout:** CalendarCore owns the responsive shell. On screens < `md`, sidebar is hidden and a floating button opens `<Sheet>` with `strategy.renderSidebar()` content. This mirrors the current BookingPage behavior but moves it into CalendarCore so all strategies get responsive layout for free.

---

## Utilities Migration

### `lib/calendar/utils.ts`

All exports from `components/booking/calendar-utils.ts` migrate here. Nothing is lost.

**Rendering constants** (used by CalendarCore):

- `DISPLAY_START`, `PX_PER_HOUR`, `TOTAL_HOURS`, `HOUR_LABELS`
- `minutesToPx(min)`, `durationToPx(min)`, `formatHour(hour)`

**Date helpers** (used by CalendarCore for navigation + view rendering):

- `formatDateISO(d)`, `getTodayStr()`
- `getWeekDates(dateStr)`, `getMonthGrid(dateStr)` (+ internal helpers `getWeekStart`, `createWeekDate`)
- `getBookingsForDate(bookings, date)`

**Navigation helpers** (used by CalendarCore for prev/next):

- `addDays`, `addMonths` logic currently in BookingPage's `NAVIGATION_STEPS` moves here as pure functions

**Locale formatting** (used by strategies in `getTitle()`):

- `formatDateUA(dateStr)`, `formatWeekRange(dates)`, `formatMonth(dateStr)`
- `UA_DAYS`, `UA_DAYS_SHORT`, `UA_MONTHS`, `UA_MONTHS_FULL`

CalendarCore imports rendering constants and date helpers directly. Strategies import locale formatting for `getTitle()`.

---

## Strategies

### `lib/calendar/strategies/createClientStrategy.ts`

Factory function that migrates existing BookingCalendar + BookingPage logic.

**URL patterns:**

- `/book/[staffSlug]?service=...&date=...&slot=...` — direct link to staff, skip staff selection
- `/book/[orgSlug]?staff=...&service=...&date=...&slot=...` — via company, staff selection step first

**Flow:** `[select staff]` → select service → select date → select slot → confirm

If `staffSlug` is in the URL path, the staff selection step is skipped. If accessed via org URL, the sidebar shows a staff picker first.

**Params:**

```typescript
interface ClientStrategyParams {
	// data
	services: Service[]
	bookings: Booking[]
	schedule: Schedule
	staffName: string
	staffList?: Staff[] // available staff (when accessed via org)

	// URL state
	selectedStaffSlug: string | null // null = show staff picker step
	selectedServiceSlug: string | null
	selectedSlot: string | null
	slotMode: SlotMode
	confirmedBooking: ConfirmedBooking | null
	date: string

	// callbacks (from page)
	onSelectStaff?: (slug: string) => void // only when staffList provided
	onSelectService: (slug: string) => void
	onSelectSlot: (time: string) => void
	onConfirm: () => void
	onCancel: () => void
	onResetSlot: () => void
	onModeChange: (mode: SlotMode) => void
}
```

**Method implementations:**

- `getBlocks(date)`:
  1. Existing bookings → blocks with `blockType: 'booking'`, `color: booking.color`, `label: booking.label`, `sublabel: "HH:MM – HH:MM"`
  2. `getAvailableSlots()` from slot-engine → blocks with `blockType: 'dropzone'`, `borderStyle: 'dashed'`, `onClick: () => onSelectSlot(slot.startTime)`. **Intentional UX change:** current code uses hardcoded `violet-400` border for regular slots — new implementation uses `service.color` to make drop zones visually match the selected service. Extra slots (`slot.isExtra`) keep `orange-400` border to distinguish optimal algorithm suggestions
  3. If selectedSlot → block with `blockType: 'pending'`, `opacity: 0.5`, `color: service.color`
  4. If confirmedBooking on this date → block with `blockType: 'booking'` (solid, full opacity)
  5. Returns unified `CalendarBlock[]`

- `renderSidebar()`:
  - If `staffList` provided and no `selectedStaffSlug` → renders `<StaffPicker>` (list of staff with avatars)
  - Otherwise → renders `<ServiceList>` + `<SlotModeSelector>`
- `renderPanel()`: renders `<BookingPanel>` with current state
- `onCellClick(date, startMin)`: no-op if no service selected. Otherwise finds the first available slot where `slot.startMin >= startMin` and calls `onSelectSlot(slot.startTime)`. If no slot found — no-op.
- `allowRangeSelect`: `false`
- `getTitle(date, view)`: uses `staffName` + locale formatters (`formatDateUA` for day, `formatWeekRange` for week, `formatMonth` for month)

**Slot engine** is called inside `getBlocks()` as an external service — not absorbed into strategy.

---

### `lib/calendar/strategies/createStaffStrategy.ts`

Staff schedule management. Used on the dashboard for the logged-in staff member.

**URL:** `/dashboard/schedule`

**Three interaction modes on the grid:**

1. **VIEW** — default. Existing bookings rendered as blocks (same as client view). Read-only.

2. **WORK HOURS** — activated by "Налаштувати робочі години" button in sidebar.
   - `allowRangeSelect: true` — enables drag-select on the grid
   - User clicks and drags across time cells
   - Selected range highlighted with green background (`blockType: 'workHours'`, color: green)
   - On release: confirm modal "Встановити робочий час 10:00–18:00?"
   - Saves to `POST /api/schedule-templates`
   - Existing work hours shown as light green background blocks

3. **BLOCK TIME** — activated by "Заблокувати час" button in sidebar.
   - Same drag-select mechanism as work hours
   - Creates `schedule_override` via `POST /api/schedule-overrides`
   - Shown as gray block with lock icon (`blockType: 'locked'`, color: gray)

**Component:** `StaffScheduleCalendar` — page-level wrapper that creates the strategy + Provider + CalendarCore for the staff dashboard.

**Drag-select implementation options:**

1. **Custom** (preferred) — `onMouseDown` / `onMouseMove` / `onMouseUp` on grid cells. Lighter, no extra dependency.
2. **`react-big-calendar`** (`npm install react-big-calendar`) — provides built-in `selectable` / `onSelectSlot` range selection. Heavier, but battle-tested for schedule UIs.

CalendarCore provides the hook via `allowRangeSelect` + `onCellClick(date, startMin)` for single clicks. For drag, a new `onRangeSelect(date, startMin, endMin)` callback is needed on CalendarStrategy.

**Params:**

```typescript
type StaffMode = 'view' | 'workHours' | 'blockTime'

interface StaffStrategyParams {
	// data
	staffName: string
	bookings: Booking[]
	schedule: Schedule
	workHoursTemplates: WorkHoursTemplate[] // existing templates
	scheduleOverrides: ScheduleOverride[] // existing blocks

	// state
	mode: StaffMode
	date: string
	dragRange: { startMin: number; endMin: number } | null // active drag

	// callbacks
	onModeChange: (mode: StaffMode) => void
	onRangeSelect: (date: string, startMin: number, endMin: number) => void
	onConfirmWorkHours: (date: string, startMin: number, endMin: number) => void
	onConfirmBlock: (date: string, startMin: number, endMin: number) => void
	onDeleteOverride: (id: string) => void
}
```

**Method implementations:**

- `getBlocks(date)`:
  1. Work hours templates → blocks with `blockType: 'workHours'`, `color: '#22C55E'` (green-500), `opacity: 0.15`
  2. Existing bookings → blocks with `blockType: 'booking'`
  3. Schedule overrides (blocks) → blocks with `blockType: 'locked'`, `color: '#9CA3AF'` (gray-400), `label: '🔒 Заблоковано'`
  4. If `dragRange` active → preview block with `blockType: mode === 'workHours' ? 'workHours' : 'locked'`, `opacity: 0.4`
  5. Returns unified `CalendarBlock[]`

- `renderSidebar()`:
  - Mode selector: 3 buttons (Перегляд / Робочі години / Блокування)
  - Active mode highlighted
  - Mode-specific instructions text

- `renderPanel()`:
  - **view mode:** selected booking details (click a block)
  - **workHours mode:** current templates list + "Зберегти" button
  - **blockTime mode:** current overrides list with delete buttons

- `onCellClick(date, startMin)`:
  - **view mode:** no-op
  - **workHours/blockTime mode:** start drag at `startMin`

- `allowRangeSelect`: `true` when mode is `workHours` or `blockTime`, `false` for `view`

- `getTitle(date, view)`: `"Мій розклад — {formatted date}"`

**New types needed in `types.ts`:**

```typescript
interface WorkHoursTemplate {
	id: string
	dayOfWeek: number // 0-6
	startMin: number
	endMin: number
}

interface ScheduleOverride {
	id: string
	date: string
	startMin: number
	endMin: number
	reason?: string
}
```

**CalendarStrategy interface extension for drag:**

```typescript
interface CalendarStrategy {
	// ... existing methods ...
	onRangeSelect?: (date: string, startMin: number, endMin: number) => void
}
```

CalendarCore checks `strategy.allowRangeSelect` and `strategy.onRangeSelect` to enable mouse drag behavior on the grid. If `allowRangeSelect` is `false`, drag is ignored.

---

### `lib/calendar/strategies/createOrgStrategy.ts`

Organization-wide view. Shows all staff members in a resource/multi-column layout.

**URL:** `/org/[orgSlug]`

**Top panel — horizontal staff tabs:**

```typescript
interface StaffTab {
	userId: string
	name: string
	avatarUrl: string
	position: string // from positions collection
	bookedCount: number // bookings today/this week
}
```

**Behavior:**

- Default: all staff visible, grid shows one column per staff member
- Clicking a staff member → their column expands to full width (detail view)
- In week/month view → must select a staff member first, then shows their detailed schedule

**Resource view (multi-column):**

- Each column = one staff member
- Column header: avatar + name + position
- Bookings rendered in the corresponding column
- Used by admin/owner to see everyone at a glance

**Params:**

```typescript
interface OrgStrategyParams {
	// data
	orgName: string
	staffList: StaffTab[]
	bookingsByStaff: Record<string, Booking[]> // staffId → bookings
	scheduleByStaff: Record<string, Schedule> // staffId → schedule

	// state
	selectedStaffId: string | null // null = show all columns
	date: string

	// callbacks
	onSelectStaff: (staffId: string | null) => void // null = back to all
}
```

**Method implementations:**

- `getBlocks(date)`:
  - If `selectedStaffId` → returns blocks for that staff member only (same as ClientStrategy bookings)
  - If all staff → returns blocks for ALL staff with an added `column` identifier. Since `CalendarBlock` doesn't have a `column` field, the strategy uses `id` prefix convention: `{staffId}-booking-{index}`. CalendarCore in org mode parses the staffId from block IDs to place blocks in correct columns.
  - **Alternative (preferred):** Add optional `column?: string` field to `CalendarBlock` for multi-column layouts.

- `renderSidebar()`:
  - Staff filter list (checkboxes to show/hide specific staff)
  - Position filter (group by position)
  - "Показати всіх" / "Сховати всіх" toggle

- `renderPanel()`:
  - Selected staff summary: today's bookings, work hours, availability
  - If no staff selected: org-level summary (total bookings today, staff utilization)

- `onCellClick(date, startMin)`: no-op (org view is read-only)

- `allowRangeSelect`: `false`

- `getTitle(date, view)`: `"{orgName} — {formatted date}"`

**CalendarBlock extension for multi-column:**

```typescript
interface CalendarBlock {
	// ... existing fields ...
	column?: string // staff ID for multi-column layouts
}
```

CalendarCore renders multi-column layout when blocks have `column` values: creates a column per unique `column` value, positions blocks within their respective columns.

**Component wrapper:**

```tsx
// Page-level usage:
const strategy = createOrgStrategy({
  orgName, staffList, bookingsByStaff, scheduleByStaff,
  selectedStaffId, date,
  onSelectStaff: handleSelectStaff,
})

<CalendarProvider strategy={strategy}>
  <StaffTabBar
    staffList={staffList}
    selectedId={selectedStaffId}
    onSelect={handleSelectStaff}
  />
  <CalendarCore
    date={date}
    view={view}
    onViewChange={handleViewChange}
    onDateChange={handleDateChange}
    workStart="09:00"
    workEnd="19:00"
  />
</CalendarProvider>
```

`StaffTabBar` lives outside CalendarCore — it's org-specific UI that wraps the calendar. CalendarCore doesn't know about staff tabs.

**Convenience wrapper** — `<OrgCalendar>` encapsulates the Provider + TabBar + Core composition:

```tsx
interface OrgCalendarProps {
	staff: StaffTab[]
	selectedStaff: string | null
	onSelectStaff: (id: string | null) => void
	view: ViewMode
	onViewChange: (view: ViewMode) => void
	date: string
	onDateChange: (date: string) => void
	bookingsByStaff: Record<string, Booking[]>
	scheduleByStaff: Record<string, Schedule>
	orgName: string
	workStart: string
	workEnd: string
}

// Usage:
;<OrgCalendar
	staff={staffList}
	selectedStaff={staffId}
	onSelectStaff={handleSelectStaff}
	view={view}
	onViewChange={handleViewChange}
	date={date}
	onDateChange={handleDateChange}
	bookingsByStaff={bookingsByStaff}
	scheduleByStaff={scheduleByStaff}
	orgName={orgName}
	workStart="09:00"
	workEnd="19:00"
/>
```

Internally creates the strategy, wraps in `CalendarProvider`, renders `StaffTabBar` + `CalendarCore`. Page only passes data and callbacks.

---

## Page Integration

### `app/[locale]/book/[staffSlug]/BookingPage.tsx`

**Before:**

```tsx
<BookingCalendar allBookings={...} slots={...} selectedSlot={...} ... 15+ props />
<BookingPanel selectedService={...} ... />
<ServiceList ... />
```

**After:**

```tsx
const strategy = createClientStrategy({
  services, bookings, schedule, staffName,
  selectedServiceSlug, selectedSlot, slotMode,
  confirmedBooking, date,
  onSelectService: handleServiceSelect,
  onSelectSlot: handleSlotSelect,
  onConfirm: handleConfirm,
  onCancel: handleCancel,
  onResetSlot: handleResetSlot,
  onModeChange: handleModeChange,
})

<CalendarProvider strategy={strategy}>
  <CalendarCore
    date={date}
    view={view}
    onViewChange={handleViewChange}
    onDateChange={handleDateChange}
    workStart={schedule.workStart}
    workEnd={schedule.workEnd}
  />
</CalendarProvider>
```

BookingPage simplifies — no longer orchestrates render of 4 components with 15+ props. Creates strategy, wraps in Provider, renders CalendarCore. Mobile responsive layout (Sheet + hamburger) moves into CalendarCore — all strategies get it for free.

---

## File Changes Summary

| Action        | File                                              | Description                                                                                                                                              |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE        | `lib/calendar/types.ts`                           | CalendarBlock (with column), CalendarStrategy (with onRangeSelect), ConfirmedBooking, ViewMode, BlockType, WorkHoursTemplate, ScheduleOverride, StaffTab |
| CREATE        | `lib/calendar/utils.ts`                           | Rendering constants, positioning functions, date helpers, locale formatters (migrated from calendar-utils.ts)                                            |
| CREATE        | `lib/calendar/CalendarContext.tsx`                | CalendarProvider + useCalendarStrategy()                                                                                                                 |
| CREATE        | `lib/calendar/CalendarCore.tsx`                   | Dumb renderer (grid + blocks + responsive layout + mobile Sheet)                                                                                         |
| CREATE        | `lib/calendar/strategies/createClientStrategy.ts` | Client booking: service/slot selection, optional staff picker step                                                                                       |
| CREATE        | `lib/calendar/strategies/createStaffStrategy.ts`  | Staff schedule: view/workHours/blockTime modes, drag-select                                                                                              |
| CREATE        | `lib/calendar/strategies/createOrgStrategy.ts`    | Org overview: multi-column resource view, staff tabs                                                                                                     |
| CREATE        | `components/booking/StaffPicker.tsx`              | Staff selection list (used by ClientStrategy via org)                                                                                                    |
| CREATE        | `components/booking/StaffTabBar.tsx`              | Horizontal staff tabs (used by OrgStrategy page)                                                                                                         |
| CREATE        | `components/booking/StaffScheduleCalendar.tsx`    | Page-level wrapper for staff dashboard (strategy + Provider + Core)                                                                                      |
| CREATE        | `components/booking/OrgCalendar.tsx`              | Convenience wrapper for org view (strategy + TabBar + Core)                                                                                              |
| CREATE        | `lib/calendar/index.ts`                           | Public API re-exports                                                                                                                                    |
| DELETE        | `components/booking/BookingCalendar.tsx`          | Replaced by CalendarCore + strategies                                                                                                                    |
| DELETE        | `components/booking/BookingWeekView.tsx`          | View logic moves to CalendarCore                                                                                                                         |
| DELETE        | `components/booking/BookingMonthView.tsx`         | View logic moves to CalendarCore                                                                                                                         |
| DELETE        | `components/booking/calendar-utils.ts`            | All exports migrated to lib/calendar/types.ts + lib/calendar/utils.ts                                                                                    |
| REFACTOR      | `app/[locale]/book/[staffSlug]/BookingPage.tsx`   | Remove render orchestration, create strategy + Provider                                                                                                  |
| UPDATE IMPORT | `components/booking/BookingPanel.tsx`             | Change ConfirmedBooking import from calendar-utils to lib/calendar/types                                                                                 |
| NO CHANGE     | `components/booking/ServiceList.tsx`              | Rendered from ClientStrategy                                                                                                                             |
| NO CHANGE     | `components/booking/SlotModeSelector.tsx`         | Rendered from ClientStrategy                                                                                                                             |
| NO CHANGE     | `lib/slot-engine.ts`                              | Used inside ClientStrategy                                                                                                                               |

**Created:** 12 files
**Deleted:** 4 files
**Refactored:** 1 file
**Import update:** 1 file
**Unchanged:** 3 files

---

## Design Decisions

1. **Factory functions over classes** — consistent with project's functional-first approach (`const` only, pure functions, immutability). No `this` issues, easier to test.

2. **React Context over direct prop** — CalendarCore and nested components access strategy via `useCalendarStrategy()` without prop drilling. Scales when Grid/Sidebar become complex components.

3. **Slot engine stays separate** — different level of abstraction. CalendarStrategy handles UI/behavior, slot engine handles time algorithms. Single Responsibility preserved.

4. **No renderOverlay** — premature for MVP. Everything visible in the grid goes through `getBlocks()`. Overlays (tooltips, drag previews) can be added later without changing the interface.

5. **CalendarBlock as sole contract** — CalendarCore is maximally dumb. It positions blocks by `startMin`/`duration`, applies visual props (`color`, `opacity`, `borderStyle`), and calls `onClick`. No domain knowledge leaks in.

6. **URL params for navigational state, API for data** — strategy receives both via factory params but doesn't fetch or manage state. Page is the only place that talks to API and URL.

7. **Memoization at page level** — the strategy object is created via `useMemo` in the page component, recalculating only when its dependencies change (URL state, data). `getBlocks()` is a pure function of its inputs — no internal caching needed since React re-renders only when state changes.

8. **Barrel exports (`lib/calendar/index.ts`)** — public API exports: `CalendarProvider`, `CalendarCore`, `useCalendarStrategy`, all types (`CalendarBlock`, `CalendarStrategy`, `ConfirmedBooking`, `ViewMode`, `BlockType`), and all three factory functions. Utils are internal — strategies and CalendarCore import them directly, consumers don't need them.

9. **`allowRangeSelect`** — CalendarCore reads this flag to enable/disable drag-to-select behavior on the grid. For MVP with `ClientStrategy` (where it's `false`), CalendarCore simply ignores it. The flag is part of the interface so `StaffStrategy` can enable it when implemented without changing CalendarCore's API.
