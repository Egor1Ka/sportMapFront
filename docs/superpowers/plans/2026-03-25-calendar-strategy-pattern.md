# Calendar Strategy Pattern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor BookingCalendar into CalendarCore + pluggable strategies (Strategy Pattern via factory functions)

**Architecture:** CalendarProvider injects strategy via React Context. CalendarCore is a dumb renderer that positions blocks from `strategy.getBlocks()`. Each context (client/staff/org) is a separate factory function returning `CalendarStrategy`. Existing components (BookingPanel, ServiceList, SlotModeSelector) are composed by strategies, not modified.

**Tech Stack:** React 19, Next.js 16 (App Router), TypeScript 5, Tailwind CSS 4, shadcn/ui (base-nova), lucide-react

**Spec:** `docs/superpowers/specs/2026-03-25-calendar-strategy-pattern-design.md`

---

## File Structure

| Action   | File                                              | Responsibility                                                                                                                                                 |
| -------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE   | `lib/calendar/types.ts`                           | All shared types: CalendarBlock, CalendarStrategy, ConfirmedBooking, ViewMode, BlockType                                                                       |
| CREATE   | `lib/calendar/utils.ts`                           | Rendering constants, positioning fns, date helpers, locale formatters (from calendar-utils.ts)                                                                 |
| CREATE   | `lib/calendar/CalendarContext.tsx`                | CalendarProvider + useCalendarStrategy hook                                                                                                                    |
| CREATE   | `lib/calendar/CalendarCore.tsx`                   | Dumb renderer: responsive layout + header + day/week/month grids + block positioning. No domain types — week/month views also use strategy.getBlocks() per day |
| CREATE   | `lib/calendar/strategies/createClientStrategy.ts` | Client booking strategy (migrates BookingCalendar logic)                                                                                                       |
| CREATE   | `lib/calendar/strategies/createStaffStrategy.ts`  | Staff schedule stub                                                                                                                                            |
| CREATE   | `lib/calendar/strategies/createOrgStrategy.ts`    | Org overview stub                                                                                                                                              |
| CREATE   | `lib/calendar/index.ts`                           | Barrel re-exports                                                                                                                                              |
| MODIFY   | `components/booking/BookingPanel.tsx`             | Update ConfirmedBooking import path                                                                                                                            |
| REFACTOR | `app/[locale]/book/[staffSlug]/BookingPage.tsx`   | Create strategy + Provider, remove render orchestration                                                                                                        |
| MODIFY   | `app/[locale]/book/[staffSlug]/page.tsx`          | Switch to named import                                                                                                                                         |
| DELETE   | `components/booking/BookingCalendar.tsx`          | Replaced by CalendarCore + strategies                                                                                                                          |
| DELETE   | `components/booking/BookingWeekView.tsx`          | Week view moves into CalendarCore                                                                                                                              |
| DELETE   | `components/booking/BookingMonthView.tsx`         | Month view moves into CalendarCore                                                                                                                             |
| DELETE   | `components/booking/calendar-utils.ts`            | Migrated to lib/calendar/types.ts + utils.ts                                                                                                                   |

---

### Task 1: Create types

**Files:**

- Create: `lib/calendar/types.ts`

- [ ] **Step 1: Create types file**

```typescript
import type { ReactNode } from 'react'

type ViewMode = 'day' | 'week' | 'month'

type BlockType = 'booking' | 'dropzone' | 'pending' | 'locked' | 'workHours'

interface CalendarBlock {
	id: string
	startMin: number
	duration: number
	date: string
	color: string
	opacity?: number
	borderStyle?: 'solid' | 'dashed'
	label?: string
	sublabel?: string
	onClick?: () => void
	draggable?: boolean
	blockType: BlockType
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
	allowRangeSelect: boolean
	getTitle(date: string, view: ViewMode): string
}

export type {
	ViewMode,
	BlockType,
	CalendarBlock,
	ConfirmedBooking,
	CalendarStrategy,
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `lib/calendar/types.ts`

---

### Task 2: Create utils

**Files:**

- Create: `lib/calendar/utils.ts`
- Source: `components/booking/calendar-utils.ts` (all exports migrate here)

- [ ] **Step 1: Create utils file**

Migrate all exports from `calendar-utils.ts`. Add navigation helpers from `BookingPage.tsx` (`addDays`, `addMonths`).

```typescript
import type { Booking } from '@/lib/mock'

const DISPLAY_START = 9 * 60
const PX_PER_HOUR = 48
const TOTAL_HOURS = 10

const createHourLabel = (_: unknown, i: number): number => 9 + i
const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, createHourLabel)

const UA_DAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const UA_DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const UA_MONTHS = [
	'Січ',
	'Лют',
	'Бер',
	'Квіт',
	'Трав',
	'Черв',
	'Лип',
	'Серп',
	'Вер',
	'Жовт',
	'Лист',
	'Груд',
]
const UA_MONTHS_FULL = [
	'Січень',
	'Лютий',
	'Березень',
	'Квітень',
	'Травень',
	'Червень',
	'Липень',
	'Серпень',
	'Вересень',
	'Жовтень',
	'Листопад',
	'Грудень',
]

const minutesToPx = (min: number): number =>
	((min - DISPLAY_START) / 60) * PX_PER_HOUR

