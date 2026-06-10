'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
	playgroundApi,
	eventApi,
	type Playground,
	type PlaygroundEvent,
} from '@/services'

const POLL_INTERVAL_MS = 60_000
const BBOX_RADIUS_DEG = 0.05
const EVENT_FETCH_LIMIT = 8
const COORD_PRECISION = 6

interface ActivityData {
	playgrounds: Playground[]
	upcomingEvents: PlaygroundEvent[]
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

const emptyData: ActivityData = { playgrounds: [], upcomingEvents: [] }

const formatCoord = (n: number): string => n.toFixed(COORD_PRECISION)

const buildBbox = (lat: number, lng: number): string => {
	const swLng = lng - BBOX_RADIUS_DEG
	const swLat = lat - BBOX_RADIUS_DEG
	const neLng = lng + BBOX_RADIUS_DEG
	const neLat = lat + BBOX_RADIUS_DEG
	return [swLng, swLat, neLng, neLat].map(formatCoord).join(',')
}

const hasUpcomingEvents = (playground: Playground): boolean =>
	playground.counters.upcomingEvents > 0

const getPlaygroundId = (playground: Playground): string => playground.id

const fetchUpcomingForPlayground = async (
	playgroundId: string,
): Promise<PlaygroundEvent[]> => {
	const response = await eventApi.listByPlayground({
		pathParams: { playgroundId },
		queryParams: { time: 'upcoming' },
		silent: true,
	})
	return response.items
}

const extractFulfilled = (
	settled: PromiseSettledResult<PlaygroundEvent[]>,
): PlaygroundEvent[] => (settled.status === 'fulfilled' ? settled.value : [])

const pickPlaygroundsWithUpcoming = (playgrounds: Playground[]): Playground[] =>
	playgrounds.filter(hasUpcomingEvents).slice(0, EVENT_FETCH_LIMIT)

const fetchEventsForPlaygrounds = async (
	playgrounds: Playground[],
): Promise<PlaygroundEvent[]> => {
	const targets = pickPlaygroundsWithUpcoming(playgrounds)
	if (targets.length === 0) return []
	const ids = targets.map(getPlaygroundId)
	const lists = await Promise.allSettled(ids.map(fetchUpcomingForPlayground))
	return lists.flatMap(extractFulfilled)
}

const fetchPlaygroundsLocal = async (
	lat: number,
	lng: number,
	sportCode: string | null,
): Promise<Playground[]> => {
	const response = await playgroundApi.listByBbox({
		queryParams: { bbox: buildBbox(lat, lng), sports: sportCode ?? undefined },
		silent: true,
	})
	return response.items
}

const fetchPlaygroundsGlobal = async (
	sportCode: string | null,
): Promise<Playground[]> => {
	const response = await playgroundApi.listByBbox({
		queryParams: { sports: sportCode ?? undefined },
		silent: true,
	})
	return response.items
}

const advanceFromIdle = (prev: FetchStatus): FetchStatus =>
	prev === 'idle' ? 'loading' : prev

interface UseActivityDataParams {
	lat: number
	lng: number
	sportCode: string | null
	mode?: 'local' | 'global'
}

const useActivityData = ({
	lat,
	lng,
	sportCode,
	mode = 'local',
}: UseActivityDataParams) => {
	const [data, setData] = useState<ActivityData>(emptyData)
	const [status, setStatus] = useState<FetchStatus>('idle')
	const requestIdRef = useRef(0)

	const load = useCallback(async () => {
		const requestId = requestIdRef.current + 1
		requestIdRef.current = requestId
		setStatus(advanceFromIdle)
		try {
			const playgrounds =
				mode === 'global'
					? await fetchPlaygroundsGlobal(sportCode)
					: await fetchPlaygroundsLocal(lat, lng, sportCode)
			const upcomingEvents = await fetchEventsForPlaygrounds(playgrounds)
			if (requestIdRef.current !== requestId) return
			setData({ playgrounds, upcomingEvents })
			setStatus('success')
		} catch {
			if (requestIdRef.current !== requestId) return
			setStatus('error')
		}
	}, [lat, lng, sportCode, mode])

	useEffect(() => {
		const initialTimeoutId = setTimeout(load, 0)
		const intervalId = setInterval(load, POLL_INTERVAL_MS)
		return () => {
			clearTimeout(initialTimeoutId)
			clearInterval(intervalId)
		}
	}, [load])

	return { data, status, refetch: load }
}

export { useActivityData }
export type { ActivityData, FetchStatus, UseActivityDataParams }
