'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useActivityData } from '@/hooks/use-activity-data'
// ActivityMapPanel intentionally not imported — v2 redesign removes the map.
// Keep the file around so it can be brought back later if needed.
import { ActivityHeroBanner } from '@/components/activity/ActivityHeroBanner'
import { SportFilterDropdown } from '@/components/activity/SportFilterDropdown'
import { ActivitySectionedFeed } from '@/components/activity/ActivitySectionedFeed'
import { ActivityFeedSkeleton } from '@/components/activity/ActivityFeedSkeleton'
import {
	distanceMeters,
	playgroundsToFeedItems,
	sortFeedItems,
	filterBySport,
} from '@/components/activity/activity-feed-utils'
import type { FeedItem } from '@/components/activity/activity-types'
import type { Playground, PlaygroundEvent } from '@/services'

interface UserPosition {
	lat: number
	lng: number
}

const minutesUntil = (iso: string, now: number): number =>
	Math.round((new Date(iso).getTime() - now) / 60_000)

const playgroundDistance = (
	playground: Playground,
	user: UserPosition,
): number | null => {
	if (typeof playground.lat !== 'number' || typeof playground.lng !== 'number')
		return null
	return Math.round(distanceMeters(user.lat, user.lng, playground.lat, playground.lng))
}

const toIndexEntry = (playground: Playground): [string, Playground] => [
	playground.id,
	playground,
]

const indexById = (playgrounds: Playground[]): Map<string, Playground> =>
	new Map(playgrounds.map(toIndexEntry))

const buildSoonItem = (
	event: PlaygroundEvent,
	playground: Playground,
	user: UserPosition,
	now: number,
): FeedItem => ({
	type: 'soon',
	playground,
	event,
	startsInMin: Math.max(0, minutesUntil(event.startAt, now)),
	distanceMeters: playgroundDistance(playground, user),
})

const buildSoonItems = (
	events: PlaygroundEvent[],
	playgrounds: Playground[],
	user: UserPosition,
): FeedItem[] => {
	const byId = indexById(playgrounds)
	const now = Date.now()
	const toSoonItem = (event: PlaygroundEvent): FeedItem[] => {
		const playground = byId.get(event.playgroundId)
		if (!playground) return []
		return [buildSoonItem(event, playground, user, now)]
	}
	return events.flatMap(toSoonItem)
}

const ActivityPage = () => {
	const geo = useGeolocation()
	const searchParams = useSearchParams()
	const sportCode = searchParams.get('sport')

	const handleRequestGeo = useCallback(() => {
		geo.retry()
	}, [geo])

	const isGlobalMode = geo.status !== 'granted'

	const { data, status, refetch } = useActivityData({
		lat: geo.lat,
		lng: geo.lng,
		sportCode,
		mode: isGlobalMode ? 'global' : 'local',
	})

	const tError = useTranslations('activity.error')
	const tGeo = useTranslations('activity.geo')
	const prevAttemptRef = useRef(0)

	useEffect(() => {
		if (geo.attemptCount <= prevAttemptRef.current) return
		prevAttemptRef.current = geo.attemptCount
		if (geo.attemptCount <= 1) return
		if (geo.status !== 'denied') return
		toast.warning(tGeo('blockedTitle'), {
			description: tGeo('blockedHint'),
		})
	}, [geo.attemptCount, geo.status, tGeo])

	const handleRetry = useCallback(() => {
		refetch()
	}, [refetch])

	const feedItems: FeedItem[] = useMemo(() => {
		const user: UserPosition = { lat: geo.lat, lng: geo.lng }
		const playgroundItems = playgroundsToFeedItems(data.playgrounds, user)
		const soonItems = buildSoonItems(data.upcomingEvents, data.playgrounds, user)
		const merged = [...playgroundItems, ...soonItems]
		return sortFeedItems(filterBySport(merged, sportCode))
	}, [data.playgrounds, data.upcomingEvents, geo.lat, geo.lng, sportCode])

	const isInitialLoading = status === 'idle' || status === 'loading'
	const hasNoPlaygrounds = data.playgrounds.length === 0
	const shouldShowSkeleton = isInitialLoading && hasNoPlaygrounds

	return (
		<div className="flex h-[calc(100vh-3.5rem)] flex-col">
			{isGlobalMode ? <ActivityHeroBanner onAllow={handleRequestGeo} /> : null}
			<SportFilterDropdown />
			{status === 'error' ? (
				<div className="bg-destructive/10 text-destructive flex items-center justify-between gap-2 border-b px-4 py-2 text-sm">
					<span>{tError('title')}</span>
					<button type="button" className="underline" onClick={handleRetry}>
						{tError('retry')}
					</button>
				</div>
			) : null}
			<div className="flex-1 overflow-y-auto">
				{shouldShowSkeleton ? (
					<ActivityFeedSkeleton />
				) : (
					<ActivitySectionedFeed items={feedItems} />
				)}
			</div>
		</div>
	)
}

export default ActivityPage