const durationToPx = (min: number): number => (min / 60) * PX_PER_HOUR

const formatHour = (hour: number): string =>
	`${String(hour).padStart(2, '0')}:00`

const formatDateISO = (d: Date): string => {
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const getTodayStr = (): string => formatDateISO(new Date())

const formatDateUA = (dateStr: string): string => {
	const d = new Date(dateStr + 'T00:00:00')
	return `${UA_DAYS[d.getDay()]}, ${d.getDate()} ${UA_MONTHS[d.getMonth()]}`
}

const formatWeekRange = (dates: string[]): string => {
	const first = new Date(dates[0] + 'T00:00:00')
	const last = new Date(dates[6] + 'T00:00:00')
	if (first.getMonth() === last.getMonth()) {
		return `${first.getDate()} – ${last.getDate()} ${UA_MONTHS[first.getMonth()]} ${first.getFullYear()}`
	}
	return `${first.getDate()} ${UA_MONTHS[first.getMonth()]} – ${last.getDate()} ${UA_MONTHS[last.getMonth()]} ${last.getFullYear()}`
}

const formatMonth = (dateStr: string): string => {
	const d = new Date(dateStr + 'T00:00:00')
	return `${UA_MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

const getBookingsForDate = (bookings: Booking[], date: string): Booking[] => {
	const matchesDate = (b: Booking): boolean => b.date === date
	return bookings.filter(matchesDate)
}

const getWeekStart = (dateStr: string): Date => {
	const d = new Date(dateStr + 'T00:00:00')
	const dayOfWeek = d.getDay()
	const diff = (dayOfWeek + 6) % 7
	const monday = new Date(d)
	monday.setDate(d.getDate() - diff)
	return monday
}

const createWeekDate =
	(monday: Date) =>
	(_: unknown, i: number): string => {
		const day = new Date(monday)
		day.setDate(monday.getDate() + i)
		return formatDateISO(day)
	}

const getWeekDates = (dateStr: string): string[] => {
	const monday = getWeekStart(dateStr)
	return Array.from({ length: 7 }, createWeekDate(monday))
}

const getMonthGrid = (dateStr: string): (string | null)[][] => {
	const d = new Date(dateStr + 'T00:00:00')
	const year = d.getFullYear()
	const month = d.getMonth()
	const firstDayWeekday = (new Date(year, month, 1).getDay() + 6) % 7
	const totalDays = new Date(year, month + 1, 0).getDate()
	const totalCells = firstDayWeekday + totalDays
	const rowCount = Math.ceil(totalCells / 7)

	const cellToDate = (_: unknown, i: number): string | null => {
		const dayNum = i - firstDayWeekday + 1
		if (dayNum < 1 || dayNum > totalDays) return null
		return `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
	}

	const allCells = Array.from({ length: rowCount * 7 }, cellToDate)

	const toRow = (_: unknown, rowIdx: number): (string | null)[] =>
		allCells.slice(rowIdx * 7, rowIdx * 7 + 7)

	return Array.from({ length: rowCount }, toRow)
}

const addDays = (dateStr: string, days: number): string => {
	const date = new Date(dateStr + 'T00:00:00')
	date.setDate(date.getDate() + days)
	return formatDateISO(date)
}

const addMonths = (dateStr: string, months: number): string => {
	const date = new Date(dateStr + 'T00:00:00')
	date.setMonth(date.getMonth() + months)
	return formatDateISO(date)
}

