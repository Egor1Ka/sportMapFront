'use client'

import { useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { FeedItem } from './activity-types'
import { pickEmojiFromCodes, pickSportEmoji } from './sport-emojis'

const pickSportCode = (sport: { code: string }): string => sport.code

const KM_THRESHOLD = 1000

interface DistanceFormatter {
	formatMeters: (meters: number) => string
	formatKm: (km: string) => string
}

const formatDistance = (
	meters: number | null,
	{ formatMeters, formatKm }: DistanceFormatter,
): string | null => {
	if (meters === null) return null
	if (meters < KM_THRESHOLD) return formatMeters(Math.round(meters))
	return formatKm((meters / KM_THRESHOLD).toFixed(1))
}

const formatRating = (average: number | null): string => {
	if (average === null) return '—'
	return `★ ${average.toFixed(1)}`
}

const buildHref = (playgroundId: string): string => `/sports-map/${playgroundId}`

const MIN_IN_HOUR = 60

const formatTwoDigits = (n: number): string => n.toString().padStart(2, '0')

const formatWallClock = (date: Date): string =>
	`${formatTwoDigits(date.getHours())}:${formatTwoDigits(date.getMinutes())}`

interface SoonLabelDeps {
	startsInMin: number
	startAtIso: string
	sportLabel: string
	tMinutes: (sport: string, minutes: number) => string
	tHours: (sport: string, hours: number) => string
	tTomorrow: (sport: string, time: string) => string
}

const buildSoonTitle = ({
	startsInMin,
	startAtIso,
	sportLabel,
	tMinutes,
	tHours,
	tTomorrow,
}: SoonLabelDeps): string => {
	if (startsInMin < MIN_IN_HOUR)
		return tMinutes(sportLabel, Math.max(0, startsInMin))
	const startDate = new Date(startAtIso)
	const now = new Date()
	const isTomorrow = startDate.getDate() !== now.getDate()
	if (isTomorrow) return tTomorrow(sportLabel, formatWallClock(startDate))
	const hours = Math.round(startsInMin / MIN_IN_HOUR)
	return tHours(sportLabel, hours)
}

interface RowProps {
	href: string
	borderClass: string
	iconBgClass: string
	icon: string
	photo?: string | null
	title: string
	badge: string
	badgeClass: string
	subtitle: ReactNode
}

const FeedRow = ({
	href,
	borderClass,
	iconBgClass,
	icon,
	photo,
	title,
	badge,
	badgeClass,
	subtitle,
}: RowProps) => (
	<Link
		href={href}
		className={`bg-card hover:bg-accent/30 flex items-center gap-4 rounded-lg border-l-4 border-r-4 ${borderClass} p-4 shadow-sm transition-colors hover:shadow`}
	>
		{photo ? (
			<img
				src={photo}
				alt=""
				loading="lazy"
				className="h-12 w-12 shrink-0 rounded-lg object-cover"
			/>
		) : (
			<div
				className={`${iconBgClass} flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl`}
			>
				{icon}
			</div>
		)}
		<div className="min-w-0 flex-1">
			<div className="flex items-center gap-2 text-sm font-semibold">
				<span className="truncate">{title}</span>
				<span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
					{badge}
				</span>
			</div>
			<div className="text-muted-foreground text-xs">{subtitle}</div>
		</div>
	</Link>
)

const isString = (value: string | null): value is string => Boolean(value)

const buildSubtitle = (parts: Array<string | null>): string =>
	parts.filter(isString).join(' · ')

const ActivityFeedItem = ({ item }: { item: FeedItem }) => {
	const t = useTranslations('activity.feed')

	const formatMeters = useCallback(
		(meters: number) => t('live.distanceMeters', { meters }),
		[t],
	)
	const formatKm = useCallback(
		(km: string) => t('live.distanceKm', { km }),
		[t],
	)
	const tMinutes = useCallback(
		(sport: string, minutes: number) => t('soon.titleMinutes', { sport, minutes }),
		[t],
	)
	const tHours = useCallback(
		(sport: string, hours: number) => t('soon.titleHours', { sport, hours }),
		[t],
	)
	const tTomorrow = useCallback(
		(sport: string, time: string) => t('soon.titleTomorrow', { sport, time }),
		[t],
	)

	const distanceText = formatDistance(item.distanceMeters, { formatMeters, formatKm })
	const sportCodes = item.playground.sports.map(pickSportCode)
	const emoji = pickEmojiFromCodes(sportCodes)
	const playgroundName = item.playground.name ?? '—'
	const href = buildHref(item.playground.id)

	if (item.type === 'live') {
		const playgroundPhoto = item.playground.photos[0] ?? null
		return (
			<FeedRow
				href={href}
				borderClass="border-red-500"
				iconBgClass="bg-red-500/10 dark:bg-red-500/20"
				icon={emoji}
				photo={playgroundPhoto}
				title={t('live.title', { count: item.activeCount })}
				badge={t('live.badge')}
				badgeClass="bg-red-500/15 text-red-600 dark:text-red-400"
				subtitle={buildSubtitle([playgroundName, distanceText])}
			/>
		)
	}

	if (item.type === 'soon') {
		const playgroundPhoto = item.playground.photos[0] ?? null
		const soonTitle = buildSoonTitle({
			startsInMin: item.startsInMin,
			startAtIso: item.event.startAt,
			sportLabel: item.event.sport.label,
			tMinutes,
			tHours,
			tTomorrow,
		})
		const sportPill = (
			<span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
				<span>{pickSportEmoji(item.event.sport.code)}</span>
				<span>{item.event.sport.label}</span>
			</span>
		)
		const soonSubtitle = (
			<span className="flex flex-wrap items-center gap-2">
				{sportPill}
				<span>{playgroundName}</span>
				{distanceText ? <span>· {distanceText}</span> : null}
			</span>
		)
		return (
			<FeedRow
				href={href}
				borderClass="border-amber-500"
				iconBgClass="bg-amber-500/10 dark:bg-amber-500/20"
				icon="📅"
				photo={playgroundPhoto}
				title={soonTitle}
				badge={t('soon.badge')}
				badgeClass="bg-amber-500/15 text-amber-700 dark:text-amber-300"
				subtitle={soonSubtitle}
			/>
		)
	}

	const playgroundPhoto = item.playground.photos[0] ?? null
	return (
		<FeedRow
			href={href}
			borderClass="border-sky-500"
			iconBgClass="bg-sky-500/10 dark:bg-sky-500/20"
			icon="🔥"
			photo={playgroundPhoto}
			title={playgroundName}
			badge={t('top.badge')}
			badgeClass="bg-sky-500/15 text-sky-600 dark:text-sky-300"
			subtitle={buildSubtitle([formatRating(item.playground.rating.average), distanceText])}
		/>
	)
}

export { ActivityFeedItem }
