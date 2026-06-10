'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { Playground } from '@/services'
import type { MapPoint, MapPointSport } from '@/lib/overpass'

const SportsMap = dynamic(() => import('@/components/sports-map/SportsMap'), {
	ssr: false,
	loading: () => <div className="bg-muted h-full w-full" />,
})

const toMapPointSport = (sport: { code: string; label: string }): MapPointSport => ({
	code: sport.code,
	label: sport.label,
})

const toMapPointSports = (playground: Playground): MapPointSport[] =>
	playground.sports.map(toMapPointSport)

const pickFirstPhoto = (photos: string[]): string | undefined =>
	photos.length > 0 ? photos[0] : undefined

const hasRating = (playground: Playground): boolean =>
	playground.rating.average !== null && playground.rating.count > 0

const toMapPointRating = (
	playground: Playground,
): { average: number; count: number } | undefined => {
	if (!hasRating(playground)) return undefined
	if (playground.rating.average === null) return undefined
	return { average: playground.rating.average, count: playground.rating.count }
}

const toMapPoint = (playground: Playground): MapPoint | null => {
	if (typeof playground.lat !== 'number' || typeof playground.lng !== 'number') return null
	const sports = toMapPointSports(playground)
	return {
		id: playground.id,
		lat: playground.lat,
		lon: playground.lng,
		name: playground.name ?? undefined,
		sports: sports.length > 0 ? sports : undefined,
		photo: pickFirstPhoto(playground.photos),
		counters: {
			activeCheckIns: playground.counters.activeCheckIns,
			upcomingEvents: playground.counters.upcomingEvents,
		},
		rating: toMapPointRating(playground),
	}
}

const isMapPoint = (value: MapPoint | null): value is MapPoint => value !== null

interface Props {
	playgrounds: Playground[]
	center: [number, number]
}

const ActivityMapPanel = ({ playgrounds, center }: Props) => {
	const points = useMemo(
		() => playgrounds.map(toMapPoint).filter(isMapPoint),
		[playgrounds],
	)
	return (
		<div className="h-[40vh] w-full md:h-[50vh]">
			<SportsMap points={points} center={center} zoom={13} />
		</div>
	)
}

export { ActivityMapPanel }