export {
	DISPLAY_START,
	PX_PER_HOUR,
	TOTAL_HOURS,
	HOUR_LABELS,
	UA_DAYS,
	UA_DAYS_SHORT,
	UA_MONTHS,
	UA_MONTHS_FULL,
	minutesToPx,
	durationToPx,
	formatHour,
	formatDateISO,
	getTodayStr,
	formatDateUA,
	formatWeekRange,
	formatMonth,
	getBookingsForDate,
	getWeekDates,
	getMonthGrid,
	addDays,
	addMonths,
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `lib/calendar/utils.ts`

---

### Task 3: Create CalendarContext

**Files:**

- Create: `lib/calendar/CalendarContext.tsx`

- [ ] **Step 1: Create context file**

```tsx
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { CalendarStrategy } from './types'

const CalendarContext = createContext<CalendarStrategy | null>(null)

interface CalendarProviderProps {
	strategy: CalendarStrategy
	children: ReactNode
}

function CalendarProvider({ strategy, children }: CalendarProviderProps) {
	return <CalendarContext value={strategy}>{children}</CalendarContext>
}

const useCalendarStrategy = (): CalendarStrategy => {
	const strategy = useContext(CalendarContext)
	if (!strategy)
		throw new Error('useCalendarStrategy must be used within CalendarProvider')
	return strategy
}

export { CalendarProvider, useCalendarStrategy }
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

---

### Task 4: Create CalendarCore

**Files:**

- Create: `lib/calendar/CalendarCore.tsx`

This is the largest file. It migrates rendering logic from BookingCalendar, BookingWeekView, and BookingMonthView into a single dumb renderer that gets all content from the strategy.

- [ ] **Step 1: Create CalendarCore file**

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { timeToMin } from '@/lib/slot-engine'
import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { ChevronLeftIcon, ChevronRightIcon, MenuIcon } from 'lucide-react'
import { useCalendarStrategy } from './CalendarContext'
import type { ViewMode, CalendarBlock } from './types'
import {
	PX_PER_HOUR,
	TOTAL_HOURS,
	HOUR_LABELS,
	UA_DAYS_SHORT,
	minutesToPx,
	durationToPx,
	formatHour,
	getTodayStr,
	getWeekDates,
	getMonthGrid,
	addDays,
	addMonths,
} from './utils'

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
	{ value: 'day', label: 'День' },
	{ value: 'week', label: 'Тиждень' },
	{ value: 'month', label: 'Місяць' },
]

interface CalendarCoreProps {
	date: string
	view: ViewMode
	onViewChange: (view: ViewMode) => void
	onDateChange: (date: string) => void
	workStart: string
	workEnd: string
}

const navigate = (view: ViewMode, date: string, direction: number): string => {
	if (view === 'month') return addMonths(date, direction)
	if (view === 'week') return addDays(date, direction * 7)
	return addDays(date, direction)
}

function CalendarCore({
	date,
	view,
	onViewChange,
	onDateChange,
	workStart,
	workEnd,
}: CalendarCoreProps) {
	const strategy = useCalendarStrategy()
	const [sheetOpen, setSheetOpen] = useState(false)

	const title = strategy.getTitle(date, view)

	const handlePrev = () => onDateChange(navigate(view, date, -1))
	const handleNext = () => onDateChange(navigate(view, date, 1))
	const handleOpenSheet = () => setSheetOpen(true)
	const handleSheetChange = (open: boolean) => setSheetOpen(open)

	const renderViewOption = (option: (typeof VIEW_OPTIONS)[number]) => {
		const isActive = view === option.value
		const handleClick = () => onViewChange(option.value)
		return (
			<Button
				key={option.value}
				variant={isActive ? 'default' : 'ghost'}
				size="xs"
				onClick={handleClick}
			>
				{option.label}
			</Button>
		)
	}

	const renderBlock = (block: CalendarBlock) => {
		const isDashed = block.borderStyle === 'dashed'

		if (isDashed) {
			return (
				<button
					key={block.id}
					type="button"
					onClick={block.onClick}
					className={cn(
						'absolute right-0 left-12 cursor-pointer rounded-md border-2 border-dashed transition-colors',
						'hover:bg-accent/20',
					)}
					style={{
						top: minutesToPx(block.startMin),
						height: durationToPx(block.duration),
						borderColor: block.color,
					}}
				>
					<span className="text-muted-foreground px-2 text-xs">
						{block.label}
					</span>
				</button>
			)
		}

		return (
			<div
				key={block.id}
				className="absolute right-0 left-12 overflow-hidden rounded-md px-2 py-1 text-xs text-white"
				style={{
					top: minutesToPx(block.startMin),
					height: durationToPx(block.duration),
					backgroundColor: block.color,
					opacity: block.opacity ?? 1,
				}}
				onClick={block.onClick}
			>
				{block.label && (
					<div className="truncate font-medium">{block.label}</div>
				)}
				{block.sublabel && <div className="opacity-80">{block.sublabel}</div>}
			</div>
		)
	}

	const renderHourLine = (hour: number) => (
		<div
			key={hour}
			className="absolute right-0 left-0 flex items-start"
			style={{ top: minutesToPx(hour * 60) }}
		>
			<span className="text-muted-foreground w-12 -translate-y-1/2 pr-2 text-right text-xs">
				{formatHour(hour)}
			</span>
			<div className="border-border/50 flex-1 border-t" />
		</div>
	)

	const renderDayView = () => {
		const workStartMin = timeToMin(workStart)
		const workEndMin = timeToMin(workEnd)
		const workTopPx = minutesToPx(workStartMin)
		const workHeightPx = durationToPx(workEndMin - workStartMin)
		const blocks = strategy.getBlocks(date)

		const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
			const target = e.target as HTMLElement
			if (target !== e.currentTarget) return
			const rect = e.currentTarget.getBoundingClientRect()
			const y = e.clientY - rect.top
			const minutes = Math.floor((y / PX_PER_HOUR) * 60) + 9 * 60
			strategy.onCellClick(date, minutes)
		}

		return (
			<div
				className="relative"
				style={{ height: TOTAL_HOURS * PX_PER_HOUR }}
				onClick={handleGridClick}
			>
				<div className="bg-muted/30 absolute inset-0 left-12 rounded-md" />
				<div
					className="bg-card absolute right-0 left-12 rounded-md"
					style={{ top: workTopPx, height: workHeightPx }}
				/>
				{HOUR_LABELS.map(renderHourLine)}
				{blocks.map(renderBlock)}
			</div>
		)
	}

	const renderWeekView = () => {
		const weekDates = getWeekDates(date)
		const today = getTodayStr()
		const workStartMin = timeToMin(workStart)
		const workEndMin = timeToMin(workEnd)
		const workTopPx = minutesToPx(workStartMin)
		const workHeightPx = durationToPx(workEndMin - workStartMin)
		const gridHeight = TOTAL_HOURS * PX_PER_HOUR

		const renderHourLabel = (hour: number) => (
			<div
				key={hour}
				className="text-muted-foreground absolute right-0 -translate-y-1/2 pr-2 text-right text-xs"
				style={{ top: minutesToPx(hour * 60) }}
			>
				{formatHour(hour)}
			</div>
		)

		const renderWeekHourLine = (hour: number) => (
			<div
				key={`line-${hour}`}
				className="border-border/30 absolute right-0 left-0 border-t"
				style={{ top: minutesToPx(hour * 60) }}
			/>
		)

		const renderWeekBlock = (block: CalendarBlock) => (
			<div
				key={block.id}
				className="absolute inset-x-0.5 overflow-hidden rounded-sm px-0.5 text-[10px] leading-tight text-white"
				style={{
					top: minutesToPx(block.startMin),
					height: durationToPx(block.duration),
					backgroundColor: block.color,
					opacity: block.opacity ?? 1,
				}}
			>
				{block.label && (
					<div className="truncate font-medium">{block.label}</div>
				)}
			</div>
		)

		const renderDayHeader = (dayDate: string, index: number) => {
			const isToday = dayDate === today
			const d = new Date(dayDate + 'T00:00:00')
			const dayNum = d.getDate()

			return (
				<div key={`h-${dayDate}`} className="flex-1 py-1 text-center text-xs">
					<div className="text-muted-foreground">{UA_DAYS_SHORT[index]}</div>
					<div
						className={cn(
							'mx-auto mt-0.5',
							isToday &&
								'bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full font-medium',
						)}
					>
						{dayNum}
					</div>
				</div>
			)
		}

		const renderDayColumn = (dayDate: string) => {
			const blocks = strategy.getBlocks(dayDate)
			const isToday = dayDate === today
			const handleClick = () => {
				onDateChange(dayDate)
				onViewChange('day')
			}

			return (
				<button
					key={dayDate}
					type="button"
					onClick={handleClick}
					className={cn(
						'border-border/30 hover:bg-accent/20 relative flex-1 cursor-pointer border-l transition-colors',
						isToday && 'bg-primary/5',
					)}
					style={{ height: gridHeight }}
				>
					<div className="bg-muted/30 absolute inset-0" />
					<div
						className="bg-card absolute inset-x-0"
						style={{ top: workTopPx, height: workHeightPx }}
					/>
					{blocks.map(renderWeekBlock)}
				</button>
			)
		}

		return (
			<div className="flex flex-col">
				<div className="flex">
					<div className="w-12 shrink-0" />
					{weekDates.map(renderDayHeader)}
				</div>
				<div className="flex">
					<div
						className="relative w-12 shrink-0"
						style={{ height: gridHeight }}
					>
						{HOUR_LABELS.map(renderHourLabel)}
					</div>
					<div className="relative flex flex-1" style={{ height: gridHeight }}>
						{HOUR_LABELS.map(renderWeekHourLine)}
						{weekDates.map(renderDayColumn)}
					</div>
				</div>
			</div>
		)
	}

	const renderMonthView = () => {
		const grid = getMonthGrid(date)
		const today = getTodayStr()

		const renderWeekdayHeader = (day: string) => (
			<div
				key={day}
				className="text-muted-foreground p-2 text-center text-xs font-medium"
			>
				{day}
			</div>
		)

		const renderCell = (cellDate: string | null, colIdx: number) => {
			if (!cellDate) {
				return <div key={`empty-${colIdx}`} className="p-2" />
			}

			const blocks = strategy.getBlocks(cellDate)
			const bookingBlocks = blocks.filter((b) => b.blockType === 'booking')
			const isToday = cellDate === today
			const dayNum = new Date(cellDate + 'T00:00:00').getDate()
			const handleClick = () => {
				onDateChange(cellDate)
				onViewChange('day')
			}

			const renderDot = (block: CalendarBlock) => (
				<div
					key={block.id}
					className="size-1.5 rounded-full"
					style={{ backgroundColor: block.color }}
				/>
			)

			return (
				<button
					key={cellDate}
					type="button"
					onClick={handleClick}
					className={cn(
						'hover:bg-muted flex flex-col items-center rounded-md p-2 text-sm transition-colors',
						isToday && 'bg-primary/10 font-bold',
					)}
				>
					<span
						className={cn(
							isToday &&
								'bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full',
						)}
					>
						{dayNum}
					</span>
					{bookingBlocks.length > 0 && (
						<div className="mt-1 flex gap-0.5">
							{bookingBlocks.map(renderDot)}
						</div>
					)}
				</button>
			)
		}

		const renderRow = (row: (string | null)[], rowIdx: number) => (
			<div key={rowIdx} className="grid grid-cols-7">
				{row.map(renderCell)}
			</div>
		)

		return (
			<div className="flex flex-col gap-1">
				<div className="grid grid-cols-7">
					{UA_DAYS_SHORT.map(renderWeekdayHeader)}
				</div>
				{grid.map(renderRow)}
			</div>
		)
	}

	const sidebarWithSheetClose = (
		<div onClick={() => setSheetOpen(false)}>{strategy.renderSidebar()}</div>
	)

	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			<aside className="hidden w-[220px] shrink-0 flex-col border-r p-4 md:flex">
				{strategy.renderSidebar()}
			</aside>

			<main className="flex-1 overflow-auto p-4">
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1">
							<Button variant="ghost" size="icon-sm" onClick={handlePrev}>
								<ChevronLeftIcon />
							</Button>
							<h2 className="min-w-[140px] text-center text-lg font-semibold">
								{title}
							</h2>
							<Button variant="ghost" size="icon-sm" onClick={handleNext}>
								<ChevronRightIcon />
							</Button>
						</div>
						<div className="flex gap-1">
							{VIEW_OPTIONS.map(renderViewOption)}
						</div>
					</div>

					{view === 'day' && renderDayView()}
					{view === 'week' && renderWeekView()}
					{view === 'month' && renderMonthView()}
				</div>
			</main>

			<aside className="w-full shrink-0 border-t p-4 md:w-[220px] md:border-t-0 md:border-l">
				{strategy.renderPanel()}
			</aside>

			<Button
				variant="outline"
				size="icon"
				className="fixed bottom-4 left-4 z-50 shadow-lg md:hidden"
				onClick={handleOpenSheet}
			>
				<MenuIcon />
			</Button>

			<Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
				<SheetContent side="bottom">
					<SheetHeader>
						<SheetTitle>Послуги та режим</SheetTitle>
					</SheetHeader>
					<div className="p-4">{sidebarWithSheetClose}</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}

export { CalendarCore }
```

**Key design points:**

- No domain types imported — CalendarCore doesn't know about `Booking`, `Service`, etc.
- `timeToMin` is a static import at the top (used for workStart/workEnd positioning)
- Week view calls `strategy.getBlocks(dayDate)` per day column — strategy controls what blocks appear
- Month view calls `strategy.getBlocks(cellDate)` per cell, filters `blockType === 'booking'` for dots
- Mobile Sheet wraps sidebar in a `div onClick` to auto-close on any button click inside
- `allBookings` is NOT a prop — CalendarCore gets everything from strategy

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

---

### Task 5: Create ClientStrategy

**Files:**

- Create: `lib/calendar/strategies/createClientStrategy.ts`

This migrates business logic from BookingCalendar (block rendering) into `getBlocks()`, and composes existing components in `renderSidebar()` / `renderPanel()`.

- [ ] **Step 1: Create strategy file**

```tsx
import React from 'react'
import type {
	CalendarStrategy,
	CalendarBlock,
	ConfirmedBooking,
	ViewMode,
} from '../types'
import {
	formatDateUA,
	formatWeekRange,
	formatMonth,
	getWeekDates,
	getBookingsForDate,
} from '../utils'
import {
	getAvailableSlots,
	timeToMin,
	minToTime,
	type SlotMode,
	type Slot,
} from '@/lib/slot-engine'
import type { Service, Booking, Schedule } from '@/lib/mock'
import { ServiceList } from '@/components/booking/ServiceList'
import { SlotModeSelector } from '@/components/booking/SlotModeSelector'
import { BookingPanel } from '@/components/booking/BookingPanel'
import { Separator } from '@/components/ui/separator'

interface ClientStrategyParams {
	services: Service[]
	bookings: Booking[]
	schedule: Schedule
	staffName: string
	selectedServiceSlug: string | null
	selectedSlot: string | null
	slotMode: SlotMode
	confirmedBooking: ConfirmedBooking | null
	date: string
	onSelectService: (slug: string) => void
	onSelectSlot: (time: string) => void
	onConfirm: () => void
	onCancel: () => void
	onResetSlot: () => void
	onModeChange: (mode: SlotMode) => void
}

const findService = (
	services: Service[],
	slug: string | null,
): Service | null => services.find((s) => s.slug === slug) ?? null

const createClientStrategy = (
	params: ClientStrategyParams,
): CalendarStrategy => {
	const {
		services,
		bookings,
		schedule,
		staffName,
		selectedServiceSlug,
		selectedSlot,
		slotMode,
		confirmedBooking,
		date,
		onSelectService,
		onSelectSlot,
		onConfirm,
		onCancel,
		onResetSlot,
		onModeChange,
	} = params

	const selectedService = findService(services, selectedServiceSlug)

	const allBookings = (() => {
		if (!confirmedBooking || !selectedService) return bookings
		const confirmedStartMin = timeToMin(confirmedBooking.startTime)
		return [
			...bookings,
			{
				startMin: confirmedStartMin,
				duration: selectedService.durationMin,
				label: selectedService.name,
				color: selectedService.color,
				date: confirmedBooking.date,
			},
		]
	})()

	return {
		getBlocks(blockDate: string): CalendarBlock[] {
			const dayBookings = getBookingsForDate(allBookings, blockDate)

			const toBookingBlock = (
				booking: Booking,
				index: number,
			): CalendarBlock => ({
				id: `booking-${blockDate}-${index}`,
				startMin: booking.startMin,
				duration: booking.duration,
				date: blockDate,
				color: booking.color,
				label: booking.label,
				sublabel: `${minToTime(booking.startMin)}–${minToTime(booking.startMin + booking.duration)}`,
				blockType: 'booking',
			})

			const bookingBlocks = dayBookings.map(toBookingBlock)

			if (!selectedService || confirmedBooking) return bookingBlocks

			const dayBookingsForSlots = getBookingsForDate(bookings, blockDate)
			const slots = getAvailableSlots({
				workStart: schedule.workStart,
				workEnd: schedule.workEnd,
				duration: selectedService.durationMin,
				slotStep: schedule.slotStepMin,
				slotMode,
				bookings: dayBookingsForSlots,
				minNotice: 30,
				nowMin: 0,
			})

			const toDropZoneBlock = (slot: Slot): CalendarBlock | null => {
				if (selectedSlot === slot.startTime) return null

				return {
					id: `slot-${blockDate}-${slot.startMin}`,
					startMin: slot.startMin,
					duration: selectedService.durationMin,
					date: blockDate,
					color: slot.isExtra ? '#FB923C' : selectedService.color,
					borderStyle: 'dashed' as const,
					label: slot.startTime,
					blockType: 'dropzone',
					onClick: () => onSelectSlot(slot.startTime),
				}
			}

			const isNotNull = <T,>(v: T | null): v is T => v !== null
			const dropZoneBlocks = slots.map(toDropZoneBlock).filter(isNotNull)

			const pendingBlock: CalendarBlock[] = (() => {
				if (!selectedSlot || blockDate !== date) return []
				const slotMin = timeToMin(selectedSlot)
				return [
					{
						id: `pending-${blockDate}`,
						startMin: slotMin,
						duration: selectedService.durationMin,
						date: blockDate,
						color: selectedService.color,
						opacity: 0.6,
						label: selectedService.name,
						sublabel: `${selectedSlot}–${minToTime(slotMin + selectedService.durationMin)}`,
						blockType: 'pending',
					},
				]
			})()

			return [...bookingBlocks, ...dropZoneBlocks, ...pendingBlock]
		},

		renderSidebar() {
			return React.createElement(
				React.Fragment,
				null,
				React.createElement(ServiceList, {
					services,
					selectedSlug: selectedServiceSlug,
					onSelect: onSelectService,
				}),
				React.createElement(Separator, { className: 'my-4' }),
				React.createElement(SlotModeSelector, {
					value: slotMode,
					onChange: onModeChange,
				}),
			)
		},

		renderPanel() {
			return React.createElement(BookingPanel, {
				selectedService,
				selectedSlot,
				slotMode,
				confirmedBooking,
				onConfirm,
				onCancel,
				onResetSlot,
			})
		},

		onCellClick(clickDate: string, startMin: number) {
			if (!selectedService) return
			const dayBookingsForSlots = getBookingsForDate(bookings, clickDate)
			const slots = getAvailableSlots({
				workStart: schedule.workStart,
				workEnd: schedule.workEnd,
				duration: selectedService.durationMin,
				slotStep: schedule.slotStepMin,
				slotMode,
				bookings: dayBookingsForSlots,
				minNotice: 30,
				nowMin: 0,
			})

			const isAfterClick = (slot: { startMin: number }): boolean =>
				slot.startMin >= startMin
			const nearest = slots.find(isAfterClick)
			if (nearest) onSelectSlot(nearest.startTime)
		},

		allowRangeSelect: false,

		getTitle(titleDate: string, view: ViewMode): string {
			if (view === 'week')
				return `${staffName} — ${formatWeekRange(getWeekDates(titleDate))}`
			if (view === 'month') return `${staffName} — ${formatMonth(titleDate)}`
			return `${staffName} — ${formatDateUA(titleDate)}`
		},
	}
}

export { createClientStrategy }
export type { ClientStrategyParams }
```

**Key decisions:**

- `allBookings` merges existing + confirmed inside the strategy (moved from BookingPage's `useMemo`)
- `getBlocks()` generates slot-engine slots only for day view and only when a service is selected
- `renderSidebar()` / `renderPanel()` use `React.createElement` in the plan code. **The implementation file MUST be `.tsx`** — use JSX directly instead of `React.createElement` for readability. The file is named `.ts` in the plan for illustration only.
- Drop zone color: `service.color` for regular, `#FB923C` (orange-400) for extra — intentional UX change per spec
- `onCellClick` finds nearest available slot at or after the clicked position

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

---

### Task 6: Create stub strategies

**Files:**

- Create: `lib/calendar/strategies/createStaffStrategy.ts`
- Create: `lib/calendar/strategies/createOrgStrategy.ts`

- [ ] **Step 1: Create StaffStrategy stub**

```tsx
import React from 'react'
import type { CalendarStrategy, CalendarBlock, ViewMode } from '../types'
import {
	formatDateUA,
	formatWeekRange,
	formatMonth,
	getWeekDates,
	getBookingsForDate,
} from '../utils'
import { minToTime } from '@/lib/slot-engine'
import type { Booking } from '@/lib/mock'

interface StaffStrategyParams {
	staffName: string
	bookings: Booking[]
}

const createStaffStrategy = (params: StaffStrategyParams): CalendarStrategy => {
	const { staffName, bookings } = params

	return {
		getBlocks(date: string): CalendarBlock[] {
			const dayBookings = getBookingsForDate(bookings, date)

			const toBlock = (booking: Booking, index: number): CalendarBlock => ({
				id: `staff-booking-${date}-${index}`,
				startMin: booking.startMin,
				duration: booking.duration,
				date,
				color: booking.color,
				label: booking.label,
				sublabel: `${minToTime(booking.startMin)}–${minToTime(booking.startMin + booking.duration)}`,
				blockType: 'booking',
			})

			return dayBookings.map(toBlock)
		},

		renderSidebar() {
			return React.createElement(
				'div',
				{ className: 'text-sm text-muted-foreground p-4' },
				'Управління розкладом (в розробці)',
			)
		},

		renderPanel() {
			return React.createElement(
				'div',
				{ className: 'text-sm text-muted-foreground p-4' },
				'Деталі запису (в розробці)',
			)
		},

		onCellClick() {},

		allowRangeSelect: true,

		getTitle(date: string, view: ViewMode): string {
			if (view === 'week')
				return `Мій розклад — ${formatWeekRange(getWeekDates(date))}`
			if (view === 'month') return `Мій розклад — ${formatMonth(date)}`
			return `Мій розклад — ${formatDateUA(date)}`
		},
	}
}

export { createStaffStrategy }
export type { StaffStrategyParams }
```

- [ ] **Step 2: Create OrgStrategy stub**

```tsx
import React from 'react'
import type { CalendarStrategy, CalendarBlock, ViewMode } from '../types'
import {
	formatDateUA,
	formatWeekRange,
	formatMonth,
	getWeekDates,
	getBookingsForDate,
} from '../utils'
import { minToTime } from '@/lib/slot-engine'
import type { Booking } from '@/lib/mock'

interface OrgStrategyParams {
	orgName: string
	bookings: Booking[]
}

const createOrgStrategy = (params: OrgStrategyParams): CalendarStrategy => {
	const { orgName, bookings } = params

	return {
		getBlocks(date: string): CalendarBlock[] {
			const dayBookings = getBookingsForDate(bookings, date)

			const toBlock = (booking: Booking, index: number): CalendarBlock => ({
				id: `org-booking-${date}-${index}`,
				startMin: booking.startMin,
				duration: booking.duration,
				date,
				color: booking.color,
				label: booking.label,
				sublabel: `${minToTime(booking.startMin)}–${minToTime(booking.startMin + booking.duration)}`,
				blockType: 'booking',
			})

			return dayBookings.map(toBlock)
		},

		renderSidebar() {
			return React.createElement(
				'div',
				{ className: 'text-sm text-muted-foreground p-4' },
				'Фільтри команди (в розробці)',
			)
		},

		renderPanel() {
			return React.createElement(
				'div',
				{ className: 'text-sm text-muted-foreground p-4' },
				'Деталі співробітника (в розробці)',
			)
		},

		onCellClick() {},

		allowRangeSelect: false,

		getTitle(date: string, view: ViewMode): string {
			if (view === 'week')
				return `${orgName} — ${formatWeekRange(getWeekDates(date))}`
			if (view === 'month') return `${orgName} — ${formatMonth(date)}`
			return `${orgName} — ${formatDateUA(date)}`
		},
	}
}

export { createOrgStrategy }
export type { OrgStrategyParams }
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

---

### Task 7: Create barrel exports

**Files:**

- Create: `lib/calendar/index.ts`

- [ ] **Step 1: Create index file**

```typescript
export type {
	ViewMode,
	BlockType,
	CalendarBlock,
	ConfirmedBooking,
	CalendarStrategy,
} from './types'

export { CalendarProvider, useCalendarStrategy } from './CalendarContext'
export { CalendarCore } from './CalendarCore'

export { createClientStrategy } from './strategies/createClientStrategy'
export type { ClientStrategyParams } from './strategies/createClientStrategy'

export { createStaffStrategy } from './strategies/createStaffStrategy'
export type { StaffStrategyParams } from './strategies/createStaffStrategy'

export { createOrgStrategy } from './strategies/createOrgStrategy'
export type { OrgStrategyParams } from './strategies/createOrgStrategy'
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

---

### Task 8: Update BookingPanel import

**Files:**

- Modify: `components/booking/BookingPanel.tsx:6`

- [ ] **Step 1: Change ConfirmedBooking import**

Replace line 6:

```typescript
// Before:
import type { ConfirmedBooking } from '@/components/booking/calendar-utils'

// After:
import type { ConfirmedBooking } from '@/lib/calendar/types'
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

---

### Task 9: Refactor BookingPage

**Files:**

- Refactor: `app/[locale]/book/[staffSlug]/BookingPage.tsx`

This is the key integration point. BookingPage creates the strategy and wraps CalendarCore in CalendarProvider.

- [ ] **Step 1: Rewrite BookingPage**

```tsx
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { services, schedule, existingBookings, staff } from '@/lib/mock'
import { type SlotMode } from '@/lib/slot-engine'
import {
	type ViewMode,
	type ConfirmedBooking,
	CalendarProvider,
	CalendarCore,
	createClientStrategy,
} from '@/lib/calendar'
import { formatDateISO } from '@/lib/calendar/utils'

const todayStr = (): string => formatDateISO(new Date())

interface BookingPageProps {
	staffSlug: string
}

function BookingPage({ staffSlug }: BookingPageProps) {
	const searchParams = useSearchParams()
	const router = useRouter()

	const serviceSlug = searchParams.get('service')
	const dateStr = searchParams.get('date') ?? todayStr()
	const selectedSlotTime = searchParams.get('slot')
	const slotMode = (searchParams.get('mode') as SlotMode) ?? 'fixed'
	const view = (searchParams.get('view') as ViewMode) ?? 'day'

	const [confirmedBooking, setConfirmedBooking] =
		useState<ConfirmedBooking | null>(null)

	const setParams = (updates: Record<string, string | null>) => {
		const params = new URLSearchParams(searchParams.toString())
		const applyEntry = ([key, value]: [string, string | null]) => {
			if (value === null) params.delete(key)
			else params.set(key, value)
		}
		Object.entries(updates).forEach(applyEntry)
		router.replace(`?${params.toString()}`, { scroll: false })
	}

	const handleServiceSelect = (slug: string) => {
		setParams({ service: slug, slot: null })
		setConfirmedBooking(null)
	}

	const handleSlotSelect = (time: string) => {
		setParams({ slot: time })
	}

	const handleModeChange = (mode: SlotMode) => {
		setParams({ mode, slot: null })
		setConfirmedBooking(null)
	}

	const handleViewChange = (newView: ViewMode) => {
		setParams({ view: newView, slot: null })
	}

	const handleDateChange = (newDate: string) => {
		setParams({ date: newDate, slot: null })
		setConfirmedBooking(null)
	}

	const handleConfirm = () => {
		if (!serviceSlug || !selectedSlotTime) return
		setConfirmedBooking({
			serviceSlug,
			startTime: selectedSlotTime,
			date: dateStr,
		})
	}

	const handleCancel = () => {
		setConfirmedBooking(null)
		setParams({ slot: null })
	}

	const handleResetSlot = () => {
		setParams({ slot: null })
	}

	const strategy = useMemo(
		() =>
			createClientStrategy({
				services,
				bookings: existingBookings,
				schedule,
				staffName: staff.name,
				selectedServiceSlug: serviceSlug,
				selectedSlot: selectedSlotTime,
				slotMode,
				confirmedBooking,
				date: dateStr,
				onSelectService: handleServiceSelect,
				onSelectSlot: handleSlotSelect,
				onConfirm: handleConfirm,
				onCancel: handleCancel,
				onResetSlot: handleResetSlot,
				onModeChange: handleModeChange,
			}),
		[serviceSlug, dateStr, selectedSlotTime, slotMode, confirmedBooking],
	)

	return (
		<CalendarProvider strategy={strategy}>
			<CalendarCore
				date={dateStr}
				view={view}
				onViewChange={handleViewChange}
				onDateChange={handleDateChange}
				workStart={schedule.workStart}
				workEnd={schedule.workEnd}
			/>
		</CalendarProvider>
	)
}

export { BookingPage }
```

**Key changes from current BookingPage:**

- Removed: all direct component imports (BookingCalendar, BookingPanel, ServiceList, SlotModeSelector, Sheet)
- Removed: `allBookings` and `slots` useMemo (moved into strategy's `getBlocks()`)
- Removed: `leftPanel`, `sheetOpen`, mobile Sheet (moved into CalendarCore)
- Removed: `handlePrev`, `handleNext`, `handleSelectDate` (CalendarCore handles navigation)
- Removed: `NAVIGATION_STEPS`, `addDays`, `addMonths` (moved into `lib/calendar/utils`)
- Removed: all direct component imports (BookingCalendar, BookingPanel, ServiceList, SlotModeSelector, Sheet)
- Added: `useMemo` for strategy creation
- Changed: `export default BookingPage` → `export { BookingPage }` (named export per project convention)
- CalendarCore has NO `allBookings` prop — all data flows through strategy

- [ ] **Step 2: Update page.tsx to use named import**

Modify `app/[locale]/book/[staffSlug]/page.tsx`:

```tsx
// Before:
import BookingPage from './BookingPage'

// After:
import { BookingPage } from './BookingPage'
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

---

### Task 10: Delete old files

**Files:**

- Delete: `components/booking/BookingCalendar.tsx`
- Delete: `components/booking/BookingWeekView.tsx`
- Delete: `components/booking/BookingMonthView.tsx`
- Delete: `components/booking/calendar-utils.ts`

- [ ] **Step 1: Delete replaced files**

```bash
rm components/booking/BookingCalendar.tsx
rm components/booking/BookingWeekView.tsx
rm components/booking/BookingMonthView.tsx
rm components/booking/calendar-utils.ts
```

- [ ] **Step 2: Verify no import errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors — all imports should now point to `lib/calendar/`

---

### Task 11: Build verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 3: Run format check**

Run: `npm run format:check`
If fails, run `npm run format` to auto-fix, then verify.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

Verify in browser at `http://localhost:3000/en/book/anna-kovalenko`:

1. Service selection works (left panel)
2. Slot mode switching works
3. Day view shows bookings + drop zones when service selected
4. Clicking drop zone shows pending slot
5. Confirm/cancel flow works
6. Week view shows bookings with colored blocks
7. Month view shows booking dots
8. Clicking day in week/month drills down to day view
9. Navigation (prev/next) works in all 3 views
10. Mobile: hamburger button opens Sheet with services
