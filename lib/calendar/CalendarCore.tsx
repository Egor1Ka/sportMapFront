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
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { useCalendarStrategy } from './CalendarContext'
import { useViewConfig } from './CalendarViewConfigContext'
import { GreyBlock } from '@/components/booking/GreyBlock'
import type { ViewMode, CalendarBlock } from './types'
import type { CalendarViewConfig } from './view-config'
import {
	PX_PER_HOUR,
	TOTAL_HOURS,
	HOUR_LABELS,
	getCalendarLocale,
	minutesToPx,
	durationToPx,
	formatHour,
	getTodayStr,
	getWeekDates,
	getMonthGrid,
	addDays,
	addMonths,
} from './utils'

const DEFAULT_VIEW_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: false,
	allowStaffOnlySelection: false,
}

type ViewOption = { value: ViewMode; labelKey: string }

const VIEW_OPTIONS: ViewOption[] = [
	{ value: 'day', labelKey: 'day' },
	{ value: 'week', labelKey: 'week' },
	{ value: 'month', labelKey: 'month' },
]

interface CalendarCoreProps {
	date: string
	view: ViewMode
	onViewChange: (view: ViewMode) => void
	onDateChange: (date: string) => void
	onDayClick?: (date: string) => void
	workStart: string
	workEnd: string
	disabledDays?: number[]
	staffTabsSlot?: React.ReactNode
	columnHeaderSlot?: (dayDate: string, index: number) => React.ReactNode
}

const navigate = (view: ViewMode, date: string, direction: number): string => {
	if (view === 'month') return addMonths(date, direction)
	if (view === 'week') return addDays(date, direction * 7)
	return addDays(date, direction)
}

const useSafeViewConfig = (): CalendarViewConfig => {
	try {
		return useViewConfig()
	} catch {
		return DEFAULT_VIEW_CONFIG
	}
}

