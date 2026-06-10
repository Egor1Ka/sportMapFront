'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { CalendarPlus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination'
import { EventCard } from './event-card'
import { EventCreateSheet } from './event-create-sheet'
import { useEventCreateDialog } from '@/hooks/use-event-create-dialog'
import { useVisibilityPolling } from '@/hooks/use-visibility-polling'
import {
	groupEventsByDate,
	formatGroupLabel,
	type DayGroup,
} from '@/lib/events/group-events-by-date'
import { useUserOptional } from '@/lib/auth/user-provider'
import {
	eventApi,
	ApiError,
	type EventListTime,
	type PlaygroundEvent,
} from '@/services'
import type { SportOption } from './event-form'

const PAGE_SIZE = 10

interface EventListProps {
	playgroundId: string
	sports: SportOption[]
	defaultSportId: string | null
}

const buildPageRange = (
	current: number,
	total: number,
): (number | 'ellipsis')[] => {
	if (total <= 1) return [1]
	const pages = new Set<number>([1, total, current - 1, current, current + 1])
	const sorted = Array.from(pages)
		.filter((page) => page >= 1 && page <= total)
		.sort((a, b) => a - b)
	const range: (number | 'ellipsis')[] = []
	const appendWithEllipsis = (page: number, prev: number | null) => {
		if (prev !== null && page - prev > 1) range.push('ellipsis')
		range.push(page)
	}
	sorted.reduce<number | null>((prev, page) => {
		appendWithEllipsis(page, prev)
		return page
	}, null)
	return range
}

function EventList({ playgroundId, sports, defaultSportId }: EventListProps) {
	const t = useTranslations('events')
	const locale = useLocale()
	const user = useUserOptional()
	const dialog = useEventCreateDialog()

	const [time, setTime] = useState<EventListTime>('upcoming')
	const [page, setPage] = useState(1)
	const [items, setItems] = useState<PlaygroundEvent[]>([])
	const [total, setTotal] = useState(0)
	const [totalPages, setTotalPages] = useState(1)
	const [loading, setLoading] = useState(true)

	const fetchEvents = useCallback(async () => {
		setLoading(true)
		try {
			const res = await eventApi.listByPlayground({
				pathParams: { playgroundId },
				queryParams: { time, page, limit: PAGE_SIZE },
				silent: true,
			})
			setItems(res.items)
			setTotal(res.total)
			setTotalPages(res.totalPages)
		} catch (err) {
			if (err instanceof ApiError && err.status !== 0) {
				setItems([])
				setTotal(0)
				setTotalPages(1)
			}
		} finally {
			setLoading(false)
		}
	}, [playgroundId, time, page])

	useEffect(() => {
		void fetchEvents()
	}, [fetchEvents])

	useVisibilityPolling(fetchEvents, 60_000)

	const handleTimeChange = (value: string) => {
		const next = value === 'past' ? 'past' : 'upcoming'
		if (next === time) return
		setTime(next)
		setPage(1)
	}

	const handlePageClick = (next: number) => (event: React.MouseEvent) => {
		event.preventDefault()
		if (next < 1 || next > totalPages || next === page) return
		setPage(next)
	}

	const handleCreate = () => {
		if (!user) {
			const returnTo =
				typeof window !== 'undefined' ? window.location.pathname : '/'
			window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`
			return
		}
		dialog.open()
	}

	const renderCard = (event: PlaygroundEvent) => (
		<EventCard
			key={event.id}
			event={event}
			locale={locale}
			onChanged={fetchEvents}
		/>
	)

	const renderGroup = (group: DayGroup<PlaygroundEvent>) => {
		const label = formatGroupLabel(group, locale, {
			today: t('today'),
			tomorrow: t('tomorrow'),
			yesterday: t('yesterday'),
		})
		const isAccent = group.dayOffset === 0
		const chipClass = isAccent
			? 'bg-primary/10 text-primary'
			: 'bg-muted text-muted-foreground'
		return (
			<div key={group.key} className="flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<span
						className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${chipClass}`}
					>
						{label}
					</span>
					<span className="text-muted-foreground text-xs">
						{group.events.length}
					</span>
				</div>
				<div className="flex flex-col gap-3">{group.events.map(renderCard)}</div>
			</div>
		)
	}

	const groups = groupEventsByDate(items)
	const pageRange = buildPageRange(page, totalPages)
	const isEmpty = !loading && items.length === 0

	const renderPaginationEntry = (
		entry: number | 'ellipsis',
		index: number,
	) => {
		if (entry === 'ellipsis') {
			return (
				<PaginationItem key={`ellipsis-${index}`}>
					<PaginationEllipsis />
				</PaginationItem>
			)
		}
		return (
			<PaginationItem key={entry}>
				<PaginationLink
					href="#"
					isActive={entry === page}
					onClick={handlePageClick(entry)}
				>
					{entry}
				</PaginationLink>
			</PaginationItem>
		)
	}

	return (
		<section className="flex flex-col gap-6" data-slot="event-list">
			<Tabs value={time} onValueChange={handleTimeChange}>
				<TabsList>
					<TabsTrigger value="upcoming">{t('upcoming')}</TabsTrigger>
					<TabsTrigger value="past">{t('past')}</TabsTrigger>
				</TabsList>
			</Tabs>

			{loading ? (
				<div className="flex flex-col gap-3">
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : isEmpty ? (
				<div className="bg-muted/30 flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
					<div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
						<Sparkles className="size-7" />
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-lg font-semibold">
							{time === 'past' ? t('emptyPastTitle') : t('emptyTitle')}
						</p>
						<p className="text-muted-foreground text-sm">
							{time === 'past' ? t('emptyPastSubtitle') : t('emptySubtitle')}
						</p>
					</div>
					{time === 'upcoming' && (
						<Button onClick={handleCreate} size="lg" className="mt-2 gap-2">
							<CalendarPlus className="size-4" />
							{t('createCta')}
						</Button>
					)}
				</div>
			) : (
				<>
					<div className="flex flex-col gap-6">{groups.map(renderGroup)}</div>
					{time === 'upcoming' && (
						<Button
							onClick={handleCreate}
							variant="outline"
							size="lg"
							className="gap-2 self-start"
						>
							<CalendarPlus className="size-4" />
							{t('createCta')}
						</Button>
					)}
				</>
			)}

			{totalPages > 1 && (
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href="#"
								text={t('prev')}
								onClick={handlePageClick(page - 1)}
								aria-disabled={page <= 1}
								className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
							/>
						</PaginationItem>
						{pageRange.map(renderPaginationEntry)}
						<PaginationItem>
							<PaginationNext
								href="#"
								text={t('next')}
								onClick={handlePageClick(page + 1)}
								aria-disabled={page >= totalPages}
								className={
									page >= totalPages ? 'pointer-events-none opacity-50' : ''
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}

			{total > 0 && (
				<p className="text-muted-foreground text-center text-xs">
					{t('totalCount', { count: total })}
				</p>
			)}

			<EventCreateSheet
				open={dialog.isOpen}
				onOpenChange={dialog.setOpen}
				playgroundId={playgroundId}
				defaultSportId={defaultSportId}
				sports={sports}
				onCreated={fetchEvents}
			/>
		</section>
	)
}

export { EventList }