function CalendarCore({
	date,
	view,
	onViewChange,
	onDateChange,
	onDayClick,
	workStart,
	workEnd,
	disabledDays = [],
	staffTabsSlot,
	columnHeaderSlot,
}: CalendarCoreProps) {
	const strategy = useCalendarStrategy()
	const viewConfig = useSafeViewConfig()
	const [sheetOpen, setSheetOpen] = useState(false)
	const t = useTranslations('calendar')
	const locale = useLocale()
	const calendarLocale = getCalendarLocale(locale)

	const title = strategy.getTitle(date, view)

	const handlePrev = () => onDateChange(navigate(view, date, -1))
	const handleNext = () => onDateChange(navigate(view, date, 1))
	const handleOpenSheet = () => setSheetOpen(true)
	const handleSheetChange = (open: boolean) => setSheetOpen(open)

	const renderViewOption = (option: ViewOption) => {
		const isActive = view === option.value
		const handleClick = () => onViewChange(option.value)
		return (
			<Button
				key={option.value}
				variant={isActive ? 'default' : 'ghost'}
				size="xs"
				onClick={handleClick}
			>
				{t(option.labelKey)}
			</Button>
		)
	}

	const renderBookingBlock = (block: CalendarBlock) => {
		const handleBlockClick = (e: React.MouseEvent) => {
			if (viewConfig.onBlockClick === 'none') {
				e.stopPropagation()
				return
			}
			block.onClick?.()
		}

		return (
			<div
				key={block.id}
				className={cn(
					'absolute right-0 left-12 overflow-hidden rounded-md px-2 py-1 text-xs text-white',
					viewConfig.onBlockClick === 'open-booking-details' &&
						'cursor-pointer',
				)}
				style={{
					top: minutesToPx(block.startMin),
					height: durationToPx(block.duration),
					backgroundColor: block.color,
					opacity: block.opacity ?? 1,
				}}
				onClick={handleBlockClick}
			>
				{block.label && (
					<div className="truncate font-medium">{block.label}</div>
				)}
				{block.sublabel && <div className="opacity-80">{block.sublabel}</div>}
			</div>
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

		if (block.blockType === 'booking') {
			if (viewConfig.blockedTimeVisibility === 'hidden') return null
			if (viewConfig.blockedTimeVisibility === 'grey')
				return <GreyBlock key={block.id} block={block} />
			return renderBookingBlock(block)
		}

		return renderBookingBlock(block)
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
			if (viewConfig.onEmptyCellClick === 'none') return
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

		const renderWeekBlock = (block: CalendarBlock) => {
			const isDashed = block.borderStyle === 'dashed'

			if (isDashed) {
				return (
					<button
						key={block.id}
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							block.onClick?.()
						}}
						className="hover:bg-accent/20 absolute inset-x-0.5 cursor-pointer rounded-sm border border-dashed transition-colors"
						style={{
							top: minutesToPx(block.startMin),
							height: durationToPx(block.duration),
							borderColor: block.color,
						}}
					>
						<span className="text-muted-foreground px-0.5 text-[10px]">
							{block.label}
						</span>
					</button>
				)
			}

			if (block.blockType === 'booking') {
				if (viewConfig.blockedTimeVisibility === 'hidden') return null
				if (viewConfig.blockedTimeVisibility === 'grey') {
					return (
						<div
							key={block.id}
							className="bg-muted pointer-events-none absolute inset-x-0.5 cursor-default rounded-sm"
							style={{
								top: minutesToPx(block.startMin),
								height: durationToPx(block.duration),
								opacity: 0.6,
							}}
						/>
					)
				}
			}

			const handleWeekBlockClick = (e: React.MouseEvent) => {
				e.stopPropagation()
				if (
					block.blockType === 'booking' &&
					viewConfig.onBlockClick === 'none'
				)
					return
				block.onClick?.()
			}

			return (
				<div
					key={block.id}
					className="absolute inset-x-0.5 overflow-hidden rounded-sm px-0.5 text-[10px] leading-tight text-white"
					style={{
						top: minutesToPx(block.startMin),
						height: durationToPx(block.duration),
						backgroundColor: block.color,
						opacity: block.opacity ?? 1,
					}}
					onClick={handleWeekBlockClick}
				>
					{block.label && (
						<div className="truncate font-medium">{block.label}</div>
					)}
				</div>
			)
		}

		const isDayDisabled = (dayDate: string): boolean => {
			const dayOfWeek = new Date(dayDate + 'T00:00:00').getDay()
			return disabledDays.includes(dayOfWeek)
		}

		const renderDefaultDayHeader = (dayDate: string, index: number) => {
			const isToday = dayDate === today
			const isSelected = dayDate === date
			const isDisabled = isDayDisabled(dayDate)
			const d = new Date(dayDate + 'T00:00:00')
			const dayNum = d.getDate()

			return (
				<div
					key={`h-${dayDate}`}
					className={cn(
						'flex-1 py-1 text-center text-xs',
						isDisabled && 'opacity-40',
					)}
				>
					<div className="text-muted-foreground">{calendarLocale.daysShort[index]}</div>
					<div
						className={cn(
							'mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full',
							isToday &&
								!isDisabled &&
								'bg-primary text-primary-foreground font-medium',
							!isToday &&
								isSelected &&
								!isDisabled &&
								'bg-accent font-medium',
						)}
					>
						{dayNum}
					</div>
				</div>
			)
		}

		const renderDayHeader = columnHeaderSlot ?? renderDefaultDayHeader

		const renderDayColumn = (dayDate: string) => {
			const isDisabled = isDayDisabled(dayDate)
			const blocks = isDisabled ? [] : strategy.getBlocks(dayDate)
			const isToday = dayDate === today
			const handleClick = () => {
				if (isDisabled) return
				if (onDayClick) {
					onDayClick(dayDate)
					return
				}
				onDateChange(dayDate)
				onViewChange('day')
			}

			return (
				<button
					key={dayDate}
					type="button"
					onClick={handleClick}
					disabled={isDisabled}
					className={cn(
						'border-border/30 relative flex-1 border-l transition-colors',
						isDisabled
							? 'bg-muted/50 cursor-default'
							: 'hover:bg-accent/20 cursor-pointer',
						isToday && !isDisabled && 'bg-primary/5',
					)}
					style={{ height: gridHeight }}
				>
					{!isDisabled && (
						<>
							<div className="bg-muted/30 absolute inset-0" />
							<div
								className="bg-card absolute inset-x-0"
								style={{ top: workTopPx, height: workHeightPx }}
							/>
						</>
					)}
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
					style={{
						backgroundColor:
							viewConfig.blockedTimeVisibility === 'grey'
								? 'var(--muted-foreground)'
								: block.color,
					}}
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
					{bookingBlocks.length > 0 &&
						viewConfig.blockedTimeVisibility !== 'hidden' && (
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
					{calendarLocale.daysShort.map(renderWeekdayHeader)}
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

					{staffTabsSlot}

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
						<SheetTitle>{t('servicesAndMode')}</SheetTitle>
					</SheetHeader>
					<div className="p-4">{sidebarWithSheetClose}</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}

export { CalendarCore }
